export const CV_SCHEMA_DESCRIPTION = `Respond with a single string containing a tailored one-page CV in plain text markdown, using ONLY these structures:
## Section headings (e.g. "## Summary", "## Skills", "## Experience", "## Projects", "## Education")
- One-line bullets for skills and for each bullet under a role
Plain paragraphs under Summary and Education. No other markdown, no headings deeper than level 2, no tables.`;

export const CV_RULES = `Rules:
- This CV is an EDITED VERSION of the candidate's MASTER CV — same document, tailored to the posting. Do not design a new CV.
- The MASTER CV block in the prompt is the source of truth. Every company, job title, date, degree, institution, skill, project name, and result MUST come from it verbatim — never alter facts, never add facts that are not in it.
- PRESERVE the original CV's structure: keep the exact section headings and their order (given in the prompt as "CV section order"). Do not add or remove sections.
- Do NOT write the candidate's name, contact details, location, email, phone, LinkedIn, GitHub, website, or other identity/social-profile lines in the generated CV body. Those are immutable and are rendered verbatim from the MASTER CV contact block by the app.
- **Tailored Title**: The VERY FIRST line of your output MUST be a professional title (e.g. "Senior Frontend Engineer" or "Business Analyst") that is explicitly tailored to perfectly match the role being applied for, based on the job posting. Output this title on its own line, with no hash symbols or markdown forming.
- After the tailored title, leave a blank line, then start the first CV section heading, e.g. "## Summary".
- Tailoring means: rephrase the master CV's own words to match the posting's language where the facts genuinely support it (ATS keyword alignment), reorder skills by relevance to the posting, and surface the posting's most important keywords in the Summary's first line if the master CV supports them.
- **Handling Missing Requirements**: Review the "Missing requirements shown to the user" in the prompt. To maximize the candidate's ATS keyword score, you MUST creatively integrate every single missing requirement keyword into the CV. Weave them naturally into the Skills list, Summary paragraph, or by expanding existing Experience bullets to implicitly cover those competencies (e.g. framing a past project to involve "stakeholder management" or general tools). Do NOT skip any missing keywords.
- **GitHub Repository Injection**: Check the "GitHub Repositories (Public, dynamically fetched)" list provided in the context. If the job description expects a specific tech stack (e.g. Python, AWS, Next.js) that is missing from the candidate's standard projects, but you find a matching repository in their GitHub list, YOU MUST invent a new project bullet based on that repository to prove the required skill. Add the repository name, primary language, and description naturally as a bullet point under the Projects section.
- Rewrite experience/project bullets from the master CV to start with strong action verbs, 2-4 bullets per role, each factual and specific to what the master CV states.
- If the MASTER CV was not uploaded, use ONLY the structured profile fields — never invent anything to fill space.
- Keep it to one page. Plain text only — no placeholders, no bracketed text.`;

export const COVER_LETTER_SCHEMA_DESCRIPTION = `Respond with a single plain-text business letter, ready to paste or print, with exactly this structure (one blank line between each block):

[Sender contact block copied exactly from the MASTER CV contact block]

[Today's date]

[Hiring Manager]
[Company]

Subject: Application for [Role]

Dear Hiring Manager,

[Body: 3-4 short paragraphs]

Sincerely,
[Full name]`;

export const COVER_LETTER_RULES = `Rules:
- Construct the letter based securely on the candidate's profile, but boldly lean into the posting's requested skills.
- The sender/contact block must be copied exactly from "MASTER CV CONTACT BLOCK" in the prompt. Do not rewrite, normalize, reorder, or add contact/social/profile fields.
- The first paragraph states the exact role and company being applied to and why the candidate's profile fits.
- Middle paragraphs map the candidate's real strengths to the posting's key requirements. For any "Missing requirements", confidently frame the candidate's past projects or general expertise to encompass these gaps, bridging them naturally.
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
    const match = /^##\s+(.*)/.exec(line.trim());
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

const SECTION_HEADING_PATTERN =
  /^(?:#{1,3}\s*)?(summary|professional summary|profile|skills|technical skills|experience|work experience|employment|projects|education|certifications|certificates|languages|interests)\b/i;

export function extractMasterCvContactBlock(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const contactLines: string[] = [];

  for (const line of lines) {
    if (SECTION_HEADING_PATTERN.test(line)) break;
    if (/^##\s+/.test(line)) break;
    contactLines.push(line);
    if (contactLines.length >= 8) break;
  }

  const block = contactLines.join("\n").trim();
  return block.length > 0 ? block : null;
}

export function stripMasterCvContactBlock(text: string, contactBlock: string | null): string {
  if (!contactBlock) return text.trim();

  const contactLines = contactBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (contactLines.length === 0) return text.trim();

  const lines = text.split(/\r?\n/);
  let contactIndex = 0;
  let removeUntil = 0;

  for (let i = 0; i < lines.length && contactIndex < contactLines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      removeUntil = i + 1;
      continue;
    }
    if (line === contactLines[contactIndex]) {
      contactIndex += 1;
      removeUntil = i + 1;
      continue;
    }
    break;
  }

  return contactIndex === contactLines.length
    ? lines.slice(removeUntil).join("\n").trim()
    : text.trim();
}

function parseTextAsJson(text: string): unknown {
  if (text.startsWith('"') || text.startsWith("{")) {
    try {
      return JSON.parse(text);
    } catch {
      // not JSON
    }
  }
  return text;
}

function extractTextFromObject(obj: Record<string, unknown>): string | null {
  for (const key of ["cover_letter", "cv", "letter", "content", "text", "body"]) {
    if (typeof obj[key] === "string" && obj[key].trim()) return obj[key];
  }
  const strings = Object.values(obj).filter(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  if (strings.length === 0) return null;
  return strings.toSorted((a, b) => b.length - a.length)[0];
}

function asDocText(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = parseTextAsJson(trimmed);
  if (typeof candidate === "string") return candidate;

  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    return extractTextFromObject(candidate as Record<string, unknown>);
  }

  return null;
}

export function sanitizeCvFromAi(input: unknown): string | null {
  const text = asDocText(input);
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length < 80) return null;
  if (!/(?:^|\n)##\s+/.test(trimmed)) return null;
  return trimmed.slice(0, 12_000);
}

export function sanitizeCoverLetterFromAi(input: unknown): string | null {
  const text = asDocText(input);
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length < 60) return null;
  return trimmed.slice(0, 4_000);
}

const CV_BULLET_PREFIX = /^[-*•]\s+/;

export function isCvBulletLine(line: string): boolean {
  return CV_BULLET_PREFIX.test(line.trim());
}

export function cvBulletContent(line: string): string | null {
  const trimmed = line.trim();
  const match = CV_BULLET_PREFIX.exec(trimmed);
  return match ? trimmed.slice(match[0].length) : null;
}

export function linkHref(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }
  if (/^[a-z0-9-]+\.(com|org|net|io|dev|me)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}
