import { isRecord, str, strArray } from "@/lib/ai/parse";

const ALIGNMENT_LIST_LIMIT = 15;
const MAX_KEYWORDS = 30;

export type CvAlignmentCheck = {
  score: number;
  covered: string[];
  missingOwnable: string[];
  missingGaps: string[];
  reasoning: string;
};

export const CV_ALIGNMENT_SCHEMA_DESCRIPTION = `Respond with a single JSON object using ONLY these fields:
{
  "score": number (0-100, integer),
  "covered": string[],
  "missingOwnable": string[],
  "missingGaps": string[],
  "reasoning": string
}`;

export const CV_ALIGNMENT_RULES = `Rules:
- List every distinct requirement keyword or phrase from the job posting (use the posting's own naming, e.g. "Kubernetes", "load testing", "Jira"). A posting requirement may yield several keywords.
- For each requirement keyword, classify it into exactly one list:
  - "covered": the CV text clearly shows evidence of it (the keyword or a clear synonym in context).
  - "missingOwnable": the CV omits it, BUT the candidate's profile (skills/experience) shows real evidence — the tailored CV dropped something the candidate owns. These are fixable.
  - "missingGaps": the CV omits it and the profile has NO evidence of it. Honest gap — never suggest adding it.
- "score": round(covered keywords / total requirement keywords * 100).
- "reasoning": 2-3 plain sentences — what the CV covers well, and whether the missing ownable items are worth re-adding.
- Never claim coverage without evidence in the CV text. Never classify a gap as ownable if the profile lacks evidence. Cap each list at 15 entries.`;

const IMPORTANT_TERMS = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Java",
  "Go",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Prisma",
  "REST API",
  "GraphQL",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "Terraform",
  "CI/CD",
  "Git",
  "GitHub",
  "Linux",
  "Tailwind",
  "HTML",
  "CSS",
  "testing",
  "unit testing",
  "integration testing",
  "Playwright",
  "Vitest",
  "Jest",
  "Agile",
  "Scrum",
  "Jira",
  "Sentry",
  "PostHog",
  "authentication",
  "authorization",
  "OAuth",
  "API design",
  "microservices",
  "serverless",
  "Postgres",
  "frontend",
  "backend",
  "full stack",
  "root cause analysis",
  "incident management",
  "technical support",
  "customer support",
  "stakeholder management",
  "Fluency in English",
  "English",
  "Computer Science",
  "university graduate",
  "recent graduate",
  "legal authorization",
  "European Union",
  "consultant",
  "associate consultant",
  "business analyst",
  "requirements engineering",
  "solution design",
  "project delivery",
  "customer-facing",
  "technical problem-solving",
  "analytical mindset",
  "communication",
  "curiosity",
  "drive",
  "work ethic",
];

const SYNONYMS: Record<string, string[]> = {
  "api design": ["api design", "api development"],
  aws: ["aws", "amazon web services"],
  "ci/cd": ["ci/cd", "continuous integration", "continuous delivery", "continuous deployment"],
  "ci cd": ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"],
  css: ["css", "cascading style sheets"],
  gcp: ["gcp", "google cloud", "google cloud platform"],
  github: ["github", "git hub"],
  go: ["go", "golang"],
  html: ["html"],
  javascript: ["javascript"],
  kubernetes: ["kubernetes", "k8s"],
  mongodb: ["mongodb", "mongo db"],
  "next.js": ["next.js", "nextjs", "next js"],
  "node.js": ["node.js", "nodejs", "node js"],
  oauth: ["oauth", "oauth2", "oauth 2"],
  postgres: ["postgres", "postgresql"],
  postgresql: ["postgresql", "postgres"],
  "rest api": ["rest api", "restful api", "rest"],
  typescript: ["typescript", "ts"],
  "analytical mindset": ["analytical mindset", "analytical", "analysis", "business analyst"],
  "business analyst": ["business analyst", "business analysis"],
  communication: ["communication", "communications", "stakeholder", "client-facing", "customer-facing"],
  "computer science": ["computer science", "cs degree", "cs graduate"],
  consultant: ["consultant", "consulting", "consultancy"],
  curiosity: ["curiosity", "curious", "learning mindset", "learn quickly"],
  drive: ["drive", "driven", "self-starter", "initiative"],
  english: ["english", "fluent english", "english fluent"],
  "fluency in english": ["fluency in english", "fluent in english", "english fluent", "english: fluent"],
  "legal authorization": ["legal authorization", "authorized to work", "work authorization", "employed in the european union"],
  "project delivery": ["project delivery", "delivery", "delivered", "implementation"],
  "requirements engineering": ["requirements engineering", "requirements gathering", "elicitation"],
  "solution design": ["solution design", "solution designing", "designed solutions"],
  "technical problem-solving": ["technical problem-solving", "technical problem solving", "problem-solving", "problem solving"],
  "university graduate": ["university graduate", "graduate", "degree", "bachelor", "bsc", "msc"],
  "work ethic": ["work ethic", "ownership", "accountability", "reliable"],
};

