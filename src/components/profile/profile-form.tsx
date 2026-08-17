"use client";

import { useState, useTransition } from "react";
import { saveProfile } from "@/lib/actions/profile";
import type { ProfileInput } from "@/lib/validations/profile";

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
  skills: { name: string; level: string | null; years: number | null }[];
  experiences: {
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
    institution: string;
    degree: string | null;
    field: string | null;
    startDate: Date | null;
    endDate: Date | null;
    gpa: string | null;
  }[];
  projects: {
    name: string;
    description: string | null;
    url: string | null;
    technologies: string[];
    startDate: Date | null;
    endDate: Date | null;
  }[];
  certifications: {
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

export function ProfileForm({
  profile,
}: {
  profile: ProfileWithRelations | null;
}) {
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
            name: s.name,
            level: s.level,
            years: s.years,
          })),
          experiences: profile.experiences.map((e) => ({
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
            institution: ed.institution,
            degree: ed.degree,
            field: ed.field,
            startDate: ed.startDate,
            endDate: ed.endDate,
            gpa: ed.gpa ?? null,
          })),
          projects: profile.projects.map((p) => ({
            name: p.name,
            description: p.description,
            url: p.url,
            technologies: p.technologies,
            startDate: p.startDate,
            endDate: p.endDate,
          })),
          certifications: profile.certifications.map((c) => ({
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
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveProfile(form);
      if (result.ok) {
        setMessage("Profile saved.");
      } else if ("errors" in result) {
        setMessage("Validation failed — check the highlighted fields.");
      } else {
        setMessage(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Section title="Basics">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name">
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
          <Field label="Email">
            <Input value={form.email ?? ""} onChange={(v) => set("email", v)} />
          </Field>
          <Field label="Website">
            <Input
              value={form.website ?? ""}
              onChange={(v) => set("website", v)}
            />
          </Field>
          <Field label="GitHub">
            <Input value={form.github ?? ""} onChange={(v) => set("github", v)} />
          </Field>
          <Field label="LinkedIn">
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

      <Section title="Skills">
        {form.skills.map((skill, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_80px_36px] gap-2">
            <Input
              value={skill.name}
              onChange={(v) => updateItem("skills", i, { name: v })}
              placeholder="Skill"
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
              className="rounded-md border px-2 text-sm hover:bg-muted"
            >
              ×
            </button>
          </div>
        ))}
        <AddButton onClick={() => set("skills", [...form.skills, { name: "" }])}>
          Add skill
        </AddButton>
      </Section>

      <Section title="Work experience">
        {form.experiences.map((exp, i) => (
          <div key={i} className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Company">
                <Input
                  value={exp.company}
                  onChange={(v) => updateItem("experiences", i, { company: v })}
                />
              </Field>
              <Field label="Title">
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
              Current role
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

      <Section title="Education">
        {form.educations.map((ed, i) => (
          <div key={i} className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Institution">
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
              <Field label="GPA">
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

      <Section title="Projects">
        {form.projects.map((p, i) => (
          <div key={i} className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={p.name}
                  onChange={(v) => updateItem("projects", i, { name: v })}
                />
              </Field>
              <Field label="URL">
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

      <Section title="Certifications">
        {form.certifications.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2">
            <Input
              value={c.name}
              onChange={(v) => updateItem("certifications", i, { name: v })}
              placeholder="Name"
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
            <button
              type="button"
              onClick={() => removeItem("certifications", i)}
              className="rounded-md border px-2 text-sm hover:bg-muted"
            >
              ×
            </button>
          </div>
        ))}
        <AddButton
          onClick={() =>
            set("certifications", [
              ...form.certifications,
              { name: "", issuer: "", url: "", date: null },
            ])
          }
        >
          Add certification
        </AddButton>
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
          Remote only
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

  function updateItem<K extends "skills" | "experiences" | "educations" | "projects" | "certifications">(
    key: K,
    index: number,
    patch: Partial<ProfileInput[K][number]>
  ) {
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
    setForm((f) => ({
      ...f,
      [key]: f[key].filter((_, i) => i !== index),
    }));
  }
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
    />
  );
}

function DateInput({
  value,
  onChange,
  disabled,
}: {
  value: Date | null;
  onChange: (v: Date | null) => void;
  disabled?: boolean;
}) {
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

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-dashed px-3 py-1.5 text-sm hover:bg-muted"
    >
      {children}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
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