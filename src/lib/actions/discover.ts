"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { aiErrorText } from "@/lib/ai/parse";
import {
  agentReachSearch,
  estimateMatch,
  filterTrackedCandidates,
  type ChannelReport,
  type DiscoverCandidate,
} from "@/lib/job/discover";

export type SearchJobsResult =
  | {
    ok: true;
    candidates: DiscoverCandidate[];
    channels: ChannelReport[];
    usedFallback: boolean;
  }
  | { ok: false; error: string };

export async function searchJobCandidatesAction(
  query: string,
): Promise<SearchJobsResult> {
  const { userId } = await auth.protect();

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Enter a query — role, skills, or location." };
  }

  try {
    const [profile, trackedJobs] = await Promise.all([
      prisma.profile.findFirst({
        where: { user: { clerkId: userId } },
        include: { skills: true },
      }),
      prisma.job.findMany({
        where: {
          applications: { some: { user: { clerkId: userId } } },
        },
        select: { sourceUrl: true, company: true, title: true },
      }),
    ]);

    const skillNames = profile?.skills.map((skill) => skill.name) ?? [];

    const { candidates, channels } = await agentReachSearch(trimmed, 10);

    const filtered = filterTrackedCandidates(candidates, trackedJobs);

    const finalCandidates = filtered.map((candidate) => ({
      ...candidate,
      ...estimateMatch(candidate, skillNames, trimmed),
    }));

    return {
      ok: true,
      candidates: finalCandidates,
      channels,
      usedFallback: channels.some((channel) => channel.channel === "jina"),
    };
  } catch (error) {
    return {
      ok: false,
      error: aiErrorText(error, "Search failed — try again in a moment."),
    };
  }
}

export type DiscoveryPrefill = {
  query: string | null;
  location: string | null;
  workModel: "any" | "Remote" | "Onsite" | "Hybrid";
};

export async function getDiscoveryPrefill(): Promise<DiscoveryPrefill> {
  const { userId } = await auth.protect();

  const profile = await prisma.profile.findFirst({
    where: { user: { clerkId: userId } },
    include: { skills: true, preferences: true },
  });

  if (!profile) return { query: null, location: null, workModel: "any" };

  const roles = (profile.preferences?.preferredRoles ?? []).filter(Boolean);
  const skills = profile.skills.slice(0, 5).map((skill) => skill.name);
  const parts = [...roles, ...skills];

  if (parts.length === 0 && profile.title) parts.push(profile.title);

  const locations = profile.preferences?.locations ?? [];
  const location = locations.length > 0 ? locations[0] : null;
  const workModel = profile.preferences?.remoteOnly ? "Remote" as const : "any" as const;

  return {
    query: parts.length > 0 ? parts.join(" ") : null,
    location,
    workModel,
  };
}