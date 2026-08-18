import { z } from "zod";

const optionalDate = z
  .union([
    z.date(),
    z.string().refine(
      (s) => s === "" || !Number.isNaN(new Date(s).getTime()),
      "Invalid date",
    ),
    z.null(),
    z.undefined(),
  ])
  .transform((v) => {
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    return v ? new Date(v) : null;
  })
  .nullable();

const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Skill name is required"),
  level: z.string().trim().optional().nullable(),
  years: z.number().int().min(0).max(60).optional().nullable(),
});

const experienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().trim().min(1, "Company is required"),
  title: z.string().trim().min(1, "Title is required"),
  location: z.string().trim().optional().nullable(),
  startDate: optionalDate,
  endDate: optionalDate,
  current: z.boolean().optional(),
  description: z.string().trim().optional().nullable(),
  highlights: z.array(z.string().trim()).optional(),
});

const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().trim().min(1, "Institution is required"),
  degree: z.string().trim().optional().nullable(),
  field: z.string().trim().optional().nullable(),
  startDate: optionalDate,
  endDate: optionalDate,
  gpa: z
    .union([z.string(), z.null(), z.undefined()])
    .refine(
      (v) => v === undefined || v === null || v === "" || !Number.isNaN(Number.parseFloat(v)),
      "GPA must be a number"
    )
    .nullable(),
});

const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Project name is required"),
  description: z.string().trim().optional().nullable(),
  url: z.url().trim().optional().nullable(),
  technologies: z.array(z.string().trim()).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
});

const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Certification name is required"),
  issuer: z.string().trim().optional().nullable(),
  date: optionalDate,
  url: z.url().trim().optional().nullable(),
});

const preferencesSchema = z.object({
  preferredRoles: z.array(z.string().trim()),
  locations: z.array(z.string().trim()),
  remoteOnly: z.boolean().optional(),
  salaryFloor: z.number().int().min(0).optional().nullable(),
  minMatchPercent: z.number().int().min(0).max(100).optional().nullable(),
});

export const profileSchema = z.object({
  fullName: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  summary: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.email().trim().optional().nullable().or(z.literal("")),
  website: z.url().trim().optional().nullable().or(z.literal("")),
  github: z.url().trim().optional().nullable().or(z.literal("")),
  linkedin: z.url().trim().optional().nullable().or(z.literal("")),
  skills: z.array(skillSchema),
  experiences: z.array(experienceSchema),
  educations: z.array(educationSchema),
  projects: z.array(projectSchema),
  certifications: z.array(certificationSchema),
  preferences: preferencesSchema,
});

export type ProfileInput = z.infer<typeof profileSchema>;

const withProtocol = (v: unknown): unknown =>
  typeof v === "string" && v.trim() !== "" && !/^https?:\/\//i.test(v.trim())
    ? `https://${v.trim()}`
    : v;

export function normalizeProfileUrls(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;

  const out: Record<string, unknown> = { ...(input as Record<string, unknown>) };

  for (const key of ["website", "github", "linkedin"] as const) {
    out[key] = withProtocol(out[key]);
  }

  for (const key of ["projects", "certifications"] as const) {
    if (Array.isArray(out[key])) {
      out[key] = out[key].map((item) =>
        item && typeof item === "object"
          ? { ...(item as Record<string, unknown>), url: withProtocol((item as Record<string, unknown>).url) }
          : item,
      );
    }
  }

  return out;
}
