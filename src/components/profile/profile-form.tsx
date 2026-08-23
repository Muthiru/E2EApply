"use client";

import { useState, useTransition } from "react";
import { saveProfile } from "@/lib/actions/profile";
import type { ProfileInput } from "@/lib/validations/profile";
import { CvUpload } from "./cv-upload";
import { CertificateImport } from "./certificate-import";
import type { CvParsedProfile } from "@/lib/cv/types";

const cvDate = (v: string | null | undefined): Date | null =>
  v ? new Date(`${v}T00:00:00`) : null;

type ProfileWithRelations = {
  fullName: string | null;
  title: string | null;
  summary: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  github: string | null;
  githubToken: string | null;
  linkedin: string | null;
  skills: { id: string; name: string; level: string | null; years: number | null }[];
  experiences: {
    id: string;
    company: string;
    title: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
    current: boolean;
    description: string | null;
    highlights: string[];
  }[];
  educations: {
    id: string;
    institution: string;
    degree: string | null;
    field: string | null;
    startDate: Date | null;
    endDate: Date | null;
    gpa: string | null;
  }[];
  projects: {
    id: string;
    name: string;
    description: string | null;
    url: string | null;
    technologies: string[];
    startDate: Date | null;
    endDate: Date | null;
  }[];
  certifications: {
    id: string;
    name: string;
    issuer: string | null;
    date: Date | null;
    url: string | null;
  }[];
  preferences: {
    preferredRoles: string[];
    locations: string[];
    remoteOnly: boolean;
    salaryFloor: number | null;
    minMatchPercent: number | null;
  } | null;
};

