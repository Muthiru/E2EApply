"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeProfileUrls,
  profileSchema,
  type ProfileInput,
} from "@/lib/validations/profile";

export type SaveProfileResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; errors: Record<string, string[]> };

export async function saveProfile(input: unknown): Promise<SaveProfileResult> {
  const { userId } = await auth.protect();

  const parsed = profileSchema.safeParse(normalizeProfileUrls(input));
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      errors[path] = [...(errors[path] ?? []), issue.message];
    }
    return { ok: false, errors };
  }
  const data = parsed.data as ProfileInput;

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId, profile: { create: {} } },
    update: {},
  });

  const basics = {
    fullName: data.fullName,
    title: data.title,
    summary: data.summary,
    location: data.location,
    phone: data.phone,
    email: data.email,
    website: data.website,
    github: data.github,
    linkedin: data.linkedin,
  };

  const uniqueSkills = Array.from(
    new Map(data.skills.map((s) => [s.name.toLowerCase(), s])).values(),
  );

  try {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...basics },
        update: basics,
      });

      await tx.skill.deleteMany({ where: { profileId: profile.id } });
      await tx.workExperience.deleteMany({ where: { profileId: profile.id } });
      await tx.education.deleteMany({ where: { profileId: profile.id } });
      await tx.project.deleteMany({ where: { profileId: profile.id } });
      await tx.certification.deleteMany({ where: { profileId: profile.id } });

      await tx.skill.createMany({
        data: uniqueSkills.map((s) => ({
          profileId: profile.id,
          name: s.name,
          level: s.level ?? null,
          years: s.years ?? null,
        })),
      });

      await tx.workExperience.createMany({
        data: data.experiences.map((e) => ({
          profileId: profile.id,
          company: e.company,
          title: e.title,
          location: e.location ?? null,
          startDate: e.startDate,
          endDate: e.current ? null : e.endDate,
          current: e.current ?? false,
          description: e.description ?? null,
          highlights: e.highlights ?? [],
        })),
      });

      await tx.education.createMany({
        data: data.educations.map((ed) => {
          const gpa = ed.gpa === "" || ed.gpa == null ? null : Number.parseFloat(ed.gpa);
          return {
            profileId: profile.id,
            institution: ed.institution,
            degree: ed.degree ?? null,
            field: ed.field ?? null,
            startDate: ed.startDate,
            endDate: ed.endDate,
            gpa: gpa !== null && Number.isFinite(gpa) ? gpa : null,
          };
        }),
      });

      await tx.project.createMany({
        data: data.projects.map((p) => ({
          profileId: profile.id,
          name: p.name,
          description: p.description ?? null,
          url: p.url ?? null,
          technologies: p.technologies ?? [],
          startDate: p.startDate,
          endDate: p.endDate,
        })),
      });

      await tx.certification.createMany({
        data: data.certifications.map((c) => ({
          profileId: profile.id,
          name: c.name,
          issuer: c.issuer ?? null,
          date: c.date,
          url: c.url ?? null,
        })),
      });

      await tx.profilePreferences.upsert({
        where: { profileId: profile.id },
        create: {
          profileId: profile.id,
          preferredRoles: data.preferences.preferredRoles,
          locations: data.preferences.locations,
          remoteOnly: data.preferences.remoteOnly ?? false,
          salaryFloor: data.preferences.salaryFloor ?? null,
          minMatchPercent: data.preferences.minMatchPercent ?? null,
        },
        update: {
          preferredRoles: data.preferences.preferredRoles,
          locations: data.preferences.locations,
          remoteOnly: data.preferences.remoteOnly ?? false,
          salaryFloor: data.preferences.salaryFloor ?? null,
          minMatchPercent: data.preferences.minMatchPercent ?? null,
        },
      });
    });
  } catch {
    return {
      ok: false,
      error: "Profile could not be saved. Please try again.",
    };
  }

  return { ok: true };
}

export async function deleteMasterCv(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId } = await auth.protect();
    await prisma.masterCv.deleteMany({
      where: { id, profile: { user: { clerkId: userId } } },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to delete Master CV." };
  }
}

