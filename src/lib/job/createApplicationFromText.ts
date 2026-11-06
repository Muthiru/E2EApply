import { prisma } from "@/lib/prisma";
import { getAiProvider } from "@/lib/ai";
import { extractJson } from "@/lib/cv/sanitize";
import { aiErrorText } from "@/lib/ai/parse";
import { fetchJobPageText, isLinkedInSearchUrl, normalizeUrl } from "@/lib/job/fetch";
import {
  hasJobPostingEvidence,
  JOB_RULES,
  JOB_SCHEMA_DESCRIPTION,
  sanitizeJobFromAi,
} from "@/lib/job/extract";

export type AddJobResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string };

export async function createApplicationFromJobText(
  userId: string,
  rawText: string,
  sourceUrl?: string,
): Promise<AddJobResult> {
  let text = rawText.trim();
  const effectiveUrl = sourceUrl ? normalizeUrl(sourceUrl) : null;

  if (text.length < 80) {
    if (!effectiveUrl) {
      return { ok: false, error: "Paste the full job description (at least a few sentences) or provide the posting URL." };
    }
    if (isLinkedInSearchUrl(effectiveUrl)) {
      return { ok: false, error: "LinkedIn job pages need a browser (they render behind a login) — open the job and paste the description text instead." };
    }
    try {
      text = await fetchJobPageText(effectiveUrl);
    } catch (error) {
      return { ok: false, error: aiErrorText(error, "Couldn't fetch the job from that URL — paste the description text instead.") };
    }
    if (!hasJobPostingEvidence(text)) {
      return { ok: false, error: "That URL does not appear to contain a job posting. Open a specific job listing or paste the job description instead." };
    }
  }

  const ai = getAiProvider();
  let raw: string;
  try {
    raw = await ai.complete(
      [
        { role: "system", content: `${JOB_SCHEMA_DESCRIPTION}\n\n${JOB_RULES}` },
        {
          role: "user",
          content: `Job posting text:\n${text.slice(0, 40_000)}${effectiveUrl ? "\n\nSource URL: " + effectiveUrl : ""}`,
        },
      ],
      { jsonMode: true, temperature: 0.1 },
    );
  } catch (error) {
    return { ok: false, error: aiErrorText(error, "Job analysis failed — retry.") };
  }

  const parsed = extractJson(raw);
  const job = parsed === null ? null : sanitizeJobFromAi(parsed);
  if (!job) {
    console.error("[add-job] malformed AI JSON:", raw.slice(0, 300));
    return {
      ok: false,
      error: effectiveUrl
        ? "The page didn't contain a readable job posting (many sites — LinkedIn, Workday — render jobs in a browser). Open the posting and paste the description instead."
        : "Couldn't read the job from the pasted text. Make sure it's a complete job description.",
    };
  }
  if (!job.description && !job.requirements) {
    return { ok: false, error: "The content did not contain enough job details to create a posting." };
  }

  const existing = await prisma.application.findFirst({
    where: {
      user: { clerkId: userId },
      job: { title: job.title, company: job.company ?? undefined },
    },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "This job is already in your tracker." };

  const application = await prisma.application.create({
    data: {
      user: { connect: { clerkId: userId } },
      job: {
        create: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          requirements: job.requirements,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          sourceUrl: job.sourceUrl ?? effectiveUrl ?? null,
          source: "manual",
          rawText: text,
        },
      },
    },
  });

  return { ok: true, applicationId: application.id };
}
