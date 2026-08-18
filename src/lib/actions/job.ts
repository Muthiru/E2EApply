"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAiProvider } from "@/lib/ai";
import { extractJson } from "@/lib/cv/sanitize";
import { aiErrorText } from "@/lib/ai/parse";
import { getApplicationContext } from "@/lib/job/context";
import { fetchJobPageText, isLinkedInSearchUrl, normalizeUrl } from "@/lib/job/fetch";
import type { ApplicationStatus } from "@prisma/client";
import {
  JOB_RULES,
  JOB_SCHEMA_DESCRIPTION,
  sanitizeJobFromAi,
} from "@/lib/job/extract";
import {
  isCvTemplateId,
  isClTemplateId,
  type ClTemplateId,
  type CvTemplateId,
} from "@/lib/job/templates";
import {
  buildCvKeywordCoverage,
  type CvAlignmentCheck,
} from "@/lib/job/cvAlignment";
import {
  SCORE_RULES,
  SCORE_SCHEMA_DESCRIPTION,
  sanitizeScoreFromAi,
  type JobMatchDetails,
} from "@/lib/job/score";
import {
  COVER_LETTER_RULES,
  COVER_LETTER_SCHEMA_DESCRIPTION,
  CV_RULES,
  CV_SCHEMA_DESCRIPTION,
  sanitizeCoverLetterFromAi,
  sanitizeCvFromAi,
} from "@/lib/job/documents";

export type AddJobResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string };

