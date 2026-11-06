"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fetchJobPageText } from "@/lib/job/fetch";
import { hasJobPostingEvidence } from "@/lib/job/extract";
import { buildCandidateProfileText, PROFILE_INCLUDE } from "@/lib/job/context";
import {
  agentReachSearch,
  dedupeCandidates,
  type DiscoverCandidate,
  estimateMatch,
  filterTrackedCandidates,
} from "@/lib/job/discover";
import { extractCvQualifications } from "@/lib/job/cvQualifications";
import { screenDailyHuntCandidate } from "@/lib/job/dailyHunt";
import { scoreProfileAgainstJob, type JobMatchScore } from "@/lib/job/score";

function uniqueTerms(terms: string[]): string[] {
  return [...new Map(terms.map((term) => [term.trim().toLowerCase(), term.trim()])).values()]
    .filter(Boolean);
}

function normalizeJobIdentity(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const CLOSED_POSTING_SIGNALS = /\b(?:no longer accepting applications|job (?:is )?(?:closed|no longer available)|position (?:is )?(?:closed|filled)|applications? (?:are )?closed|posting has expired|job has expired|role has been filled|this vacancy is closed)\b/i;
const RESTRICTED_ATS_HOSTS = [
  "greenhouse.io",
  "lever.co",
  "workday.com",
  "myworkdayjobs.com",
  "workable.com",
  "ashbyhq.com",
  "smartrecruiters.com",
];
const MAX_POST_AGE_MS = 10 * 24 * 60 * 60 * 1000;

type HuntAssessment = {
  candidate: DiscoverCandidate;
  score: JobMatchScore | null;
  postingText: string | null;
  scoreSource: "full" | "excerpt" | null;
  closed: boolean;
};

function makeAssessment(
  candidate: DiscoverCandidate,
  estimate: ReturnType<typeof estimateMatch>,
  overrides: Partial<Omit<HuntAssessment, "candidate">> = {},
): HuntAssessment {
  return {
    candidate: { ...candidate, ...estimate },
    score: null,
    postingText: null,
    scoreSource: null,
    closed: false,
    ...overrides,
  };
}

function isRestrictedAtsPosting(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return RESTRICTED_ATS_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function isFreshDailyHuntCandidate(candidate: { publishedAt?: string | null; snippet: string | null }): boolean {
  const dateText = candidate.publishedAt?.trim() || candidate.snippet?.trim() || "";
  if (!dateText) return false;

  if (/\b(?:today|just posted|newly posted)\b/i.test(dateText)) return true;
  if (/\byesterday\b/i.test(dateText)) return true;

  const relativeAge = /\b(\d+)\s+(hour|day|week)s?\s+ago\b/i.exec(dateText);
  if (relativeAge) {
    const amount = Number.parseInt(relativeAge[1], 10);
    const unit = relativeAge[2].toLowerCase();
    const ageMs = amount * (unit === "hour" ? 60 * 60 * 1000 : unit === "day" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000);
    return ageMs <= MAX_POST_AGE_MS;
  }

  const timestamp = Date.parse(dateText);
  const now = Date.now();
  return Number.isFinite(timestamp) &&
    timestamp <= now + 24 * 60 * 60 * 1000 &&
    timestamp >= now - MAX_POST_AGE_MS;
}

function isClosedPosting(text: string | null | undefined): boolean {
  return Boolean(text && CLOSED_POSTING_SIGNALS.test(text));
}

export async function createDailyHuntBatch(): Promise<void> {
  const { userId } = await auth.protect();

  await prisma.dailyHuntBatch.create({
    data: {
      user: { connect: { clerkId: userId } },
      targetCount: 10,
    },
  });

  revalidatePath("/dashboard/daily-hunt");
}

export async function saveDailyHuntMasterCv(
  batchId: string,
  formData: FormData,
): Promise<void> {
  const { userId } = await auth.protect();
  const batch = await prisma.dailyHuntBatch.findFirst({
    where: { id: batchId, user: { clerkId: userId } },
    select: { id: true, masterCvId: true },
  });

  if (!batch) redirect("/dashboard/daily-hunt?error=batch");

  const submittedMasterCvId = formData.get("masterCvId");
  const masterCvId = typeof submittedMasterCvId === "string" ? submittedMasterCvId.trim() : "";

  if (masterCvId) {
    const ownedMasterCv = await prisma.masterCv.findFirst({
      where: {
        id: masterCvId,
        profile: { user: { clerkId: userId } },
      },
      select: { id: true },
    });
    if (!ownedMasterCv) redirect("/dashboard/daily-hunt?error=mastercv");
  }

  const nextMasterCvId = masterCvId || null;
  if (batch.masterCvId !== nextMasterCvId) {
    await prisma.$transaction([
      prisma.dailyHuntBatchItem.deleteMany({ where: { batchId: batch.id } }),
      prisma.dailyHuntBatch.update({
        where: { id: batch.id },
        data: {
          masterCvId: nextMasterCvId,
          status: "DRAFT",
          searchQuery: null,
          searchedAt: null,
          searchWarnings: [],
        },
      }),
    ]);
  }

  revalidatePath("/dashboard/daily-hunt");
  redirect("/dashboard/daily-hunt?mastercv=saved");
}

export async function trackDailyHuntItem(
  batchId: string,
  itemId: string,
): Promise<void> {
  const { userId } = await auth.protect();
  let applicationId: string | null;
  try {
    applicationId = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "DailyHuntBatchItem" WHERE "id" = ${itemId} FOR UPDATE`;
      const item = await tx.dailyHuntBatchItem.findFirst({
        where: {
          id: itemId,
          batchId,
          batch: { user: { clerkId: userId } },
        },
        select: {
          id: true,
          applicationId: true,
          url: true,
          title: true,
          company: true,
          snippet: true,
        },
      });
      if (!item) return null;
      if (item.applicationId) return item.applicationId;

      // Serialize the same user's attempts to track a posting across batches too.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${item.url}))`;
      const identityKey = `${normalizeJobIdentity(item.title)}::${normalizeJobIdentity(item.company ?? "")}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${identityKey}))`;
      let application = await tx.application.findFirst({
        where: { user: { clerkId: userId }, job: { sourceUrl: item.url } },
        select: { id: true },
      });
      if (!application) {
        const normalizedMatches = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT application."id"
          FROM "Application" AS application
          JOIN "User" AS app_user ON app_user."id" = application."userId"
          JOIN "Job" AS job ON job."id" = application."jobId"
          WHERE app_user."clerkId" = ${userId}
            AND lower(regexp_replace(trim(job."title"), '[[:space:]]+', ' ', 'g')) = ${normalizeJobIdentity(item.title)}
            AND lower(regexp_replace(trim(coalesce(job."company", '')), '[[:space:]]+', ' ', 'g')) = ${normalizeJobIdentity(item.company ?? "")}
          LIMIT 1
        `;
        application = normalizedMatches[0] ?? null;
      }
      if (!application) {
        application = await tx.application.create({
          data: {
            user: { connect: { clerkId: userId } },
            job: {
              create: {
                title: item.title,
                company: item.company,
                sourceUrl: item.url,
                description: item.snippet,
                rawText: item.snippet,
                source: "daily-hunt",
              },
            },
          },
          select: { id: true },
        });
      }

      await tx.dailyHuntBatchItem.update({
        where: { id: item.id },
        data: { applicationId: application.id },
      });
      return application.id;
    });
  } catch (error) {
    console.error("[daily-hunt] failed to track job:", error);
    redirect(`/dashboard/daily-hunt?trackError=${encodeURIComponent(itemId)}`);
  }

  if (!applicationId) redirect("/dashboard/daily-hunt?error=batch");

  revalidatePath("/dashboard/daily-hunt");
  revalidatePath("/dashboard/applications");
  redirect(`/dashboard/applications/${applicationId}`);
}

export async function buildDailyHuntBatch(
  batchId: string,
): Promise<void> {
  const { userId } = await auth.protect();
  const batch = await prisma.dailyHuntBatch.findFirst({
    where: { id: batchId, user: { clerkId: userId } },
    include: {
      user: {
        include: {
          profile: {
            include: PROFILE_INCLUDE,
          },
        },
      },
    },
  });

  if (!batch) redirect("/dashboard/daily-hunt?error=batch");
  const profile = batch.user.profile;
  if (!profile) redirect("/dashboard/daily-hunt?error=profile");

  const masterCv = batch.masterCvId
    ? await prisma.masterCv.findFirst({
        where: {
          id: batch.masterCvId,
          profile: { user: { clerkId: userId } },
        },
        select: { id: true, name: true, textContent: true },
      })
    : null;
  const candidateProfileText = masterCv
    ? await buildCandidateProfileText(profile, masterCv)
    : null;
  const cvQualifications = masterCv
    ? await extractCvQualifications(masterCv.textContent)
    : null;

  const targetRoles = (profile.preferences?.preferredRoles ?? []).filter(Boolean);
  const cvRoles = cvQualifications?.roleTitles ?? [];
  const targetCount = batch.targetCount;
  const profileSkills = profile.skills.map((skill) => skill.name);
  const skills = uniqueTerms([...(cvQualifications?.skills ?? []), ...profileSkills]).slice(0, 15);
  if (targetRoles.length === 0 && cvRoles.length === 0 && !profile.title?.trim() && skills.length === 0) {
    redirect("/dashboard/daily-hunt?error=roles");
  }

  const roleTerms = targetRoles.slice(0, 3);
  if (roleTerms.length === 0) roleTerms.push(...cvRoles.slice(0, 3));
  if (roleTerms.length === 0 && profile.title) roleTerms.push(profile.title);
  const searchTerms = uniqueTerms([...roleTerms, ...skills.slice(0, 5)]);
  if (profile.preferences?.remoteOnly) searchTerms.unshift("remote");

  const locations = uniqueTerms([
    ...(profile.preferences?.locations.filter((location) =>
      Boolean(location.trim()) && !/^remote$/i.test(location.trim()),
    ) ?? []),
    ...(cvQualifications?.countries ?? []),
    ...(profile.location?.trim() ? [profile.location.trim()] : []),
  ]).slice(0, 3);
  const searchLocations = locations.length > 0 ? locations.slice(0, 3) : [""];
  const searchLimit = targetCount;
  const queryList = searchLocations.map((location) =>
    [searchTerms.join(" "), location ? `in ${location}` : ""].filter(Boolean).join(" "),
  );

  let searches: Awaited<ReturnType<typeof agentReachSearch>>[];
  try {
    searches = await Promise.all(
      queryList.map((query) => agentReachSearch(query, searchLimit)),
    );
  } catch {
    redirect(`/dashboard/daily-hunt?batch=${encodeURIComponent(batchId)}&error=search`);
  }

  const trackedJobs = await prisma.job.findMany({
    where: { applications: { some: { user: { clerkId: userId } } } },
    select: { sourceUrl: true, company: true, title: true },
  });

  const allCandidates = dedupeCandidates(searches.flatMap((search) => search.candidates));
  const candidatePool = filterTrackedCandidates(allCandidates, trackedJobs)
    .filter(isFreshDailyHuntCandidate)
    .slice(0, searchLimit);
  const primaryLocationCandidateUrls = new Set(
    (searches[0]?.candidates ?? []).map((candidate) => candidate.url),
  );

  const assessments = await Promise.all(candidatePool.map(async (candidate) => {
    const keywordEstimate = estimateMatch(candidate, skills, roleTerms.join(" "));
    if (isClosedPosting(candidate.snippet)) {
      return makeAssessment(candidate, keywordEstimate, { closed: true });
    }
    if (!masterCv) {
      return makeAssessment(candidate, keywordEstimate);
    }

    let jobText: string | null = null;
    let fetchedText: string | null = null;
    let scoreSource: "full" | "excerpt" | null = null;
    if (!isRestrictedAtsPosting(candidate.url)) {
      try {
        fetchedText = await fetchJobPageText(candidate.url);
        if (fetchedText.trim().length >= 300 && hasJobPostingEvidence(fetchedText)) {
          jobText = fetchedText;
          scoreSource = "full";
        }
      } catch {
        // Search result text can still support a cautious score if it contains enough job details.
      }
    }

    if (isClosedPosting(fetchedText)) {
      return makeAssessment(candidate, keywordEstimate, {
        postingText: fetchedText,
        closed: true,
      });
    }

    if (!jobText && candidate.snippet?.trim() &&
      candidate.snippet.trim().length >= 300 &&
      hasJobPostingEvidence(candidate.snippet)) {
      jobText = candidate.snippet;
      scoreSource = "excerpt";
    }

    if (!jobText) {
      return makeAssessment(candidate, keywordEstimate);
    }

    try {
      const result = await scoreProfileAgainstJob(
        candidateProfileText ?? masterCv.textContent,
        jobText,
      );
      if (!result.ok) {
        return makeAssessment(candidate, keywordEstimate, { postingText: jobText });
      }

      return {
        ...makeAssessment(candidate, keywordEstimate, {
          score: result.score,
          postingText: jobText,
          scoreSource,
        }),
        candidate: {
          ...candidate,
          estimatedMatch: result.score.matchPercent,
          matchedSkills: result.score.matchedSkills,
        },
      };
    } catch {
      return makeAssessment(candidate, keywordEstimate, { postingText: jobText });
    }
  }));

  assessments.sort(
    (left, right) => {
      const leftLocationPriority = primaryLocationCandidateUrls.has(left.candidate.url) ? 0 : 1;
      const rightLocationPriority = primaryLocationCandidateUrls.has(right.candidate.url) ? 0 : 1;
      return leftLocationPriority - rightLocationPriority ||
        (right.candidate.estimatedMatch ?? -1) - (left.candidate.estimatedMatch ?? -1);
    },
  );

  const screenPreferences = {
    mustHaveTerms: [],
    dealBreakerTerms: [],
    locations,
    remoteOnly: profile.preferences?.remoteOnly ?? false,
    salaryFloor: profile.preferences?.salaryFloor ?? null,
    minMatchPercent: profile.preferences?.minMatchPercent ?? null,
  };

  const closedPostingCount = assessments.filter((assessment) => assessment.closed).length;
  const results = assessments
    .filter((assessment) => !assessment.closed)
    .map(({ candidate, score, postingText, scoreSource }) => {
      const screeningCandidate = score
        ? candidate
        : { ...candidate, estimatedMatch: null };
      const screening = screenDailyHuntCandidate(
        screeningCandidate,
        screenPreferences,
        score?.recommendation,
        postingText,
      );
      if (screening.status !== "EXCLUDED" && masterCv && !score) {
        screening.status = "REVIEW";
        screening.reasons = screening.reasons.filter(
          (reason) => !reason.startsWith("No configured screening concerns"),
        );
        screening.reasons.push("The full job posting could not be compared with the selected Master CV. Review the posting manually.");
      }
      if (screening.status !== "EXCLUDED" && score && scoreSource === "excerpt") {
        screening.status = "REVIEW";
        screening.reasons = screening.reasons.filter(
          (reason) => !reason.startsWith("No configured screening concerns"),
        );
        screening.reasons.push("The full posting was unavailable; this CV score uses the search excerpt. Review the full posting before deciding.");
      }
      if (screening.status !== "EXCLUDED" && !masterCv) {
        if (screening.status === "MATCHED") {
          screening.reasons = screening.reasons.filter(
            (reason) => !reason.startsWith("No configured screening concerns"),
          );
        }
        screening.status = "REVIEW";
        screening.reasons.push("No CV match score is available. Select a Master CV for qualification-based scoring.");
      }
      if (score) {
        screening.reasons.push(`CV fit: ${score.reasoning}`);
        if (score.missingSkills.length > 0) {
          screening.reasons.push(`Qualifications not evidenced in the selected CV: ${score.missingSkills.join(", ")}`);
        }
      }
      return { candidate, screening, hasCvScore: Boolean(score) };
    });

  const sourceWarnings = searches.flatMap((search) =>
    search.channels.filter((channel) => !channel.ok).map((channel) => `${channel.channel} search was unavailable`),
  );
  const hasSearchFailures = sourceWarnings.length > 0;

  const writes = await Promise.allSettled(
    results.map(({ candidate, screening, hasCvScore }) => {
      const itemData = {
        batchId: batch.id,
        url: candidate.url,
        title: candidate.title,
        company: candidate.company,
        snippet: candidate.snippet,
        publishedAt: candidate.publishedAt ?? null,
        source: candidate.source,
        estimatedMatch: hasCvScore ? candidate.estimatedMatch : null,
        matchedSkills: hasCvScore ? candidate.matchedSkills : [],
        screeningStatus: screening.status,
        screeningReasons: screening.reasons,
      };

      return prisma.dailyHuntBatchItem.upsert({
        where: { batchId_url: { batchId: batch.id, url: candidate.url } },
        create: itemData,
        update: itemData,
      });
    }),
  );

  const hasSaveFailures = writes.some((result) => result.status === "rejected");
  const savedUrls = writes.flatMap((result) =>
    result.status === "fulfilled" ? [result.value.url] : [],
  );
  await prisma.dailyHuntBatchItem.deleteMany({
    where: {
      batchId: batch.id,
      ...(savedUrls.length > 0 ? { url: { notIn: savedUrls } } : {}),
    },
  });

  const saveWarnings = hasSaveFailures
    ? ["Some results could not be saved. Run the search again to retry." ]
    : [];
  const warnings = [...new Set([...sourceWarnings, ...saveWarnings])];
  if (hasSearchFailures) {
    warnings.push("Search was incomplete; only postings refreshed during this search are shown.");
  }
  if (closedPostingCount > 0) {
    warnings.push(`${closedPostingCount} posting${closedPostingCount === 1 ? " was" : "s were"} removed because applications appeared to be closed.`);
  }
  if (candidatePool.length < searchLimit) {
    warnings.push("Only postings dated within the last 10 days were included; postings without a reliable recent date were left out.");
  }
  if (masterCv && assessments.some(({ score }) => !score)) {
    warnings.push("Some job postings could not be read or CV-scored; those results are marked for manual review.");
  }
  if (masterCv && !cvQualifications) {
    warnings.push("CV qualifications could not be extracted for search terms. Search used your Profile skills, but readable postings were still scored against the selected CV.");
  }
  const querySummary = [...new Set(queryList)].join(" · ");

  await prisma.dailyHuntBatch.update({
    where: { id: batch.id },
    data: {
      status: "REVIEWING",
      targetCount,
      searchQuery: querySummary,
      searchedAt: new Date(),
      searchWarnings: warnings,
    },
  });

  revalidatePath("/dashboard/daily-hunt");
  redirect(`/dashboard/daily-hunt?batch=${encodeURIComponent(batchId)}`);
}
