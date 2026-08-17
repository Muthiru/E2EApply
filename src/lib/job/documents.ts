export const CV_SCHEMA_DESCRIPTION = `Respond with a single string containing a tailored one-page CV in plain text markdown, using ONLY these structures:
## Section headings (e.g. "## Summary", "## Skills", "## Experience", "## Projects", "## Education")
- One-line bullets for skills and for each bullet under a role
Plain paragraphs under Summary and Education. No other markdown, no headings deeper than level 2, no tables.`;

export const CV_RULES = `Rules:
- This CV is a TAILORED VERSION of the candidate's existing CV — improve it, do not redesign it.
- Use ONLY facts from the candidate profile. NEVER invent companies, titles, dates, skills, degrees, or results.
- PRESERVE the original CV's structure: keep the exact section headings and their order (given in the prompt as "CV section order"). Do not add or remove sections.
- Keep the candidate's contact header style: same lines (name, title, location, phone, email, LinkedIn, GitHub, website) in the same order as the profile lists them.
- Rephrase profile facts to match the posting's language where the profile genuinely supports it (ATS keyword alignment). Surface the posting's most important keywords in the Summary's first line if the candidate has them.
- Rewrite experience/project bullets to start with strong action verbs, 2-4 bullets per role, each factual and specific.
- Order Skills by relevance to the posting (posting-relevant first) — but keep them in the same section.
- Keep it to one page. Plain text only — no placeholders, no bracketed text.`;

export const COVER_LETTER_SCHEMA_DESCRIPTION = `Respond with a single plain-text business letter, ready to paste or print, with exactly this structure (one blank line between each block):

[Full name]
[Current job title]
[City, Country from the profile]
[Phone] | [Email] | [LinkedIn]

[Today's date]

[Hiring Manager]
[Company]

Subject: Application for [Role]

Dear Hiring Manager,

[Body: 3-4 short paragraphs]

Sincerely,
[Full name]`;

export const COVER_LETTER_RULES = `Rules:
- Use ONLY facts from the candidate profile and the posting. NEVER invent experience, skills, or outcomes.
- The header block must be built from the profile's real contact details; omit any that are missing (the prompt includes the profile).
- The first paragraph states the exact role and company being applied to and why the candidate's profile fits.
- Middle paragraphs map the candidate's real strengths to the posting's key requirements.
- The final paragraph is a brief, polite closing inviting a conversation.
- Keep the letter under 350 words.
- Never leave bracketed placeholders. Do not mention AI. Do not beg or over-apologize.`;

export type DocumentSection = "summary" | "skills" | "experience" | "projects" | "education";

export const CV_SECTION_ORDER: DocumentSection[] = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
];

export function splitCvSections(text: string): Record<DocumentSection, string[]> {
  const sections: Record<DocumentSection, string[]> = {
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
  };
  const lines = text.split(/\r?\n/);
  let current: DocumentSection | null = null;
  for (const line of lines) {
    const match = /^##\s+(.+)$/.exec(line.trim());
    if (match) {
      const heading = match[1].toLowerCase();
      const key = CV_SECTION_ORDER.find((s) => heading.includes(s));
      current = key ?? null;
      continue;
    }
    if (current && line.trim() !== "") {
      sections[current].push(line.trim());
    }
  }
  return sections;
}

function asDocText(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (!input.trim()) return null;

  let candidate: unknown = input;
  const trimmed = input.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        candidate = parsed;
      } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidate = parsed;
      }
    } catch {
      // not JSON — use the raw text
    }
  }

  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const obj = candidate as Record<string, unknown>;
    for (const key of ["cover_letter", "cv", "letter", "content", "text", "body"]) {
      if (typeof obj[key] === "string" && obj[key].trim()) return obj[key];
    }
    const strings = Object.values(obj).filter(
      (v): v is string => typeof v === "string" && v.trim() !== "",
    );
    if (strings.length === 0) return null;
    return strings.sort((a, b) => b.length - a.length)[0];
  }

  return typeof candidate === "string" ? candidate : null;
}

export function sanitizeCvFromAi(input: unknown): string | null {
  const text = asDocText(input);
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length < 80) return null;
  if (!/^##\s+/.test(trimmed)) return null;
  return trimmed.slice(0, 12_000);
}

export function sanitizeCoverLetterFromAi(input: unknown): string | null {
  const text = asDocText(input);
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length < 60) return null;
  return trimmed.slice(0, 4_000);
}

export function linkHref(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }
  if (/^[A-Za-z0-9-]+\.(com|org|net|io|dev|me)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}