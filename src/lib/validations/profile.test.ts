import { describe, expect, it } from "vitest";
import { normalizeProfileUrls, profileSchema } from "./profile";

const baseProfile = {
  fullName: "",
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
};

describe("normalizeProfileUrls", () => {
  it("prepends https:// to protocol-less URLs", () => {
    const normalized = normalizeProfileUrls({
      website: "janedoe.dev",
      github: "github.com/janedoe",
      linkedin: "www.linkedin.com/in/jane-doe",
    }) as { website: string; github: string; linkedin: string };

    expect(normalized.website).toBe("https://janedoe.dev");
    expect(normalized.github).toBe("https://github.com/janedoe");
    expect(normalized.linkedin).toBe("https://www.linkedin.com/in/jane-doe");
  });

  it("leaves full URLs and empty values untouched", () => {
    const normalized = normalizeProfileUrls({
      website: "https://janedoe.dev",
      github: "",
      linkedin: null,
      projects: [{ name: "P", url: "http://localhost:3000" }],
      certifications: [{ name: "C", url: "" }],
    }) as {
      website: string;
      github: string;
      linkedin: string | null;
      projects: { url: string }[];
      certifications: { url: string }[];
    };

    expect(normalized.website).toBe("https://janedoe.dev");
    expect(normalized.github).toBe("");
    expect(normalized.linkedin).toBeNull();
    expect(normalized.projects[0].url).toBe("http://localhost:3000");
    expect(normalized.certifications[0].url).toBe("");
  });

  it("makes the schema accept bare domains", () => {
    const result = profileSchema.safeParse(
      normalizeProfileUrls({
        ...baseProfile,
        website: "janedoe.dev",
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe("profileSchema", () => {
  it("accepts a minimal empty profile", () => {
    const result = profileSchema.safeParse(baseProfile);
    expect(result.success).toBe(true);
  });

  it("accepts Date instances for dates (server-action rehydration)", () => {
    const result = profileSchema.safeParse({
      ...baseProfile,
      experiences: [
        {
          company: "Acme",
          title: "Engineer",
          startDate: new Date("2020-01-01T00:00:00Z"),
          endDate: null,
          current: true,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experiences[0].startDate).toBeInstanceOf(Date);
    }
  });

  it("accepts ISO date strings", () => {
    const result = profileSchema.safeParse({
      ...baseProfile,
      certifications: [{ name: "AWS", date: "2023-05-01" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.certifications[0].date).toBeInstanceOf(Date);
    }
  });

  it("rejects invalid dates", () => {
    const result = profileSchema.safeParse({
      ...baseProfile,
      certifications: [{ name: "AWS", date: "not-a-date" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric GPA values", () => {
    const result = profileSchema.safeParse({
      ...baseProfile,
      educations: [{ institution: "MIT", gpa: "excellent" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a zero salary floor and zero years of experience", () => {
    const result = profileSchema.safeParse({
      ...baseProfile,
      skills: [{ name: "Python", years: 0 }],
      preferences: {
        preferredRoles: [],
        locations: [],
        remoteOnly: false,
        salaryFloor: 0,
        minMatchPercent: 0,
      },
    });
    expect(result.success).toBe(true);
  });
});