export const CV_SCHEMA_DESCRIPTION = `Respond with a single string containing a tailored one-page CV in plain text markdown, using ONLY these structures:
## Section headings (e.g. "## Summary", "## Skills", "## Experience", "## Projects", "## Education")
- One-line bullets for skills and for each bullet under a role
Plain paragraphs under Summary and Education. No other markdown, no headings deeper than level 2, no tables.`;

export const CV_RULES = `Rules:
- This CV is an EDITED VERSION of the candidate's MASTER CV — same document, tailored to the posting. Do not design a new CV.
- The MASTER CV and structured candidate profile are the sources of truth. Every company, job title, date, degree, institution, skill, project name, and result MUST come from those sources — never invent facts.
- PRESERVE the original CV's structure: keep the exact section headings and their order (given in the prompt as "CV section order"). Do not add or remove sections. Within each section, tailor only the wording while keeping all claims factual.
- Do NOT write the candidate's name, contact details, location, email, phone, LinkedIn, GitHub, website, or other identity/social-profile lines in the generated CV body. Those are immutable and are rendered verbatim from the MASTER CV contact block by the app.
- **Tailored Title**: The VERY FIRST line of your output MUST be a professional title (e.g. "Senior Frontend Engineer" or "Business Analyst") optimally tailored to match the role being applied for. Importantly, you MUST append 3 to 4 of the most highly relevant core tech stack/skill ATS keywords from the job description separated by pipelines (e.g. "Senior Frontend Engineer | React | TypeScript | Next.js"). Output this title string exactly on its own line, WITHOUT any encompassing quotation marks, hash symbols, or markdown formatting.
- After the tailored title, leave a blank line, then start the first CV section heading, e.g. "## Summary".
- Tailoring means: rephrase the master CV's own words to match the posting's language where the facts genuinely support it (ATS keyword alignment), reorder skills by relevance to the posting, and surface the posting's most important keywords in the Summary's first line if the master CV supports them.
- **Handling Missing Requirements**: Include a missing requirement only when the candidate profile or Master CV contains direct evidence for it. Rephrase that evidence accurately; never imply an unsupported skill or experience. Leave unsupported requirements out of the CV.
- Include a project URL only when one is explicitly present in the candidate profile or the provided repository data. Never invent a URL or add a "GitHub repository" label without an actual link. Keep project links next to the matching project name.
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
  let trimmed = text.trim();

  // Aggressively strip wrapping quotation marks from the generated title line
  const lines = trimmed.split(/\r?\n/);
  if (lines.length > 0 && !lines[0].startsWith("##")) {
    lines[0] = lines[0].replace(/^["']|["']$/g, "");
    trimmed = lines.join("\n");
  }

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

export type LinkedTextPart = { text: string; href?: string };

export function splitLinkedText(text: string): LinkedTextPart[] {
  const parts: LinkedTextPart[] = [];
  const urlPattern = /https?:\/\/[^\s<>]+/gi;
  let cursor = 0;

  for (const match of text.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    const rawUrl = match[0];
    const url = rawUrl.replace(/[.,;:!?]+$/, "");
    const trailing = rawUrl.slice(url.length);
    if (index > cursor) parts.push({ text: text.slice(cursor, index) });
    if (url) parts.push({ text: url, href: url });
    if (trailing) parts.push({ text: trailing });
    cursor = index + rawUrl.length;
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts.length ? parts : [{ text }];
}

export function appendProfileProjectUrls(
  text: string,
  projects: { name: string; url: string | null }[],
): string {
  const lines = text.split(/\r?\n/);
  let inProjects = false;

  return lines.map((line) => {
    const heading = /^##\s+(.*)/.exec(line.trim());
    if (heading) {
      inProjects = /^projects?\b/i.test(heading[1]);
      return line;
    }
    if (!inProjects) return line;

    const matchingProject = projects.find((project) => {
      const url = project.url?.trim();
      return Boolean(url && project.name.trim() && line.toLowerCase().includes(project.name.trim().toLowerCase()));
    });
    if (!matchingProject?.url) {
      return line.replace(/\s*(?:[|–—-]\s*)?GitHub repository\b/gi, "");
    }
    if (line.toLowerCase().includes(matchingProject.url.trim().toLowerCase())) return line;
    return `${line.trimEnd()} — ${matchingProject.url.trim()}`;
  }).join("\n");
}

export function appendProfileLinksToCoverLetter(
  text: string,
  links: (string | null | undefined)[],
): string {
  const separator = text.search(/\n\s*\n/);
  if (separator < 0) return text;
  const contactBlock = text.slice(0, separator);
  const availableLinks = links
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && linkHref(value)))
    .filter((value) => !contactBlock.toLowerCase().includes(value.toLowerCase()));
  if (!availableLinks.length) return text;

  return `${contactBlock}\n${availableLinks.join(" | ")}${text.slice(separator)}`;
}
