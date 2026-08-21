import { getOwnedApplication } from "@/lib/job/access";
import { extractMasterCvContactBlock } from "@/lib/job/documents";

const PROFILE_INCLUDE = {
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

export async function getApplicationContext(applicationId: string) {
  const application = await getOwnedApplication(applicationId, {
    job: true,
    masterCv: true,
    user: { include: { profile: { include: PROFILE_INCLUDE } } },
  });

  if (!application?.job || !application.user.profile) return null;

  const profile = application.user.profile;
  const masterCv = application.masterCv;
  const masterCvContactBlock = extractMasterCvContactBlock(masterCv?.textContent ?? "");
  const profileText = [
    `Name: ${profile.fullName ?? ""}`.trim(),
    `Title: ${profile.title ?? "not stated"}`,
    `Summary: ${profile.summary ?? "not stated"}`,
    `Skills: ${profile.skills.map((s) => `${s.name}${s.years === null || s.years === undefined ? "" : ` (${s.years}y)`}`).join(", ") || "none"}`,
    `Experience: ${profile.experiences.map((e) => `${e.title} at ${e.company}${e.startDate ? `, ${e.startDate.getFullYear()}-${e.current ? "present" : (e.endDate?.getFullYear() ?? "?")}` : ""}${e.highlights.length ? ` — ${e.highlights.join("; ")}` : ""}${e.description ? ` — ${e.description}` : ""}`).join("\n") || "none"}`,
    `Education: ${profile.educations.map((ed) => [ed.degree, ed.field, ed.institution].filter(Boolean).join(", ")).join("; ") || "none"}`,
    `Projects: ${profile.projects.map((p) => `${p.name}${p.technologies.length ? ` (${p.technologies.join(", ")})` : ""}${p.description ? ` — ${p.description}` : ""}`).join("\n") || "none"}`,
    `Certifications: ${profile.certifications.map((c) => `${c.name}${c.issuer ? `, ${c.issuer}` : ""}`).join("; ") || "none"}`,
    `CV section order (the candidate's original CV structure, preserve it exactly): ${(masterCv?.cvSectionOrder ?? []).length > 0 ? (masterCv?.cvSectionOrder ?? []).join(" → ") : "not captured — use: Summary, Skills, Experience, Projects, Education"}`,
    masterCvContactBlock
      ? `MASTER CV CONTACT BLOCK (immutable identity/contact/social lines; reuse exactly, never regenerate):\n${masterCvContactBlock}`
      : "MASTER CV CONTACT BLOCK: not captured — use profile contact fields only and never invent missing contact/social details.",
    masterCv?.textContent
      ? `MASTER CV (${masterCv.name} — THE source of truth for all content; base every tailored version on this exact text):\n${masterCv.textContent}`
      : "MASTER CV: not specified — base the CV on the structured profile fields above and nothing else.",
  ].join("\n");

  const matchDetails =
    application.job.matchDetails && typeof application.job.matchDetails === "object" && !Array.isArray(application.job.matchDetails)
      ? application.job.matchDetails as Record<string, unknown>
      : null;
  const matchedRequirements = stringList(matchDetails?.matchedSkills);
  const missingRequirements = stringList(matchDetails?.missingSkills);

  const jobText = [
    `Title: ${application.job.title}`,
    `Company: ${application.job.company ?? "not stated"}`,
    `Location: ${application.job.location ?? "not stated"}`,
    `Salary: ${application.job.salaryMin ?? "?"}-${application.job.salaryMax ?? "?"}`,
    `Description:\n${application.job.description ?? ""}`,
    `Requirements:\n${application.job.requirements ?? ""}`,
    matchedRequirements.length > 0
      ? `Matched requirements shown to the user:\n${matchedRequirements.map((skill) => `- ${skill}`).join("\n")}`
      : "",
    missingRequirements.length > 0
      ? `Missing requirements shown to the user:\n${missingRequirements.map((skill) => `- ${skill}`).join("\n")}`
      : "",
  ].join("\n");

  return { application, job: application.job, profile, profileText, jobText, masterCvContactBlock };
}
