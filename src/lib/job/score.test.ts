import { describe, expect, it } from "vitest";
import { sanitizeScoreFromAi } from "./score";

describe("sanitizeScoreFromAi", () => {
  it("keeps a valid score as-is", () => {
    const result = sanitizeScoreFromAi({
      matchPercent: 72,
      matchedSkills: ["SQL", "Support"],
      missingSkills: ["AWS"],
      reasoning: "Strong fit on support, gap on AWS.",
      recommendation: "apply",
    });
    expect(result).toEqual({
      matchPercent: 72,
      matchedSkills: ["SQL", "Support"],
      missingSkills: ["AWS"],
      reasoning: "Strong fit on support, gap on AWS.",
      recommendation: "apply",
    });
  });

  it("clamps the percentage to 0-100 and rounds decimals", () => {
    expect(sanitizeScoreFromAi({ matchPercent: 150 })?.matchPercent).toBe(100);
    expect(sanitizeScoreFromAi({ matchPercent: -10 })?.matchPercent).toBe(0);
    expect(sanitizeScoreFromAi({ matchPercent: 72.6 })?.matchPercent).toBe(73);
  });

  it("falls back to 'consider' for a bad recommendation", () => {
    const result = sanitizeScoreFromAi({
      matchPercent: 55,
      recommendation: "maybe",
    });
    expect(result?.recommendation).toBe("consider");
  });

  it("corrects inconsistent recommendation vs score", () => {
    expect(
      sanitizeScoreFromAi({ matchPercent: 85, recommendation: "skip" })
        ?.recommendation,
    ).toBe("apply");
    expect(
      sanitizeScoreFromAi({ matchPercent: 15, recommendation: "apply" })
        ?.recommendation,
    ).toBe("skip");
  });

  it("filters non-string items and caps array size", () => {
    const result = sanitizeScoreFromAi({
      matchedSkills: ["SQL", 42, null, "", "Support"],
      missingSkills: Array.from({ length: 40 }, (_, i) => `s${i}`),
    });
    expect(result?.matchedSkills).toEqual(["SQL", "Support"]);
    expect(result?.missingSkills).toHaveLength(30);
  });

  it("returns null for non-object input", () => {
    expect(sanitizeScoreFromAi(null)).toBeNull();
    expect(sanitizeScoreFromAi("text")).toBeNull();
    expect(sanitizeScoreFromAi([])).toBeNull();
  });

  it("defaults missing reasoning and zero score", () => {
    const result = sanitizeScoreFromAi({});
    expect(result).toEqual({
      matchPercent: 0,
      matchedSkills: [],
      missingSkills: [],
      reasoning: "No reasoning provided.",
      recommendation: "skip",
    });
  });
});