export async function generateExpertMasterCv(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId } = await auth.protect();
    const profile = await prisma.profile.findFirst({
      where: { user: { clerkId: userId } },
      include: {
        skills: true,
        experiences: true,
        educations: true,
        projects: true,
        certifications: true,
      },
    });

    if (!profile) return { ok: false, error: "Profile not found." };

    let githubReposText = "none";
    const githubUrlMatch = profile.github?.match(/github\.com\/([\w.-]+)/i);
    if (githubUrlMatch) {
      const githubUsername = githubUrlMatch[1];
      try {
        const resp = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=15`, {
          headers: { "User-Agent": "E2E-Apply-ATS" }
        });
        if (resp.ok) {
          const repos = await resp.json();
          if (Array.isArray(repos) && repos.length > 0) {
            githubReposText = repos.map((r: { name: string; language?: string; description?: string }) => r.name + (r.language ? " (Language: " + r.language + ")" : "") + " — " + (r.description ?? "No description")).join('\n');
          }
        }
      } catch (e) {
        console.error("Failed to fetch Github repos for Expert Master CV", e);
      }
    }

    const profileText = [
      "Name: " + (profile.fullName ?? "").trim(),
      "Title: " + (profile.title ?? "not stated"),
      "Summary: " + (profile.summary ?? "not stated"),
      "Skills: " + profile.skills.map((s) => s.name + (s.years === null ? "" : " (" + s.years + "y)")).join(", "),
      "Experience: " + profile.experiences.map((e) => e.title + " at " + e.company + " (" + (e.startDate?.getFullYear() ?? "?") + "-" + (e.endDate?.getFullYear() ?? "present") + ") — " + e.highlights.join("; ")).join("\n"),
      "Education: " + profile.educations.map((ed) => [ed.degree, ed.field, ed.institution].filter(Boolean).join(", ")).join("; "),
      "Projects: " + profile.projects.map((p) => p.name + " (" + p.technologies.join(", ") + ") — " + p.description).join("\n"),
      "Certifications: " + profile.certifications.map((c) => c.name + ", " + c.issuer).join("; "),
      "Recent Public Github Repositories of Candidate:\n" + githubReposText,
    ].join("\n");

    const { getAiProvider } = await import("@/lib/ai");
    const { aiErrorText } = await import("@/lib/ai/parse");
    const { CV_SCHEMA_DESCRIPTION, sanitizeCvFromAi } = await import("@/lib/job/documents");

    const ai = getAiProvider();

    const MASTER_CV_RULES = `Rules:
- You are an expert resume writer. Construct a flawless, one-page master CV based strictly on the provided candidate profile.
- You must output the candidate's professional title on the very first line (e.g. "Senior Software Engineer"), immediately followed by a blank line, then "## Summary", etc.
- Enhance and rewrite the action verbs and descriptions to be extremely polished and professional. Do NOT invent facts or add external skills not found in the profile.
- Output ONLY pure markdown following the requested schema.`;

    let raw;
    try {
      raw = await ai.complete([
        { role: "system", content: `${CV_SCHEMA_DESCRIPTION}\n\n${MASTER_CV_RULES}` },
        { role: "user", content: `CANDIDATE PROFILE:\n${profileText}` }
      ], { jsonMode: true, temperature: 0.4 });
    } catch (e) {
      return { ok: false, error: aiErrorText(e, "Generation timeout. Try again.") };
    }

    const textContent = sanitizeCvFromAi(raw);
    if (!textContent) {
      console.error("[generateExpertMasterCv] raw:", typeof raw === 'string' ? raw.slice(0, 500) : raw);
      return { ok: false, error: "AI failed to generate a valid CV. Please try again." };
    }

    await prisma.masterCv.create({
      data: {
        profileId: profile.id,
        name: "AI Enhanced Master CV",
        fileName: "Master_CV_Enhanced.pdf",
        fileData: Buffer.alloc(0),
        textContent: textContent,
        cvSectionOrder: ["summary", "skills", "experience", "projects", "education"],
      }
    });

    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Failed to generate Expert CV." };
  }
}
