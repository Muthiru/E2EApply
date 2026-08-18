import { isRecord, intOrNull, str } from "@/lib/ai/parse";

export type JobDraft = {
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  requirements: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  sourceUrl: string | null;
};

export const JOB_SCHEMA_DESCRIPTION = `Respond with a single JSON object using ONLY these fields:
{
  "title": string,
  "company": string | null,
  "location": string | null,
  "description": string | null,
  "requirements": string | null,
  "salaryMin": number | null,
  "salaryMax": number | null,
  "sourceUrl": string | null
}`;

export const JOB_RULES = `Rules:
- Extract facts ONLY from the provided job posting text. Never invent.
- "title" is required: the role being hired for. If the text is not a job posting, use "".
- "description": a factual 1-2 paragraph overview of the role.
- "requirements": the qualifications listed, as plain text (bullets joined with newlines).
- "salaryMin"/"salaryMax": integers in the same currency as posted, null if not stated. If only one bound is given, set the other to null.
- "sourceUrl": the posting URL if provided, otherwise null.
- Output valid JSON only — no markdown, no commentary.`;

export function sanitizeJobFromAi(input: unknown): JobDraft | null {
  if (!isRecord(input)) return null;

  const title = str(input.title);
  if (!title) return null;

  let salaryMin = intOrNull(input.salaryMin);
  let salaryMax = intOrNull(input.salaryMax);
  if (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin) {
    salaryMin = null;
    salaryMax = null;
  }

  return {
    title,
    company: str(input.company),
    location: str(input.location),
    description: str(input.description),
    requirements: str(input.requirements),
    salaryMin,
    salaryMax,
    sourceUrl: str(input.sourceUrl),
  };
}