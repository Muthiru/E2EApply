import { describe, expect, it } from "vitest";
import { enrichFromText, extractJson, sanitizeParsedProfile } from "./sanitize";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("extracts JSON from surrounding commentary", () => {
    expect(extractJson('Here you go: {"a": 1} hope that helps')).toEqual({
      a: 1,
    });
  });

  it("returns null for non-JSON", () => {
    expect(extractJson("no json here")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(extractJson("   ")).toBeNull();
  });
});

describe("enrichFromText", () => {
  const cv = `Jane Doe
    janedoe@gmail.com
    linkedin.com/in/jane-doe
    github.com/janedoe
    https://janedoe.dev`;

  it("fills missing email, linkedin, github, and website", () => {
    const result = enrichFromText({}, cv);
    expect(result.email).toBe("janedoe@gmail.com");
    expect(result.linkedin).toBe("https://www.linkedin.com/in/jane-doe");
    expect(result.github).toBe("https://github.com/janedoe");
    expect(result.website).toBe("https://janedoe.dev");
  });

  it("does not override AI-extracted values", () => {
    const result = enrichFromText(
      { email: "ai@example.com", linkedin: "https://linkedin.com/in/ai-user" },
      cv,
    );
    expect(result.email).toBe("ai@example.com");
    expect(result.linkedin).toBe("https://linkedin.com/in/ai-user");
    expect(result.github).toBe("https://github.com/janedoe");
  });

  it("ignores linkedin/github links for the website field", () => {
    const result = enrichFromText({}, "linkedin.com/in/jane-doe github.com/janedoe");
    expect(result.website).toBeUndefined();
    expect(result.linkedin).toBe("https://www.linkedin.com/in/jane-doe");
  });
});

describe("sanitizeParsedProfile", () => {
  it("keeps valid entries and drops invalid ones", () => {
    const result = sanitizeParsedProfile({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      skills: [
        { name: "Python", level: "Expert", years: 5 },
        { name: "" },
        "not-an-object",
      ],
      experiences: [
        { company: "Analytical Engines", title: "Programmer" },
        { company: "Babbage & Co", title: "" },
      ],
      projects: [{ name: "The Analytical Engine" }, {}],
    });

    expect(result.fullName).toBe("Ada Lovelace");
    expect(result.email).toBe("ada@example.com");
    expect(result.skills).toEqual([{ name: "Python", level: "Expert", years: 5 }]);
    expect(result.experiences).toEqual([
      {
        company: "Analytical Engines",
        title: "Programmer",
        location: null,
        startDate: null,
        endDate: null,
        current: false,
        description: null,
        highlights: [],
      },
    ]);
    expect(result.projects).toEqual([
      {
        name: "The Analytical Engine",
        description: null,
        url: null,
        technologies: [],
        startDate: null,
        endDate: null,
      },
    ]);
  });

  it("marks current experiences and drops their end date", () => {
    const result = sanitizeParsedProfile({
      experiences: [
        {
          company: "Acme",
          title: "Engineer",
          startDate: "2020-01-01",
          endDate: "Present",
          current: true,
        },
      ],
    });

    expect(result.experiences?.[0]).toMatchObject({
      current: true,
      startDate: "2020-01-01",
      endDate: null,
    });
  });

  it("rejects malformed dates", () => {
    const result = sanitizeParsedProfile({
      experiences: [
        {
          company: "Acme",
          title: "Engineer",
          startDate: "January 2020",
          current: false,
        },
      ],
    });

    expect(result.experiences?.[0].startDate).toBeNull();
  });

  it("returns an empty profile for garbage input", () => {
    expect(sanitizeParsedProfile("garbage")).toEqual({});
    expect(sanitizeParsedProfile(null)).toEqual({});
  });
});