import type { CvParsedProfile } from "./types";

export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to lenient extraction
  }

  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // fall through
    }
  }

  return null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

const isoDate = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(s);
  return match ? s : null;
};

const intOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : null;

const strArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .map((item) => str(item))
        .filter((item): item is string => item !== null)
    : [];

const bool = (v: unknown): boolean => v === true;

function skill(v: unknown) {
  if (!isRecord(v)) return null;
  const name = str(v.name);
  if (!name) return null;
  return { name, level: str(v.level), years: intOrNull(v.years) };
}

function experience(v: unknown) {
  if (!isRecord(v)) return null;
  const company = str(v.company);
  const title = str(v.title);
  if (!company || !title) return null;
  const current = bool(v.current);
  return {
    company,
    title,
    location: str(v.location),
    startDate: isoDate(v.startDate),
    endDate: current ? null : isoDate(v.endDate),
    current,
    description: str(v.description),
    highlights: strArray(v.highlights),
  };
}

function education(v: unknown) {
  if (!isRecord(v)) return null;
  const institution = str(v.institution);
  if (!institution) return null;
  return {
    institution,
    degree: str(v.degree),
    field: str(v.field),
    startDate: isoDate(v.startDate),
    endDate: isoDate(v.endDate),
    gpa: str(v.gpa),
  };
}

function project(v: unknown) {
  if (!isRecord(v)) return null;
  const name = str(v.name);
  if (!name) return null;
  return {
    name,
    description: str(v.description),
    url: str(v.url),
    technologies: strArray(v.technologies),
    startDate: isoDate(v.startDate),
    endDate: isoDate(v.endDate),
  };
}

function certification(v: unknown) {
  if (!isRecord(v)) return null;
  const name = str(v.name);
  if (!name) return null;
  return {
    name,
    issuer: str(v.issuer),
    date: isoDate(v.date),
    url: str(v.url),
  };
}

function normalizeUrl(match: string, host: "linkedin" | "github"): string {
  const withoutProtocol = match.trim().replace(/^https?:\/\//i, "");
  const path = withoutProtocol.replace(
    /^(www\.)?(linkedin\.com|github\.com)\//i,
    "",
  );
  const domain = host === "linkedin" ? "www.linkedin.com" : "github.com";
  return `https://${domain}/${path}`;
}

export function enrichFromText(
  profile: CvParsedProfile,
  text: string,
): CvParsedProfile {
  const result: CvParsedProfile = { ...profile };

  const email = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(text)?.[0];
  if (!result.email && email) result.email = email;

  const linkedin =
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i.exec(text)?.[0];
  if (!result.linkedin && linkedin) {
    result.linkedin = normalizeUrl(linkedin, "linkedin");
  }

  const github =
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i.exec(text)?.[0];
  if (!result.github && github) {
    result.github = normalizeUrl(github, "github");
  }

  if (!result.website) {
    const generic = /https?:\/\/[^\s"'<>]+/g
      .exec(text)?.[0]
      ?.replace(/[),.]+$/, "");
    if (generic && !/linkedin\.com|github\.com/i.test(generic)) {
      result.website = generic;
    }
  }

  return result;
}

export function sanitizeParsedProfile(input: unknown): CvParsedProfile {
  if (!isRecord(input)) return {};

  return {
    fullName: str(input.fullName),
    title: str(input.title),
    summary: str(input.summary),
    location: str(input.location),
    phone: str(input.phone),
    email: str(input.email),
    website: str(input.website),
    github: str(input.github),
    linkedin: str(input.linkedin),
    skills: Array.isArray(input.skills)
      ? input.skills
          .map(skill)
          .filter((s): s is NonNullable<ReturnType<typeof skill>> => s !== null)
      : [],
    experiences: Array.isArray(input.experiences)
      ? input.experiences
          .map(experience)
          .filter(
            (e): e is NonNullable<ReturnType<typeof experience>> => e !== null,
          )
      : [],
    educations: Array.isArray(input.educations)
      ? input.educations
          .map(education)
          .filter(
            (e): e is NonNullable<ReturnType<typeof education>> => e !== null,
          )
      : [],
    projects: Array.isArray(input.projects)
      ? input.projects
          .map(project)
          .filter((p): p is NonNullable<ReturnType<typeof project>> => p !== null)
      : [],
    certifications: Array.isArray(input.certifications)
      ? input.certifications
          .map(certification)
          .filter(
            (c): c is NonNullable<ReturnType<typeof certification>> =>
              c !== null,
          )
      : [],
  };
}