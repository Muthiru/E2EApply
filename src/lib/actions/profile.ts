"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeProfileUrls,
  profileSchema,
  type ProfileInput,
} from "@/lib/validations/profile";

export type SaveProfileResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; errors: Record<string, string[]> };

export async function saveProfile(input: unknown): Promise<SaveProfileResult> {
  const { userId } = await auth.protect();

  const parsed = profileSchema.safeParse(normalizeProfileUrls(input));
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      errors[path] = [...(errors[path] ?? []), issue.message];
    }
    return { ok: false, errors };
  }
  const data = parsed.data as ProfileInput;

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId, profile: { create: {} } },
    update: {},
  });

  const basics = {
    fullName: data.fullName,
    title: data.title,
    summary: data.summary,
    location: data.location,
    phone: data.phone,
    email: data.email,
    website: data.website,
    github: data.github,
    linkedin: data.linkedin,
  };

  const uniqueSkills = Array.from(
    new Map(data.skills.map((s) => [s.name.toLowerCase(), s])).values(),
  );

  try {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...basics },
        update: basics,
      });

      await tx.skill.deleteMany({ where: { profileId: profile.id } });
      await tx.workExperience.deleteMany({ where: { profileId: profile.id } });
      await tx.education.deleteMany({ where: { profileId: profile.id } });
      await tx.project.deleteMany({ where: { profileId: profile.id } });
      await tx.certification.deleteMany({ where: { profileId: profile.id } });

      await tx.skill.createMany({
        data: uniqueSkills.map((s) => ({
          profileId: profile.id,
          name: s.name,
          level: s.level ?? null,
          years: s.years ?? null,
        })),
      });

    await tx.workExperience.createMany({
      data: data.experiences.map((e) => ({
        profileId: profile.id,
        company: e.company,
        title: e.title,
        location: e.location ?? null,
        startDate: e.startDate,
        endDate: e.current ? null : e.endDate,
        current: e.current ?? false,
        description: e.description ?? null,
        highlights: e.highlights ?? [],
      })),
    });

    await tx.education.createMany({
      data: data.educations.map((ed) => {
        const gpa = ed.gpa ? parseFloat(ed.gpa) : null;
        return {
          profileId: profile.id,
          institution: ed.institution,
          degree: ed.degree ?? null,
          field: ed.field ?? null,
          startDate: ed.startDate,
          endDate: ed.endDate,
          gpa: gpa && Number.isFinite(gpa) ? gpa : null,
        };
      }),
    });

    await tx.project.createMany({
      data: data.projects.map((p) => ({
        profileId: profile.id,
        name: p.name,
        description: p.description ?? null,
        url: p.url ?? null,
        technologies: p.technologies ?? [],
        startDate: p.startDate,
        endDate: p.endDate,
      })),
    });

    await tx.certification.createMany({
      data: data.certifications.map((c) => ({
        profileId: profile.id,
        name: c.name,
        issuer: c.issuer ?? null,
        date: c.date,
        url: c.url ?? null,
      })),
    });

    await tx.profilePreferences.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        preferredRoles: data.preferences.preferredRoles,
        locations: data.preferences.locations,
        remoteOnly: data.preferences.remoteOnly ?? false,
        salaryFloor: data.preferences.salaryFloor ?? null,
        minMatchPercent: data.preferences.minMatchPercent ?? null,
      },
      update: {
        preferredRoles: data.preferences.preferredRoles,
        locations: data.preferences.locations,
        remoteOnly: data.preferences.remoteOnly ?? false,
        salaryFloor: data.preferences.salaryFloor ?? null,
        minMatchPercent: data.preferences.minMatchPercent ?? null,
      },
    });
    });
  } catch {
    return {
      ok: false,
      error: "Profile could not be saved. Please try again.",
    };
  }

  return { ok: true };
}