const CANONICAL_KEYWORDS: Record<string, string> = {
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "ci cd": "CI/CD",
  "rest": "REST API",
  "rest api": "REST API",
  "restful api": "REST API",
  "english": "Fluency in English",
  "fluent in english": "Fluency in English",
  "english fluent": "Fluency in English",
  "fluent english": "Fluency in English",
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[._/]+/g, " ")
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordKey(keyword: string): string {
  return normalizeText(CANONICAL_KEYWORDS[normalizeText(keyword)] ?? keyword);
}

function displayKeyword(keyword: string): string {
  return CANONICAL_KEYWORDS[normalizeText(keyword)] ?? keyword;
}

function hasTerm(text: string, keyword: string): boolean {
  const normalized = ` ${normalizeText(text)} `;
  const key = keywordKey(keyword);
  const variants = SYNONYMS[key] ?? [keyword];

  return variants.some((variant) => {
    const normalizedVariant = normalizeText(variant);
    if (!normalizedVariant) return false;
    if (normalized.includes(` ${normalizedVariant} `)) return true;

    const tokens = normalizedVariant
      .split(" ")
      .filter((token) => token.length > 2);
    if (tokens.length < 2) return false;
    const matched = tokens.filter((token) => normalized.includes(` ${token} `));
    return matched.length / tokens.length >= 0.75;
  });
}

function addKeyword(
  keywords: Map<string, string>,
  keyword: string | null,
  sourceText: string,
) {
  if (!keyword) return;
  if (!hasTerm(sourceText, keyword)) return;
  const key = keywordKey(keyword);
  if (!key || keywords.has(key)) return;
  keywords.set(key, displayKeyword(keyword));
}

export function extractRequirementKeywords(jobText: string): string[] {
  const keywords = new Map<string, string>();
  for (const term of IMPORTANT_TERMS) addKeyword(keywords, term, jobText);

  return Array.from(keywords.values()).slice(0, MAX_KEYWORDS);
}

export function buildCvKeywordCoverage({
  jobText,
  cvContent,
  profileText,
}: {
  jobText: string;
  cvContent: string;
  profileText: string;
}): CvAlignmentCheck | null {
  const keywords = extractRequirementKeywords(jobText);
  if (keywords.length === 0) return null;

  const covered = keywords.filter((keyword) => hasTerm(cvContent, keyword));
  const missing = keywords.filter((keyword) => !hasTerm(cvContent, keyword));
  const missingOwnable = missing.filter((keyword) => hasTerm(profileText, keyword));
  const missingGaps = missing.filter((keyword) => !hasTerm(profileText, keyword));
  const score = Math.round((covered.length / keywords.length) * 100);

  const reasoning =
    missingOwnable.length > 0
      ? `The CV covers ${covered.length} of ${keywords.length} detected job keywords. Re-add supported terms such as ${missingOwnable.slice(0, 3).join(", ")} to improve ATS alignment without inventing facts.`
      : missingGaps.length > 0
        ? `The CV covers ${covered.length} of ${keywords.length} detected job keywords. Remaining misses look like honest gaps based on the master profile, so they should not be forced in.`
        : `The CV covers all ${keywords.length} detected job keywords from the posting.`;

  return {
    score,
    covered: covered.slice(0, ALIGNMENT_LIST_LIMIT),
    missingOwnable: missingOwnable.slice(0, ALIGNMENT_LIST_LIMIT),
    missingGaps: missingGaps.slice(0, ALIGNMENT_LIST_LIMIT),
    reasoning,
  };
}

export function sanitizeCvAlignmentFromAi(
  input: unknown,
): CvAlignmentCheck | null {
  if (!isRecord(input)) return null;

  let score = typeof input.score === "number" ? Math.round(input.score) : NaN;
  if (!Number.isFinite(score)) score = 0;
  score = Math.min(100, Math.max(0, score));

  const covered = strArray(input.covered).slice(0, ALIGNMENT_LIST_LIMIT);
  const missingOwnable = strArray(input.missingOwnable).slice(0, ALIGNMENT_LIST_LIMIT);
  const missingGaps = strArray(input.missingGaps).slice(0, ALIGNMENT_LIST_LIMIT);

  const total = covered.length + missingOwnable.length + missingGaps.length;
  if (total === 0) return null;

  return {
    score,
    covered,
    missingOwnable,
    missingGaps,
    reasoning: str(input.reasoning) ?? "No reasoning provided.",
  };
}