export async function addJobFromText(
  rawText: string,
  sourceUrl?: string,
): Promise<AddJobResult> {
  const { userId } = await auth.protect();

  let text = rawText.trim();
  const effectiveUrl = sourceUrl ? normalizeUrl(sourceUrl) : null;

  if (text.length < 80) {
    if (!effectiveUrl) {
      return {
        ok: false,
        error:
          "Paste the full job description (at least a few sentences) or provide the posting URL.",
      };
    }
    if (isLinkedInSearchUrl(effectiveUrl)) {
      return {
        ok: false,
        error:
          "LinkedIn job pages need a browser (they render behind a login) — open the job and paste its description text instead.",
      };
    }
    try {
      text = await fetchJobPageText(effectiveUrl);
    } catch (error) {
      return {
        ok: false,
        error:
          aiErrorText(
            error,
            "Couldn't fetch the job from that URL — paste the description text instead.",
          ),
      };
    }
  }

  const ai = getAiProvider();
  let raw: string;
  try {
    raw = await ai.complete(
      [
        {
          role: "system",
          content: `${JOB_SCHEMA_DESCRIPTION}\n\n${JOB_RULES}`,
        },
        {
          role: "user",
          content: `Job posting text:\n${text.slice(0, 40_000)}${effectiveUrl ? `\n\nSource URL: ${effectiveUrl}` : ""}`,
        },
      ],
      { jsonMode: true, temperature: 0.1 },
    );
  } catch (error) {
    return {
      ok: false,
      error:
        aiErrorText(error, "Job analysis failed — retry."),
    };
  }

  const parsed = extractJson(raw);
  const job = parsed === null ? null : sanitizeJobFromAi(parsed);

  if (!job) {
    console.error("[add-job] malformed AI JSON:", raw.slice(0, 300));
    return {
      ok: false,
      error: effectiveUrl
        ? "The page didn't contain a readable job posting (many sites — LinkedIn, Workday — render jobs in a browser). Open the posting and paste its description text instead."
        : "Couldn't read the job from the pasted text. Make sure it's a complete job description.",
    };
  }

  const existing = await prisma.application.findFirst({
    where: {
      user: { clerkId: userId },
      job: {
        title: job.title,
        company: job.company ?? undefined,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "This job is already in your tracker." };
  }

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

export type ScoreJobResult =
  | { ok: true; matchPercent: number }
  | { ok: false; error: string };

export async function scoreApplication(
  applicationId: string,
): Promise<ScoreJobResult> {
  const context = await getApplicationContext(applicationId);

  if (!context) {
    return {
      ok: false,
      error: "Build your profile first — the match score compares it against this job.",
    };
  }

  const { job, profileText, jobText } = context;

  const ai = getAiProvider();
  let raw: string;
  try {
    raw = await ai.complete(
      [
        {
          role: "system",
          content: `${SCORE_SCHEMA_DESCRIPTION}\n\n${SCORE_RULES}`,
        },
        {
          role: "user",
          content: `CANDIDATE PROFILE:\n${profileText}\n\nJOB POSTING:\n${jobText}`,
        },
      ],
      { jsonMode: true, temperature: 0.1 },
    );
  } catch (error) {
    return {
      ok: false,
      error: aiErrorText(error, "Scoring failed — retry."),
    };
  }

  const parsed = extractJson(raw);
  const score = parsed === null ? null : sanitizeScoreFromAi(parsed);

  if (!score) {
    console.error("[score-job] malformed AI JSON:", raw.slice(0, 300));
    return { ok: false, error: "Scoring failed — please retry." };
  }

  const details: JobMatchDetails = {
    matchedSkills: score.matchedSkills,
    missingSkills: score.missingSkills,
    recommendation: score.recommendation,
  };

  await prisma.job.update({
    where: { id: job.id },
    data: {
      matchScore: score.matchPercent,
      matchReasoning: score.reasoning,
      matchDetails: details,
    },
  });

  await prisma.application.update({
    where: { id: applicationId },
    data: { matchScoreAtApplication: score.matchPercent },
  });

  return { ok: true, matchPercent: score.matchPercent };
}

export type GenerateDocumentsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function generateApplicationDocuments(
  applicationId: string,
): Promise<GenerateDocumentsResult> {
  const context = await getApplicationContext(applicationId);

  if (!context) {
    return { ok: false, error: "A saved profile is required to generate documents." };
  }

  const { profileText, jobText } = context;
  const ai = getAiProvider();
  const common = {
    jsonMode: true,
    temperature: 0.4,
  } as const;

  const [cvRaw, clRaw] = await Promise.all([
    ai
      .complete(
        [
          {
            role: "system",
            content: `${CV_SCHEMA_DESCRIPTION}\n\n${CV_RULES}`,
          },
          {
            role: "user",
            content: `CANDIDATE PROFILE:\n${profileText}\n\nTARGET JOB POSTING:\n${jobText}`,
          },
        ],
        common,
      )
      .catch((error) => ({
        __error: aiErrorText(error, "CV generation failed — retry."),
      })),
    ai
      .complete(
        [
          {
            role: "system",
            content: `${COVER_LETTER_SCHEMA_DESCRIPTION}\n\n${COVER_LETTER_RULES}`,
          },
          {
            role: "user",
            content: `Today's date: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}\n\nCANDIDATE PROFILE:\n${profileText}\n\nTARGET JOB POSTING:\n${jobText}`,
          },
        ],
        common,
      )
      .catch((error) => ({
        __error: aiErrorText(error, "Cover letter generation failed — retry."),
      })),
  ]);

  const cvText = sanitizeCvFromAi(cvRaw);
  const clText = sanitizeCoverLetterFromAi(clRaw);

  if (!cvText || !clText) {
    const missing = [
      !cvText ? "CV" : null,
      !clText ? "cover letter" : null,
    ].filter(Boolean);
    return {
      ok: false,
      error: `Document generation missed the ${missing.join(" and ")} — please retry.`,
    };
  }

  const cvDocument = await upsertDocument(applicationId, "CV", cvText);
  await upsertDocument(applicationId, "COVER_LETTER", clText);

  await scoreCvKeywordCoverage({
    documentId: cvDocument.id,
    cvContent: cvText,
    jobText,
    profileText,
  }).catch((error) => {
    console.warn("[cv-alignment] post-generation check failed:", error);
  });

  return { ok: true };
}

async function upsertDocument(
  applicationId: string,
  type: "CV" | "COVER_LETTER",
  content: string,
): Promise<{ id: string; version: number }> {
  const latest = await prisma.document.findFirst({
    where: { applicationId, type },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return prisma.document.create({
    data: {
      applicationId,
      type,
      version: (latest?.version ?? 0) + 1,
      content,
      isFinal: false,
    },
    select: { id: true, version: true },
  });
}

export type SaveDocumentResult = { ok: true } | { ok: false; error: string };

export async function saveFinalDocument(
  applicationId: string,
  type: "CV" | "COVER_LETTER",
  content: string,
): Promise<SaveDocumentResult> {
  const { userId } = await auth.protect();

  const trimmed = content.trim();
  if (trimmed.length < 50) {
    return { ok: false, error: "Document is too short to save." };
  }
  const maxLength = type === "CV" ? 12_000 : 4_000;
  if (trimmed.length > maxLength) {
    return { ok: false, error: "Document is too long to save." };
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, user: { clerkId: userId } },
    select: { id: true },
  });
  if (!application) {
    return { ok: false, error: "Application not found." };
  }

  const latest = await prisma.document.findFirst({
    where: { applicationId, type },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  await prisma.$transaction([
    prisma.document.updateMany({
      where: { applicationId, type, isFinal: true },
      data: { isFinal: false },
    }),
    prisma.document.create({
      data: {
        applicationId,
        type,
        version: (latest?.version ?? 0) + 1,
        content: trimmed,
        isFinal: true,
      },
    }),
  ]);

  return { ok: true };
}

export type SetCvTemplateResult = { ok: true } | { ok: false; error: string };

async function updateOwnedApplicationTemplate(
  applicationId: string,
  data: { cvTemplate: CvTemplateId } | { clTemplate: ClTemplateId },
): Promise<SetCvTemplateResult> {
  const { userId } = await auth.protect();
  const application = await prisma.application.findFirst({
    where: { id: applicationId, user: { clerkId: userId } },
    select: { id: true },
  });
  if (!application) return { ok: false, error: "Application not found." };

  await prisma.application.update({
    where: { id: applicationId },
    data,
  });

  return { ok: true };
}

export async function setApplicationCvTemplate(
  applicationId: string,
  templateId: string,
): Promise<SetCvTemplateResult> {
  if (!isCvTemplateId(templateId)) {
    return { ok: false, error: "Unknown template." };
  }
  const template: CvTemplateId = templateId;

  return updateOwnedApplicationTemplate(applicationId, { cvTemplate: template });
}

export type SetClTemplateResult = { ok: true } | { ok: false; error: string };

export async function setApplicationClTemplate(
  applicationId: string,
  templateId: string,
): Promise<SetClTemplateResult> {
  if (!isClTemplateId(templateId)) {
    return { ok: false, error: "Unknown template." };
  }
  const template: ClTemplateId = templateId;

  return updateOwnedApplicationTemplate(applicationId, { clTemplate: template });
}

export type CheckCvAlignmentResult =
  | { ok: true; result: CvAlignmentCheck }
  | { ok: false; error: string };

async function scoreCvKeywordCoverage({
  documentId,
  cvContent,
  jobText,
  profileText,
}: {
  documentId: string;
  cvContent: string;
  jobText: string;
  profileText: string;
}): Promise<CvAlignmentCheck> {
  const result = buildCvKeywordCoverage({ jobText, cvContent, profileText });
  if (!result) {
    throw new Error("No job keywords were detected for alignment scoring.");
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      alignmentScore: result.score,
      alignmentDetails: result,
    },
  });

  return result;
}

export async function checkCvKeywordCoverage(
  applicationId: string,
): Promise<CheckCvAlignmentResult> {
  const context = await getApplicationContext(applicationId);

  if (!context) {
    return { ok: false, error: "A saved profile is required to check alignment." };
  }

  const latestCv = await prisma.document.findFirst({
    where: { applicationId, type: "CV" },
    orderBy: [{ isFinal: "desc" }, { version: "desc" }],
    select: { id: true, content: true },
  });
  if (!latestCv?.content) {
    return { ok: false, error: "Generate the CV first, then check alignment." };
  }

  try {
    const result = await scoreCvKeywordCoverage({
      documentId: latestCv.id,
      cvContent: latestCv.content,
      jobText: context.jobText,
      profileText: context.profileText,
    });
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: aiErrorText(error, "Alignment check failed — retry."),
    };
  }
}

const MANUAL_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
];

export type UpdateStatusResult = { ok: true } | { ok: false; error: string };

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  note?: string,
): Promise<UpdateStatusResult> {
  if (!MANUAL_STATUSES.includes(status as ApplicationStatus)) {
    return { ok: false, error: "Invalid status." };
  }
  const nextStatus = status as ApplicationStatus;

  const { userId } = await auth.protect();
  const application = await prisma.application.findFirst({
    where: { id: applicationId, user: { clerkId: userId } },
    select: { id: true, status: true },
  });
  if (!application) return { ok: false, error: "Application not found." };
  if (application.status === nextStatus) return { ok: true };

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status: nextStatus },
    }),
    prisma.statusEvent.create({
      data: {
        applicationId,
        from: application.status,
        to: nextStatus,
        source: "MANUAL",
        note: note?.trim() || null,
      },
    }),
  ]);

  return { ok: true };
}
export type DeleteApplicationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteApplication(
  applicationId: string,
): Promise<DeleteApplicationResult> {
  const { userId } = await auth.protect();

  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.findFirst({
      where: { id: applicationId, user: { clerkId: userId } },
      select: { jobId: true },
    });
    if (!application) return "not-found" as const;

    await tx.application.delete({ where: { id: applicationId } });

    const remaining = await tx.application.count({
      where: { jobId: application.jobId },
    });
    if (remaining === 0) {
      await tx.job.delete({ where: { id: application.jobId } });
    }
    return "ok" as const;
  });

  if (result === "not-found") {
    return { ok: false, error: "Application not found." };
  }
  return { ok: true };
}
