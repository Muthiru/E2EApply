import { describe, expect, it } from "vitest";
import { hasJobPostingEvidence, sanitizeJobFromAi } from "./extract";

describe("hasJobPostingEvidence", () => {
  it("accepts text containing hiring and qualification signals", () => {
    expect(
      hasJobPostingEvidence(
        "We are hiring a Full Stack Developer. Responsibilities include building web applications. Requirements: experience with TypeScript. Apply today.",
      ),
    ).toBe(true);
  });

  it("rejects portfolio and personal website content", () => {
    expect(
      hasJobPostingEvidence(
        "Full Stack Developer portfolio. About me, my projects, and the technologies I use to build websites.",
      ),
    ).toBe(false);
  });

  it("rejects short or non-job text", () => {
    expect(hasJobPostingEvidence("Full Stack Developer and software projects")).toBe(false);
  });
});

describe("sanitizeJobFromAi", () => {
  it("extracts a valid job", () => {
    const result = sanitizeJobFromAi({
      title: "Senior Engineer",
      company: "Acme",
      location: "Remote",
      description: "Build things.",
      requirements: "TypeScript\nNode",
      salaryMin: 100000,
      salaryMax: 150000,
      sourceUrl: "https://acme.example/jobs/1",
    });

    expect(result).toEqual({
      title: "Senior Engineer",
      company: "Acme",
      location: "Remote",
      description: "Build things.",
      requirements: "TypeScript\nNode",
      salaryMin: 100000,
      salaryMax: 150000,
      sourceUrl: "https://acme.example/jobs/1",
    });
  });

  it("returns null without a title", () => {
    expect(sanitizeJobFromAi({ company: "Acme" })).toBeNull();
    expect(sanitizeJobFromAi("garbage")).toBeNull();
    expect(sanitizeJobFromAi(null)).toBeNull();
  });

  it("rejects inverted salary bounds", () => {
    const result = sanitizeJobFromAi({
      title: "Dev",
      salaryMin: 200,
      salaryMax: 100,
    });
    expect(result?.salaryMin).toBeNull();
    expect(result?.salaryMax).toBeNull();
  });

  it("keeps nulls for missing values", () => {
    const result = sanitizeJobFromAi({ title: "Dev" });
    expect(result).toMatchObject({
      company: null,
      location: null,
      description: null,
      requirements: null,
      salaryMin: null,
      salaryMax: null,
      sourceUrl: null,
    });
  });
});