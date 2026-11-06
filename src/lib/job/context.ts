/* eslint-disable @typescript-eslint/no-explicit-any */
import { getOwnedApplication } from "@/lib/job/access";
import { extractMasterCvContactBlock } from "@/lib/job/documents";

export const PROFILE_INCLUDE = {
  skills: true,
  experiences: true,
  educations: true,
  projects: true,
  certifications: true,
  preferences: true,
} as const;

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

async function fetchGithubReposText(profileGithub: string | null, githubToken: string | null, masterCvText: string | null): Promise<string> {
  let githubUsername: string | null = null;
  const profileMatch = profileGithub?.match(/github\.com\/([\w.-]+)/i);
  if (profileMatch) {
    githubUsername = profileMatch[1];
  } else {
    const cvMatch = masterCvText?.match(/github\.com\/([\w.-]+)/i);
    if (cvMatch) {
      githubUsername = cvMatch[1];
    }
  }

  if (!githubUsername) return "none";

  try {
    const headers: Record<string, string> = { "User-Agent": "E2E-Apply-ATS" };
    let url = "https://api.github.com/users/" + githubUsername + "/repos?sort=updated&per_page=15";
    if (githubToken) {
      headers["Authorization"] = `Bearer ${githubToken}`;
      url = "https://api.github.com/user/repos?sort=updated&per_page=15";
    }
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const remaining = resp.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        console.warn("[github] Rate limited — skipping repo fetch");
      }
      return "none";
    }
    const repos = await resp.json();
    if (!Array.isArray(repos) || repos.length === 0) return "none";

    return repos
      .filter((r: { fork?: boolean }) => !r.fork)
      .slice(0, 12)
      .map((r: {
        name: string;
        html_url?: string;
        language?: string;
        description?: string;
        topics?: string[];
        stargazers_count?: number;
      }) => {
        const parts = [r.name];
        parts.push(`URL: ${r.html_url ?? `https://github.com/${githubUsername}/${r.name}`}`);
        if (r.language) parts.push(`Language: ${r.language}`);
        if (r.topics && r.topics.length > 0) parts.push(`Topics: ${r.topics.join(", ")}`);
        if (r.stargazers_count && r.stargazers_count > 0) parts.push(`${r.stargazers_count} stars`);
        parts.push(r.description ?? "No description");
        return parts.join(" — ");
      })
      .join("\n");
  } catch (e) {
    console.error("Failed to fetch Github repos", e);
  }
  return "none";
}

function buildProfileText(
  profile: any,
  masterCv: any,
  masterCvContactBlock: string | null,
  githubReposText: string
): string {
  const name = profile.fullName ?? "";
  const title = profile.title ?? "not stated";
  const summary = profile.summary ?? "not stated";

  const skillsList = profile.skills.map((s: any) =>
    s.name + (s.years === null || s.years === undefined ? "" : " (" + s.years + "y)")
  ).join(", ") || "none";

  const expList = profile.experiences.map((e: any) => {
    let base = e.title + " at " + e.company;
    if (e.startDate) {
      const end = e.current ? "present" : (e.endDate?.getFullYear() ?? "?");
      base += ", " + e.startDate.getFullYear() + "-" + end;
    }
    if (e.highlights.length) {
      base += " — " + e.highlights.join("; ");
    }
    if (e.description) {
      base += " — " + e.description;
    }
    return base;
  }).join("\n") || "none";

  const eduList = profile.educations.map((ed: any) =>
    [ed.degree, ed.field, ed.institution].filter(Boolean).join(", ")
  ).join("; ") || "none";

  const projList = profile.projects.map((p: any) => {
    let base = p.name;
    if (p.technologies.length) {
      base += " (" + p.technologies.join(", ") + ")";
    }
    if (p.url?.trim()) {
      base += " | URL: " + p.url.trim();
    }
    if (p.description) {
      base += " — " + p.description;
    }
    return base;
  }).join("\n") || "none";

  const certList = profile.certifications.map((c: any) =>
    c.name + (c.issuer ? ", " + c.issuer : "")
  ).join("; ") || "none";

  const orderArray = masterCv?.cvSectionOrder ?? [];
  const orderStr = orderArray.length > 0
    ? orderArray.join(" → ")
    : "not captured — use: Summary, Skills, Experience, Projects, Education";

  const contactStr = masterCvContactBlock
    ? "MASTER CV CONTACT BLOCK (immutable identity/contact/social lines; reuse exactly, never regenerate):\n" + masterCvContactBlock
    : "MASTER CV CONTACT BLOCK: not captured — use profile contact fields only and never invent missing contact/social details.";

  const textCont = masterCv?.textContent
    ? "MASTER CV (" + masterCv.name + " — THE source of truth for all content; base every tailored version on this exact text):\n" + masterCv.textContent
    : "MASTER CV: not specified — base the CV on the structured profile fields above and nothing else.";

  return [
    "Name: " + name.trim(),
    "Title: " + title,
    "Summary: " + summary,
    "Skills: " + skillsList,
    "Experience: " + expList,
    "Education: " + eduList,
    "Projects: " + projList,
    "GitHub Repositories (Public, dynamically fetched): \n" + githubReposText,
    "Certifications: " + certList,
    "CV section order (the candidate's original CV structure, preserve it exactly): " + orderStr,
    contactStr,
    textCont,
  ].join("\n");
}

export async function buildCandidateProfileText(profile: any, masterCv: any): Promise<string> {
  const masterCvContactBlock = extractMasterCvContactBlock(masterCv?.textContent ?? "");
  const githubReposText = await fetchGithubReposText(
    profile.github,
    profile.githubToken,
    masterCv?.textContent ?? null,
  );
  return buildProfileText(profile, masterCv, masterCvContactBlock, githubReposText);
}

function buildJobText(job: any, matchDetails: any): string {
  const matchedRequirements = stringList(matchDetails?.matchedSkills);
  const missingRequirements = stringList(matchDetails?.missingSkills);

  let matchedStr = "";
  if (matchedRequirements.length > 0) {
    matchedStr = "Matched requirements shown to the user:\n" + matchedRequirements.map((skill) => "- " + skill).join("\n");
  }

  let missingStr = "";
  if (missingRequirements.length > 0) {
    missingStr = "Missing requirements shown to the user:\n" + missingRequirements.map((skill) => "- " + skill).join("\n");
  }

  return [
    "Title: " + job.title,
    "Company: " + (job.company ?? "not stated"),
    "Location: " + (job.location ?? "not stated"),
    "Salary: " + (job.salaryMin ?? "?") + "-" + (job.salaryMax ?? "?"),
    "Description:\n" + (job.description ?? ""),
    "Requirements:\n" + (job.requirements ?? ""),
    matchedStr,
    missingStr,
  ].join("\n");
}

export async function getApplicationContext(applicationId: string) {
  const application = await getOwnedApplication(applicationId, {
    job: true,
    masterCv: true,
    user: { include: { profile: { include: PROFILE_INCLUDE } } },
  });

  if (!application?.job || !application.user.profile) return null;

  const profile = application.user.profile;
  const masterCv = application.masterCv;
  const profileText = await buildCandidateProfileText(profile, masterCv);

  const matchDetails =
    application.job.matchDetails && typeof application.job.matchDetails === "object" && !Array.isArray(application.job.matchDetails)
      ? application.job.matchDetails as Record<string, unknown>
      : null;

  const jobText = buildJobText(application.job, matchDetails);

  const masterCvContactBlock = extractMasterCvContactBlock(masterCv?.textContent ?? "");
  return { application, job: application.job, profile, profileText, jobText, masterCvContactBlock };
}
