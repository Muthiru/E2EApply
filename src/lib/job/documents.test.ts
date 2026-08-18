import { describe, expect, it } from "vitest";
import {
  cvBulletContent,
  extractMasterCvContactBlock,
  isCvBulletLine,
  linkHref,
  sanitizeCoverLetterFromAi,
  sanitizeCvFromAi,
  splitCvSections,
  stripMasterCvContactBlock,
} from "./documents";

const validCv = `## Summary
2nd-level IT support specialist with 4 years of transport operations experience, skilled in SQL and root-cause analysis.

## Skills
- SQL
- Root cause analysis
- IT support

## Experience
- Provided 2nd level support for road transport applications at DSV
- Maintained technical documentation

## Education
BSc in Information Technology`;

describe("sanitizeCvFromAi", () => {
  it("keeps a valid markdown CV", () => {
    const result = sanitizeCvFromAi(validCv);
    expect(result).toBe(validCv.trim());
  });

  it("rejects non-strings", () => {
    expect(sanitizeCvFromAi(null)).toBeNull();
    expect(sanitizeCvFromAi({ summary: "x" })).toBeNull();
  });

  it("rejects text without section headings", () => {
    expect(sanitizeCvFromAi("plain text without any heading markers here")).toBeNull();
  });

  it("caps length at 12000 chars", () => {
    const long = `${validCv}\n${"x".repeat(12_000)}`;
    expect(sanitizeCvFromAi(long)?.length).toBe(12_000);
  });

  it("unwraps a JSON-encoded string", () => {
    const wrapped = JSON.stringify(validCv);
    expect(sanitizeCvFromAi(wrapped)).toBe(validCv.trim());
  });

  it("extracts the cv field from a JSON object", () => {
    const result = sanitizeCvFromAi(JSON.stringify({ cv: validCv }));
    expect(result).toBe(validCv.trim());
  });
});

describe("sanitizeCoverLetterFromAi", () => {
  it("keeps a valid letter", () => {
    const letter =
      "I am applying for the 2nd Level Support Specialist role at DSV. My experience in transport operations and SQL directly matches your requirements. I look forward to discussing how I can contribute.";
    expect(sanitizeCoverLetterFromAi(letter)).toBe(letter);
  });

  it("extracts the cover_letter field from a JSON object", () => {
    const letter =
      "I am applying for the 2nd Level Support Specialist role at DSV. My experience in transport operations and SQL directly matches your requirements.";
    const result = sanitizeCoverLetterFromAi(
      JSON.stringify({ cover_letter: letter }),
    );
    expect(result).toBe(letter);
  });

  it("rejects short or non-string input", () => {
    expect(sanitizeCoverLetterFromAi("too short")).toBeNull();
    expect(sanitizeCoverLetterFromAi(42)).toBeNull();
  });
});

describe("splitCvSections", () => {
  it("maps lines to their sections", () => {
    const sections = splitCvSections(validCv);
    expect(sections.summary).toEqual([
      "2nd-level IT support specialist with 4 years of transport operations experience, skilled in SQL and root-cause analysis.",
    ]);
    expect(sections.skills).toEqual([
      "- SQL",
      "- Root cause analysis",
      "- IT support",
    ]);
    expect(sections.experience).toEqual([
      "- Provided 2nd level support for road transport applications at DSV",
      "- Maintained technical documentation",
    ]);
    expect(sections.education).toEqual(["BSc in Information Technology"]);
  });

  it("ignores unknown headings and blank lines", () => {
    const sections = splitCvSections(
      "## Summary\nfirst\n\n## Unknown Heading\nignored\n## Skills\n- SQL",
    );
    expect(sections.summary).toEqual(["first"]);
    expect(sections.skills).toEqual(["- SQL"]);
  });
});
describe("cv bullet helpers", () => {
  it("detects common bullet prefixes", () => {
    expect(isCvBulletLine("- SQL")).toBe(true);
    expect(isCvBulletLine("* SQL")).toBe(true);
    expect(isCvBulletLine("• SQL")).toBe(true);
    expect(isCvBulletLine("SQL")).toBe(false);
  });

  it("strips the bullet prefix from content", () => {
    expect(cvBulletContent("- Built APIs in Go")).toBe("Built APIs in Go");
    expect(cvBulletContent("• Built APIs in Go")).toBe("Built APIs in Go");
  });
});

describe("linkHref", () => {
  it("keeps http(s) URLs", () => {
    expect(linkHref("https://github.com/janedoe")).toBe("https://github.com/janedoe");
    expect(linkHref("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// to bare domains", () => {
    expect(linkHref("github.com/janedoe")).toBe("https://github.com/janedoe");
    expect(linkHref("www.linkedin.com/in/jane")).toBe("https://www.linkedin.com/in/jane");
  });

  it("turns emails into mailto links", () => {
    expect(linkHref("janedoe@gmail.com")).toBe("mailto:janedoe@gmail.com");
  });

  it("returns null for non-link lines", () => {
    expect(linkHref("- Provided 2nd level support")).toBeNull();
    expect(linkHref("BSc in Information Technology")).toBeNull();
    expect(linkHref("")).toBeNull();
  });
});

describe("extractMasterCvContactBlock", () => {
  it("uses the lines before the first CV section heading", () => {
    const block = extractMasterCvContactBlock([
      "Daniel Muthiru Njama",
      "Full Stack Developer",
      "Helsinki, Finland",
      "daniel@example.com | linkedin.com/in/daniel",
      "",
      "Summary",
      "Developer with platform experience.",
    ].join("\n"));

    expect(block).toBe([
      "Daniel Muthiru Njama",
      "Full Stack Developer",
      "Helsinki, Finland",
      "daniel@example.com | linkedin.com/in/daniel",
    ].join("\n"));
  });

  it("returns null when no master CV text exists", () => {
    expect(extractMasterCvContactBlock(null)).toBeNull();
    expect(extractMasterCvContactBlock("")).toBeNull();
  });
});

describe("stripMasterCvContactBlock", () => {
  it("removes the extracted contact block from the beginning of the master CV body", () => {
    const text = [
      "Daniel Muthiru Njama",
      "Full Stack Developer",
      "Helsinki, Finland",
      "",
      "Summary",
      "Developer with platform experience.",
    ].join("\n");
    const contact = extractMasterCvContactBlock(text);

    expect(stripMasterCvContactBlock(text, contact)).toBe([
      "Summary",
      "Developer with platform experience.",
    ].join("\n"));
  });
});
