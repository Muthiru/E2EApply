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
    <div className="space-y-6">
      <CvUpload onParsed={mergeParsed} />

      <Section title="Basics">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name" error={err("fullName")}>
            <Input
              value={form.fullName ?? ""}
              onChange={(v) => set("fullName", v)}
            />
          </Field>
          <Field label="Current title">
            <Input value={form.title ?? ""} onChange={(v) => set("title", v)} />
          </Field>
          <Field label="Location">
            <Input
              value={form.location ?? ""}
              onChange={(v) => set("location", v)}
            />
          </Field>
          <Field label="Phone">
            <Input value={form.phone ?? ""} onChange={(v) => set("phone", v)} />
          </Field>
          <Field label="Email" error={err("email")}>
            <Input value={form.email ?? ""} onChange={(v) => set("email", v)} />
          </Field>
          <Field label="Website" error={err("website")}>
            <Input
              value={form.website ?? ""}
              onChange={(v) => set("website", v)}
            />
          </Field>
          <Field label="GitHub" error={err("github")}>
            <Input value={form.github ?? ""} onChange={(v) => set("github", v)} />
          </Field>
          <Field label="LinkedIn" error={err("linkedin")}>
            <Input
              value={form.linkedin ?? ""}
              onChange={(v) => set("linkedin", v)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Summary">
        <textarea
          value={form.summary ?? ""}
          onChange={(e) => set("summary", e.target.value)}
          rows={5}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="2–4 sentences covering who you are and what you're looking for."
        />
      </Section>

      <Section title="Skills" error={sectionHas("skills")}>
        {form.skills.map((skill, i) => (
          <div key={skill.id ?? i} className="grid grid-cols-[1fr_1fr_80px_36px] gap-2">
            <Input
              value={skill.name}
              onChange={(v) => updateItem("skills", i, { name: v })}
              placeholder="Skill"
              error={err(`skills.${i}.name`)}
            />
            <Input
              value={skill.level ?? ""}
              onChange={(v) => updateItem("skills", i, { level: v })}
              placeholder="Level (optional)"
            />
            <Input
              value={skill.years === null ? "" : String(skill.years)}
              onChange={(v) =>
                updateItem("skills", i, { years: toIntOrNull(v) })
              }
              placeholder="Yrs"
              type="number"
            />
            <button
              type="button"
              onClick={() => removeItem("skills", i)}
              className="rounded-md border px-2 text-sm hover:border-foreground/50"
            >
              ×
            </button>
          </div>
        ))}
        <AddButton onClick={() => set("skills", [...form.skills, { id: crypto.randomUUID(), name: "" }])}>
          Add skill
        </AddButton>
      </Section>

      <Section title="Work experience" error={sectionHas("experiences")}>
        {form.experiences.map((exp, i) => (
          <div key={exp.id ?? i} className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Company" error={err(`experiences.${i}.company`)}>
                <Input
                  value={exp.company}
                  onChange={(v) => updateItem("experiences", i, { company: v })}
                />
              </Field>
              <Field label="Title" error={err(`experiences.${i}.title`)}>
                <Input
                  value={exp.title}
                  onChange={(v) => updateItem("experiences", i, { title: v })}
                />
              </Field>
              <Field label="Location">
                <Input
                  value={exp.location ?? ""}
                  onChange={(v) => updateItem("experiences", i, { location: v })}
                />
              </Field>
              <div className="flex items-end gap-3">
                <Field label="Start">
                  <DateInput
                    value={exp.startDate}
                    onChange={(v) => updateItem("experiences", i, { startDate: v })}
                  />
                </Field>
                <Field label="End">
                  <DateInput
                    value={exp.endDate}
                    disabled={exp.current}
                    onChange={(v) => updateItem("experiences", i, { endDate: v })}
                  />
                </Field>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={exp.current}
                onChange={(e) =>
                  updateItem("experiences", i, {
                    current: e.target.checked,
                    endDate: null,
                  })
                }
              />
              {" "}Current role
            </label>
            <textarea
              value={exp.description ?? ""}
              onChange={(e) =>
                updateItem("experiences", i, { description: e.target.value })
              }
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Description"
            />
            <Field label="Highlights (comma-separated)">
              <Input
                value={(exp.highlights ?? []).join(", ")}
                onChange={(v) =>
                  updateItem("experiences", i, {
                    highlights: splitList(v),
                  })
                }
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
          <div key={ed.id ?? i} className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Institution" error={err(`educations.${i}.institution`)}>
                <Input
                  value={ed.institution}
                  onChange={(v) => updateItem("educations", i, { institution: v })}
                />
              </Field>
              <Field label="Degree">
                <Input
                  value={ed.degree ?? ""}
                  onChange={(v) => updateItem("educations", i, { degree: v })}
                />
              </Field>
              <Field label="Field">
                <Input
                  value={ed.field ?? ""}
                  onChange={(v) => updateItem("educations", i, { field: v })}
                />
              </Field>
              <Field label="GPA" error={err(`educations.${i}.gpa`)}>
                <Input
                  value={ed.gpa ?? ""}
                  onChange={(v) => updateItem("educations", i, { gpa: v })}
                />
              </Field>
              <Field label="Start">
                <DateInput
                  value={ed.startDate}
                  onChange={(v) => updateItem("educations", i, { startDate: v })}
                />
              </Field>
              <Field label="End">
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
          <div key={p.id ?? i} className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" error={err(`projects.${i}.name`)}>
                <Input
                  value={p.name}
                  onChange={(v) => updateItem("projects", i, { name: v })}
                />
              </Field>
              <Field label="URL" error={err(`projects.${i}.url`)}>
                <Input
                  value={p.url ?? ""}
                  onChange={(v) => updateItem("projects", i, { url: v })}
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
                />
              </Field>
            </div>
            <textarea
              value={p.description ?? ""}
              onChange={(e) =>
                updateItem("projects", i, { description: e.target.value })
              }
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Description"
            />
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
            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_36px]"
          >
            <Input
              value={c.name}
              onChange={(v) => updateItem("certifications", i, { name: v })}
              placeholder="Name"
              error={err(`certifications.${i}.name`)}
            />
            <Input
              value={c.issuer ?? ""}
              onChange={(v) => updateItem("certifications", i, { issuer: v })}
              placeholder="Issuer"
            />
            <Input
              value={c.url ?? ""}
              onChange={(v) => updateItem("certifications", i, { url: v })}
              placeholder="URL"
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
              className="rounded-md border px-2 text-sm hover:border-foreground/50"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Preferred roles (comma-separated)">
            <Input
              value={form.preferences.preferredRoles.join(", ")}
              onChange={(v) =>
                set("preferences", {
                  ...form.preferences,
                  preferredRoles: splitList(v),
                })
              }
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
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.preferences.remoteOnly}
            onChange={(e) =>
              set("preferences", {
                ...form.preferences,
                remoteOnly: e.target.checked,
              })
            }
          />
          {" "}Remote only
        </label>
      </Section>

      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {message && (
          <span
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            {message}
          </span>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save profile"}
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
    <section className="space-y-3 rounded-lg border p-5">
      <h2 className={error ? "font-semibold text-status-rejected" : "font-semibold"}>
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
}>) {
  const { label, children, error } = props;
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="block text-xs text-status-rejected">{error}</span>}
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
        className={`w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50 ${
          error ? "border-status-rejected" : ""
        }`}
      />
      {error && <span className="block text-xs text-status-rejected">{error}</span>}
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
      className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
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
      className="rounded-md border border-dashed px-3 py-1.5 text-sm hover:border-foreground/50"
    >
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
      className="text-xs text-muted-foreground underline hover:text-foreground"
    >
      Remove
    </button>
  );
}