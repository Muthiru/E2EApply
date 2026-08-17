import { getOwnedApplication } from "@/lib/job/access";

const PROFILE_INCLUDE = {
  skills: true,
  experiences: true,
  educations: true,
  projects: true,
  certifications: true,
  preferences: true,
} as const;

export async function getApplicationContext(applicationId: string) {
  const application = await getOwnedApplication(applicationId, {
    job: true,
    user: { include: { profile: { include: PROFILE_INCLUDE } } },
  });

  if (!application?.job || !application.user.profile) return null;

  const profile = application.user.profile;
  const profileText = [
    `Name: ${profile.fullName ?? ""}`.trim(),
    `Title: ${profile.title ?? "not stated"}`,
    `Summary: ${profile.summary ?? "not stated"}`,
    `Skills: ${profile.skills.map((s) => `${s.name}${s.years ? ` (${s.years}y)` : ""}`).join(", ") || "none"}`,
    `Experience: ${profile.experiences.map((e) => `${e.title} at ${e.company}${e.startDate ? `, ${e.startDate.getFullYear()}-${e.current ? "present" : (e.endDate?.getFullYear() ?? "?")}` : ""}${e.highlights.length ? ` — ${e.highlights.join("; ")}` : ""}${e.description ? ` — ${e.description}` : ""}`).join("\n") || "none"}`,
    `Education: ${profile.educations.map((ed) => [ed.degree, ed.field, ed.institution].filter(Boolean).join(", ")).join("; ") || "none"}`,
    `Projects: ${profile.projects.map((p) => `${p.name}${p.technologies.length ? ` (${p.technologies.join(", ")})` : ""}${p.description ? ` — ${p.description}` : ""}`).join("\n") || "none"}`,
    `Certifications: ${profile.certifications.map((c) => `${c.name}${c.issuer ? `, ${c.issuer}` : ""}`).join("; ") || "none"}`,
    `CV section order (the candidate's original CV structure, preserve it exactly): ${profile.cvSectionOrder.length > 0 ? profile.cvSectionOrder.join(" → ") : "not captured — use: Summary, Skills, Experience, Projects, Education"}`,
  ].join("\n");

  const jobText = [
    `Title: ${application.job.title}`,
    `Company: ${application.job.company ?? "not stated"}`,
    `Location: ${application.job.location ?? "not stated"}`,
    `Salary: ${application.job.salaryMin ?? "?"}-${application.job.salaryMax ?? "?"}`,
    `Description:\n${application.job.description ?? ""}`,
    `Requirements:\n${application.job.requirements ?? ""}`,
  ].join("\n");

  return { application, job: application.job, profile, profileText, jobText };
}