const toDateInput = (d: Date | null) => {
  if (!d) return "";
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toIntOrNull = (v: string) => {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
};

const splitList = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function ProfileForm(props: Readonly<{
  profile: ProfileWithRelations | null;
}>) {
  const { profile } = props;
  const [form, setForm] = useState<ProfileInput>(() =>
    profile
      ? {
        fullName: profile.fullName,
        title: profile.title,
        summary: profile.summary,
        location: profile.location,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        github: profile.github,
        githubToken: profile.githubToken,
        linkedin: profile.linkedin,
        skills: profile.skills.map((s) => ({
          id: s.id,
          name: s.name,
          level: s.level,
          years: s.years,
        })),
        experiences: profile.experiences.map((e) => ({
          id: e.id,
          company: e.company,
          title: e.title,
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
          current: e.current,
          description: e.description,
          highlights: e.highlights,
        })),
        educations: profile.educations.map((ed) => ({
          id: ed.id,
          institution: ed.institution,
          degree: ed.degree,
          field: ed.field,
          startDate: ed.startDate,
          endDate: ed.endDate,
          gpa: ed.gpa ?? null,
        })),
        projects: profile.projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          url: p.url,
          technologies: p.technologies,
          startDate: p.startDate,
          endDate: p.endDate,
        })),
        certifications: profile.certifications.map((c) => ({
          id: c.id,
          name: c.name,
          issuer: c.issuer,
          date: c.date,
          url: c.url,
        })),
        preferences: profile.preferences
          ? {
            preferredRoles: profile.preferences.preferredRoles,
            locations: profile.preferences.locations,
            remoteOnly: profile.preferences.remoteOnly,
            salaryFloor: profile.preferences.salaryFloor,
            minMatchPercent: profile.preferences.minMatchPercent,
          }
          : {
            preferredRoles: [],
            locations: [],
            remoteOnly: false,
            salaryFloor: null,
            minMatchPercent: null,
          },
      }
      : {
        fullName: "",
        title: "",
        summary: "",
        location: "",
        phone: "",
        email: "",
        website: "",
        github: "",
        linkedin: "",
        skills: [],
        experiences: [],
        educations: [],
        projects: [],
        certifications: [],
        preferences: {
          preferredRoles: [],
          locations: [],
          remoteOnly: false,
          salaryFloor: null,
          minMatchPercent: null,
        },
      }
  );
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const err = (path: string) => errors[path];

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setErrors({});
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveProfile(form);
      if (result.ok) {
        setErrors({});
        setMessage("Profile saved.");
      } else if ("errors" in result) {
        setErrors(
          Object.fromEntries(
            Object.entries(result.errors)
              .map(([path, messages]) => [path, messages[0] ?? ""])
              .filter(([, text]) => text !== ""),
          ),
        );
        setMessage("Validation failed — fix the highlighted fields.");
      } else {
        setErrors({});
        setMessage(result.error);
      }
    });
  };

  function sectionHas(prefix: string) {
    return Object.keys(errors).some(
      (key) => key === prefix || key.startsWith(`${prefix}.`),
    );
  }

  return (
    <div className="space-y-8">
      <CvUpload onParsed={mergeParsed} />

      <Section title="Basics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" error={err("fullName")} required>
            <Input
              value={form.fullName ?? ""}
              onChange={(v) => set("fullName", v)}
              placeholder="John Doe"
            />
          </Field>
          <Field label="Current title">
            <Input value={form.title ?? ""} onChange={(v) => set("title", v)} placeholder="Senior Software Engineer" />
          </Field>
          <Field label="Location">
            <Input
              value={form.location ?? ""}
              onChange={(v) => set("location", v)}
              placeholder="San Francisco, CA"
            />
          </Field>
          <Field label="Phone">
            <Input value={form.phone ?? ""} onChange={(v) => set("phone", v)} placeholder="+1 (555) 123-4567" />
          </Field>
          <Field label="Email" error={err("email")} required>
            <Input value={form.email ?? ""} onChange={(v) => set("email", v)} placeholder="john@example.com" type="email" />
          </Field>
          <Field label="Website" error={err("website")}>
            <Input
              value={form.website ?? ""}
              onChange={(v) => set("website", v)}
              placeholder="https://yourwebsite.com"
            />
          </Field>
          <Field label="GitHub URL" error={err("github")}>
            <Input value={form.github ?? ""} onChange={(v) => set("github", v)} placeholder="https://github.com/username" />
          </Field>
          <Field label="GitHub PAT (read-only)" error={err("githubToken")}>
            <Input
              value={form.githubToken ?? ""}
              onChange={(v) => set("githubToken", v)}
              type="password"
              placeholder="ghp_..."
            />
          </Field>
          <Field label="LinkedIn" error={err("linkedin")}>
            <Input
              value={form.linkedin ?? ""}
              onChange={(v) => set("linkedin", v)}
              placeholder="https://linkedin.com/in/username"
            />
          </Field>
        </div>
      </Section>

      <Section title="Summary">
        <textarea
          value={form.summary ?? ""}
          onChange={(e) => set("summary", e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="2–4 sentences covering who you are and what you're looking for."
        />
      </Section>

      <Section title="Skills" error={sectionHas("skills")}>
        {form.skills.map((skill, i) => (
          <div key={skill.id ?? i} className="grid grid-cols-[1fr_1fr_100px_40px] gap-3">
            <Input
              value={skill.name}
              onChange={(v) => updateItem("skills", i, { name: v })}
              placeholder="Skill (e.g., JavaScript)"
              error={err(`skills.${i}.name`)}
            />
            <Input
              value={skill.level ?? ""}
              onChange={(v) => updateItem("skills", i, { level: v })}
              placeholder="Level (e.g., Advanced)"
            />
            <Input
              value={skill.years === null ? "" : String(skill.years)}
              onChange={(v) =>
                updateItem("skills", i, { years: toIntOrNull(v) })
              }
              placeholder="Years"
              type="number"
            />
            <button
              type="button"
              onClick={() => removeItem("skills", i)}
              className="flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-error hover:text-error transition-colors"
              aria-label="Remove skill"
            >
              ✕
            </button>
          </div>
        ))}
        <AddButton onClick={() => set("skills", [...form.skills, { id: crypto.randomUUID(), name: "" }])}>
          Add skill
        </AddButton>
      </Section>

      <Section title="Work experience" error={sectionHas("experiences")}>
        {form.experiences.map((exp, i) => (
          <div key={exp.id ?? i} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company" error={err(`experiences.${i}.company`)} required>
                <Input
                  value={exp.company}
                  onChange={(v) => updateItem("experiences", i, { company: v })}
                  placeholder="Company name"
                />
              </Field>
              <Field label="Title" error={err(`experiences.${i}.title`)} required>
                <Input
                  value={exp.title}
                  onChange={(v) => updateItem("experiences", i, { title: v })}
                  placeholder="Job title"
                />
              </Field>
              <Field label="Location">
                <Input
                  value={exp.location ?? ""}
                  onChange={(v) => updateItem("experiences", i, { location: v })}
                  placeholder="City, Country"
                />
              </Field>
              <div className="flex items-end gap-3">
                <Field label="Start date">
                  <DateInput
                    value={exp.startDate}
                    onChange={(v) => updateItem("experiences", i, { startDate: v })}
                  />
                </Field>
                <Field label="End date">
                  <DateInput
                    value={exp.endDate}
                    disabled={exp.current}
                    onChange={(v) => updateItem("experiences", i, { endDate: v })}
                  />
                </Field>
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={exp.current}
                onChange={(e) =>
                  updateItem("experiences", i, {
                    current: e.target.checked,
                    endDate: null,
                  })
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-foreground">Current role</span>
            </label>
            <Field label="Description">
              <textarea
                value={exp.description ?? ""}
                onChange={(e) =>
                  updateItem("experiences", i, { description: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Describe your responsibilities and achievements..."
              />
            </Field>
            <Field label="Highlights (comma-separated)">
              <Input
                value={(exp.highlights ?? []).join(", ")}
                onChange={(v) =>
                  updateItem("experiences", i, {
                    highlights: splitList(v),
                  })
                }
                placeholder="Led team, improved performance, etc."
              />
            </Field>
            <RemoveButton onClick={() => removeItem("experiences", i)} />
          </div>
        ))}
        <AddButton
          onClick={() =>
            set("experiences", [
              ...form.experiences,
              {
                id: crypto.randomUUID(),
                company: "",
                title: "",
                location: "",
                startDate: null,
                endDate: null,
                current: false,
                description: "",
                highlights: [],
              },
            ])
          }
        >
          Add experience
        </AddButton>
      </Section>

      <Section title="Education" error={sectionHas("educations")}>
        {form.educations.map((ed, i) => (
          <div key={ed.id ?? i} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Institution" error={err(`educations.${i}.institution`)} required>
                <Input
                  value={ed.institution}
                  onChange={(v) => updateItem("educations", i, { institution: v })}
                  placeholder="University name"
                />
              </Field>
              <Field label="Degree">
                <Input
                  value={ed.degree ?? ""}
                  onChange={(v) => updateItem("educations", i, { degree: v })}
                  placeholder="Bachelor's, Master's, PhD"
                />
              </Field>
              <Field label="Field of study">
                <Input
                  value={ed.field ?? ""}
                  onChange={(v) => updateItem("educations", i, { field: v })}
                  placeholder="Computer Science, etc."
                />
              </Field>
              <Field label="GPA" error={err(`educations.${i}.gpa`)}>
                <Input
                  value={ed.gpa ?? ""}
                  onChange={(v) => updateItem("educations", i, { gpa: v })}
                  placeholder="3.5"
                />
              </Field>
              <Field label="Start date">
                <DateInput
                  value={ed.startDate}
                  onChange={(v) => updateItem("educations", i, { startDate: v })}
                />
              </Field>
              <Field label="End date">
                <DateInput
                  value={ed.endDate}
                  onChange={(v) => updateItem("educations", i, { endDate: v })}
                />
              </Field>
            </div>
            <RemoveButton onClick={() => removeItem("educations", i)} />
          </div>
        ))}
        <AddButton
          onClick={() =>
            set("educations", [
              ...form.educations,
              {
                id: crypto.randomUUID(),
                institution: "",
                degree: "",
                field: "",
                startDate: null,
                endDate: null,
                gpa: null,
              },
            ])
          }
        >
          Add education
        </AddButton>
      </Section>

      <Section title="Projects" error={sectionHas("projects")}>
        {form.projects.map((p, i) => (
          <div key={p.id ?? i} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Project name" error={err(`projects.${i}.name`)} required>
                <Input
                  value={p.name}
                  onChange={(v) => updateItem("projects", i, { name: v })}
                  placeholder="My Awesome Project"
                />
              </Field>
              <Field label="Project URL" error={err(`projects.${i}.url`)}>
                <Input
                  value={p.url ?? ""}
                  onChange={(v) => updateItem("projects", i, { url: v })}
                  placeholder="https://github.com/username/project"
                />
              </Field>
              <Field label="Technologies (comma-separated)">
                <Input
                  value={(p.technologies ?? []).join(", ")}
                  onChange={(v) =>
                    updateItem("projects", i, {
                      technologies: splitList(v),
                    })
                  }
                  placeholder="React, TypeScript, Node.js"
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={p.description ?? ""}
                onChange={(e) =>
                  updateItem("projects", i, { description: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Describe what you built and your role..."
              />
            </Field>
            <RemoveButton onClick={() => removeItem("projects", i)} />
          </div>
        ))}
        <AddButton
          onClick={() =>
            set("projects", [
              ...form.projects,
              {
                id: crypto.randomUUID(),
                name: "",
                description: "",
                url: "",
                technologies: [],
                startDate: null,
                endDate: null,
              },
            ])
          }
        >
          Add project
        </AddButton>
      </Section>

      <Section title="Certifications" error={sectionHas("certifications")}>
        {form.certifications.map((c, i) => (
          <div
            key={c.id ?? i}
            className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_40px]"
          >
            <Input
              value={c.name}
              onChange={(v) => updateItem("certifications", i, { name: v })}
              placeholder="Certification name"
              error={err(`certifications.${i}.name`)}
            />
            <Input
              value={c.issuer ?? ""}
              onChange={(v) => updateItem("certifications", i, { issuer: v })}
              placeholder="Issuing organization"
            />
            <Input
              value={c.url ?? ""}
              onChange={(v) => updateItem("certifications", i, { url: v })}
              placeholder="Certificate URL"
            />
            <Input
              type="date"
              value={toDateInput(c.date)}
              onChange={(v) =>
                updateItem("certifications", i, { date: cvDate(v) })
              }
            />
            <button
              type="button"
              onClick={() => removeItem("certifications", i)}
              className="flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-error hover:text-error transition-colors"
              aria-label="Remove certification"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <AddButton
            onClick={() =>
              set("certifications", [
                ...form.certifications,
                { name: "", issuer: "", url: "", date: null, id: crypto.randomUUID() },
              ])
            }
          >
            Add certification
          </AddButton>
          <CertificateImport
            onImported={(certificate) =>
              set("certifications", [
                ...form.certifications,
                {
                  id: crypto.randomUUID(),
                  name: certificate.name,
                  issuer: certificate.issuer,
                  date: cvDate(certificate.date),
                  url: certificate.url,
                },
              ])
            }
          />
        </div>
      </Section>

      <Section title="Job search preferences">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Preferred roles (comma-separated)">
            <Input
              value={form.preferences.preferredRoles.join(", ")}
              onChange={(v) =>
                set("preferences", {
                  ...form.preferences,
                  preferredRoles: splitList(v),
                })
              }
              placeholder="Senior Engineer, Tech Lead, etc."
            />
          </Field>
          <Field label="Locations (comma-separated)">
            <Input
              value={form.preferences.locations.join(", ")}
              onChange={(v) =>
                set("preferences", {
                  ...form.preferences,
                  locations: splitList(v),
                })
              }
              placeholder="San Francisco, London, Remote"
            />
          </Field>
          <Field label="Salary floor ($/yr)">
            <Input
              value={form.preferences.salaryFloor === null ? "" : String(form.preferences.salaryFloor)}
              onChange={(v) =>
                set("preferences", {
                  ...form.preferences,
                  salaryFloor: toIntOrNull(v),
                })
              }
              type="number"
              placeholder="150000"
            />
          </Field>
          <Field label="Min match % to apply">
            <Input
              value={form.preferences.minMatchPercent === null ? "" : String(form.preferences.minMatchPercent)}
              onChange={(v) =>
                set("preferences", {
                  ...form.preferences,
                  minMatchPercent: toIntOrNull(v),
                })
              }
              type="number"
              placeholder="70"
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm cursor-pointer mt-4">
          <input
            type="checkbox"
            checked={form.preferences.remoteOnly}
            onChange={(e) =>
              set("preferences", {
                ...form.preferences,
                remoteOnly: e.target.checked,
              })
            }
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground">Remote only</span>
        </label>
      </Section>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border py-4 flex items-center justify-end gap-3">
        {message && (
          <span
            role="status"
            aria-live="polite"
            className={`text-sm ${message.includes("failed") ? "text-error" : "text-success"}`}
          >
            {message}
          </span>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] shadow-md hover:shadow-lg transition-all"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⟳</span>
              Saving…
            </span>
          ) : (
            "Save profile"
          )}
        </button>
      </div>
    </div>
  );

  function mergeParsed(parsed: CvParsedProfile) {
    setForm((f) => {
      const next = { ...f };

      for (const key of [
        "fullName",
        "title",
        "summary",
        "location",
        "phone",
        "email",
        "website",
        "github",
        "linkedin",
      ] as const) {
        const value = parsed[key];
        if (typeof value === "string" && value.trim() !== "") {
          next[key] = value;
        }
      }

      if (parsed.skills?.length) {
        next.skills = parsed.skills.map((s) => ({
          id: crypto.randomUUID(),
          name: s.name,
          level: s.level ?? null,
          years: s.years ?? null,
        }));
      }

      if (parsed.experiences?.length) {
        next.experiences = parsed.experiences.map((e) => ({
          id: crypto.randomUUID(),
          company: e.company ?? "",
          title: e.title ?? "",
          location: e.location ?? "",
          startDate: cvDate(e.startDate),
          endDate: e.current ? null : cvDate(e.endDate),
          current: e.current ?? false,
          description: e.description ?? "",
          highlights: e.highlights ?? [],
        }));
      }

      if (parsed.educations?.length) {
        next.educations = parsed.educations.map((ed) => ({
          id: crypto.randomUUID(),
          institution: ed.institution ?? "",
          degree: ed.degree ?? "",
          field: ed.field ?? "",
          startDate: cvDate(ed.startDate),
          endDate: cvDate(ed.endDate),
          gpa: ed.gpa ?? null,
        }));
      }

      if (parsed.projects?.length) {
        next.projects = parsed.projects.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name ?? "",
          description: p.description ?? "",
          url: p.url ?? "",
          technologies: p.technologies ?? [],
          startDate: cvDate(p.startDate),
          endDate: cvDate(p.endDate),
        }));
      }

      if (parsed.certifications?.length) {
        next.certifications = parsed.certifications.map((c) => ({
          id: crypto.randomUUID(),
          name: c.name ?? "",
          issuer: c.issuer ?? "",
          date: cvDate(c.date),
          url: c.url ?? "",
        }));
      }

      return next;
    });
  }

  function updateItem<K extends "skills" | "experiences" | "educations" | "projects" | "certifications">(
    key: K,
    index: number,
    patch: Partial<ProfileInput[K][number]>
  ) {
    setErrors({});
    setForm((f) => ({
      ...f,
      [key]: f[key].map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  }

  function removeItem<
    K extends "skills" | "experiences" | "educations" | "projects" | "certifications"
  >(key: K, index: number) {
    setErrors({});
    setForm((f) => ({
      ...f,
      [key]: f[key].filter((_, i) => i !== index),
    }));
  }
}

function Section(props: Readonly<{
  title: string;
  children: React.ReactNode;
  error?: boolean;
}>) {
  const { title, children, error } = props;
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className={`text-lg font-semibold ${error ? "text-error" : "text-foreground"}`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field(props: Readonly<{
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}>) {
  const { label, children, error, required } = props;
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-error">{error}</span>}
    </label>
  );
}

function Input(props: Readonly<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  error?: string;
}>) {
  const { value, onChange, placeholder, type = "text", disabled, error } = props;
  return (
    <div className="space-y-1">
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-error focus:ring-error/20" : "border-border bg-background"
        }`}
      />
      {error && <span className="block text-xs text-error">{error}</span>}
    </div>
  );
}

function DateInput(props: Readonly<{
  value: Date | null;
  onChange: (v: Date | null) => void;
  disabled?: boolean;
}>) {
  const { value, onChange, disabled } = props;
  return (
    <input
      type="date"
      value={toDateInput(value)}
      disabled={disabled}
      onChange={(e) =>
        onChange(e.target.value ? new Date(e.target.value) : null)
      }
      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

function AddButton(props: Readonly<{
  onClick: () => void;
  children: React.ReactNode;
}>) {
  const { onClick, children } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary/5"
    >
      <span className="text-lg">+</span>
      {children}
    </button>
  );
}

function RemoveButton(props: Readonly<{ onClick: () => void }>) {
  const { onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-muted-foreground hover:text-error transition-colors underline-offset-2 hover:underline"
    >
      Remove
    </button>
  );
}