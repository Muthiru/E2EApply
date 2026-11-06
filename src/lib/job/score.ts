import { aiErrorText, isRecord, str, strArray } from "@/lib/ai/parse";
import { getAiProvider } from "@/lib/ai";
import { extractJson } from "@/lib/cv/sanitize";

export type MatchRecommendation = "apply" | "consider" | "skip";

export type JobMatchDetails = {
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: MatchRecommendation;
};

export type JobMatchScore = {
  matchPercent: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  recommendation: MatchRecommendation;
};

export const SCORE_SCHEMA_DESCRIPTION = `Respond with a single JSON object using ONLY these fields:
{
  "matchPercent": number (0-100, integer),
  "matchedSkills": string[],
  "missingSkills": string[],
  "reasoning": string,
  "recommendation": "apply" | "consider" | "skip"
}`;

export const SCORE_RULES = `Rules:
- Be brutally honest. The goal is to save the candidate time — a low score with clear reasons is the product working.
- "matchPercent": how well the candidate's profile fits THIS job posting, considering stated requirements, seniority, domain, and years of experience.
- "matchedSkills": requirements/skills from the posting the candidate clearly has (use the posting's own naming where possible).
- "missingSkills": important requirements from the posting the candidate lacks or has no evidence of.
- "reasoning": 2-4 plain-language sentences explaining the score, strengths, and gaps.
- "recommendation": "skip" when there are hard blockers (seniority gap, missing domain, missing core requirement) or matchPercent is low; "apply" when it is a strong fit; "consider" in between.
- Never invent skills or experience the profile does not show. If the posting doesn't state something, don't penalize for it.`;

export function sanitizeScoreFromAi(input: unknown): JobMatchScore | null {
  if (!isRecord(input)) return null;

  let matchPercent = typeof input.matchPercent === "number" ? Math.round(input.matchPercent) : NaN;
  if (!Number.isFinite(matchPercent)) matchPercent = 0;
  matchPercent = Math.min(100, Math.max(0, matchPercent));

  const reasoning = str(input.reasoning) ?? "No reasoning provided.";

  let recommendation: MatchRecommendation = "consider";
  if (input.recommendation === "apply" || input.recommendation === "skip") {
    recommendation = input.recommendation;
  }
  if (matchPercent >= 70) recommendation = "apply";
  if (matchPercent < 40) recommendation = "skip";

  return {
    matchPercent,
    matchedSkills: strArray(input.matchedSkills),
    missingSkills: strArray(input.missingSkills),
    reasoning,
    recommendation,
  };
}

export type ProfileJobScoreResult =
  | { ok: true; score: JobMatchScore }
  | { ok: false; error: string };

/** Shared score call used by the existing application flow and Daily Hunt. */
export async function scoreProfileAgainstJob(
  profileText: string,
  jobText: string,
): Promise<ProfileJobScoreResult> {
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
    return { ok: false, error: aiErrorText(error, "Scoring failed — retry.") };
  }

  const parsed = extractJson(raw);
  const score = parsed === null ? null : sanitizeScoreFromAi(parsed);
  if (!score) return { ok: false, error: "Scoring failed — please retry." };

  return { ok: true, score };
}
