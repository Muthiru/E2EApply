import { describe, expect, it } from "vitest";
import { sanitizeJobFromAi } from "./extract";

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