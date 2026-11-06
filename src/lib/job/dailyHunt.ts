import type { DiscoverCandidate } from "@/lib/job/discover";
import type { MatchRecommendation } from "@/lib/job/score";

export type DailyHuntScreeningPreferences = {
  mustHaveTerms: string[];
  dealBreakerTerms: string[];
  locations: string[];
  remoteOnly: boolean;
  salaryFloor: number | null;
  minMatchPercent: number | null;
};

export type DailyHuntScreeningResult = {
  status: "MATCHED" | "REVIEW" | "EXCLUDED";
  reasons: string[];
};

function normalize(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalize(term.trim());
  return normalizedTerm.length > 0 && text.includes(normalizedTerm);
}

export function screenDailyHuntCandidate(
  candidate: Pick<DiscoverCandidate, "title" | "company" | "location" | "snippet" | "estimatedMatch">,
  preferences: DailyHuntScreeningPreferences,
  recommendation?: MatchRecommendation,
  postingText?: string | null,
): DailyHuntScreeningResult {
  const searchableText = normalize(
    [candidate.title, candidate.company, candidate.location, candidate.snippet, postingText].filter(Boolean).join(" "),
  );

  const matchedDealBreakers = preferences.dealBreakerTerms.filter((term) =>
    containsTerm(searchableText, term),
  );
  if (matchedDealBreakers.length > 0) {
    return {
      status: "EXCLUDED",
      reasons: matchedDealBreakers.map((term) => `Deal-breaker found: ${term}`),
    };
  }

  const reviewReasons = preferences.mustHaveTerms
    .filter((term) => !containsTerm(searchableText, term))
    .map((term) => `Must-have not confirmed in the available job text: ${term}`);

  if (preferences.locations.length > 0) {
    const hasLocationEvidence = preferences.locations.some((location) =>
      containsTerm(searchableText, location),
    );
    if (!hasLocationEvidence && !preferences.remoteOnly) {
      reviewReasons.push("Preferred location is not confirmed in the available job text");
    }
  }

  if (preferences.remoteOnly) {
    if (/\b(on[- ]?site|in[- ]office|office[- ]based)\b/i.test(searchableText)) {
      return {
        status: "EXCLUDED",
        reasons: ["Posting appears to require on-site work, but your preference is remote only"],
      };
    }
    if (!/\b(remote|distributed|work from home|anywhere)\b/i.test(searchableText)) {
      reviewReasons.push("Remote work is not confirmed in the available job text");
    }
  }

  if (
    preferences.minMatchPercent !== null &&
    candidate.estimatedMatch !== null &&
    candidate.estimatedMatch < preferences.minMatchPercent
  ) {
    reviewReasons.push(
      `Estimated match score (${candidate.estimatedMatch}%) is below your ${preferences.minMatchPercent}% preference`,
    );
  }

  if (recommendation === "consider") {
    reviewReasons.push("The selected CV match score recommends a closer review.");
  } else if (recommendation === "skip") {
    reviewReasons.push("The selected CV match score found significant qualification gaps; review before proceeding.");
  }

  if (preferences.salaryFloor !== null) {
    reviewReasons.push(
      `Verify the full posting meets your $${preferences.salaryFloor.toLocaleString("en-US")}/year salary floor`,
    );
  }

  return reviewReasons.length > 0
    ? { status: "REVIEW", reasons: reviewReasons }
    : { status: "MATCHED", reasons: ["No configured screening concerns were found in the available job details"] };
}
