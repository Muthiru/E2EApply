import { describe, expect, it } from "vitest";
import {
  buildCvKeywordCoverage,
  extractRequirementKeywords,
  sanitizeCvAlignmentFromAi,
} from "./cvAlignment";

describe("sanitizeCvAlignmentFromAi", () => {
  it("passes through a well-formed check", () => {
    const result = sanitizeCvAlignmentFromAi({
      score: 67,
      covered: ["Kubernetes", "Go"],
      missingOwnable: ["Terraform"],
      missingGaps: ["SOC 2"],
      reasoning: "Strong coverage; Terraform is worth re-adding.",
    });

    expect(result).toEqual({
      score: 67,
      covered: ["Kubernetes", "Go"],
      missingOwnable: ["Terraform"],
      missingGaps: ["SOC 2"],
      reasoning: "Strong coverage; Terraform is worth re-adding.",
    });
  });

  it("clamps the score to 0-100 and rounds", () => {
    expect(sanitizeCvAlignmentFromAi({
      score: 150,
      covered: ["Go"],
      missingOwnable: [],
      missingGaps: [],
      reasoning: "x",
    })?.score).toBe(100);
    expect(sanitizeCvAlignmentFromAi({
      score: -5,
      covered: ["Go"],
      missingOwnable: [],
      missingGaps: [],
      reasoning: "x",
    })?.score).toBe(0);
    expect(sanitizeCvAlignmentFromAi({
      score: 66.7,
      covered: ["Go"],
      missingOwnable: [],
      missingGaps: [],
      reasoning: "x",
    })?.score).toBe(67);
  });

  it("coerces a non-numeric score to 0", () => {
    const result = sanitizeCvAlignmentFromAi({
      score: "high",
      covered: ["Go"],
      missingOwnable: [],
      missingGaps: [],
      reasoning: "x",
    });
    expect(result?.score).toBe(0);
  });

  it("rejects input with no keywords at all", () => {
    expect(
      sanitizeCvAlignmentFromAi({
        score: 100,
        covered: [],
        missingOwnable: [],
        missingGaps: [],
        reasoning: "nothing classified",
      }),
    ).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(sanitizeCvAlignmentFromAi(null)).toBeNull();
    expect(sanitizeCvAlignmentFromAi("string")).toBeNull();
    expect(sanitizeCvAlignmentFromAi([])).toBeNull();
  });

  it("caps lists at 15 entries", () => {
    const result = sanitizeCvAlignmentFromAi({
      score: 50,
      covered: Array.from({ length: 40 }, (_, i) => `skill-${i}`),
      missingOwnable: [],
      missingGaps: [],
      reasoning: "x",
    });
    expect(result?.covered).toHaveLength(15);
  });
});

describe("extractRequirementKeywords", () => {
  it("extracts important ATS terms from the job posting", () => {
    const keywords = extractRequirementKeywords(`
      Requirements:
      - Strong TypeScript and React experience
      - Experience with PostgreSQL, Docker, and CI/CD
      - Knowledge of AWS and REST APIs
    `);

    expect(keywords).toEqual(
      expect.arrayContaining([
        "TypeScript",
        "React",
        "PostgreSQL",
        "REST API",
        "Docker",
        "AWS",
        "CI/CD",
      ]),
    );
  });
});

describe("buildCvKeywordCoverage", () => {
  const jobText = `
    Title: Full Stack Engineer
    Requirements:
    - Strong TypeScript and React experience
    - Build REST APIs with Node.js
    - Work with PostgreSQL and Docker
    - Familiarity with AWS and CI/CD
  `;

  const profileText = `
    MASTER CV:
    TypeScript, React, Node.js, PostgreSQL, Docker, AWS, CI/CD
    Built REST API services and deployment pipelines.
  `;

  it("scores by actual CV keyword coverage", () => {
    const high = buildCvKeywordCoverage({
      jobText,
      profileText,
      cvContent: `
        ## Summary
        Full stack engineer using TypeScript, React, Node.js, REST API design, PostgreSQL, Docker, AWS, and CI/CD.
      `,
    });
    const low = buildCvKeywordCoverage({
      jobText,
      profileText,
      cvContent: `
        ## Summary
        Full stack engineer focused on frontend product delivery.
      `,
    });

    expect(high?.score).toBeGreaterThan(low?.score ?? 0);
    expect(high?.score).toBeGreaterThanOrEqual(80);
    expect(low?.missingOwnable).toEqual(expect.arrayContaining(["TypeScript", "React"]));
  });

  it("uses synonyms for common technical terms", () => {
    const result = buildCvKeywordCoverage({
      jobText: "Requirements: Go, Kubernetes, PostgreSQL, CI/CD",
      profileText: "Golang, K8s, Postgres, continuous integration",
      cvContent: "## Skills\n- Golang\n- K8s\n- Postgres\n- continuous integration",
    });

    expect(result?.covered).toEqual(
      expect.arrayContaining(["Go", "PostgreSQL", "Kubernetes", "CI/CD"]),
    );
    expect(result?.score).toBe(100);
  });

  it("keeps unsupported missing terms as honest gaps", () => {
    const result = buildCvKeywordCoverage({
      jobText: "Requirements: TypeScript, React, Kubernetes",
      profileText: "TypeScript and React experience",
      cvContent: "## Skills\n- TypeScript",
    });

    expect(result?.covered).toContain("TypeScript");
    expect(result?.missingOwnable).toContain("React");
    expect(result?.missingGaps).toContain("Kubernetes");
  });

  it("scores consulting graduate roles from match details and profile evidence", () => {
    const result = buildCvKeywordCoverage({
      jobText: `
        Title: Associate Consultant, Consultant Development Program (CDP)
        Company: Veeva
        Matched requirements shown to the user:
        - Fluency in English
        - Recent university graduate
        - Qualified candidates must be legally authorized to be employed in the European Union
        - Must live within a maximum commuting distance of 45 minutes to 1 hour from Warsaw, Krakow, or Wroclaw
        - Analytical Mindset
        - Communication
        - Curiosity
        - Drive
        - Work Ethic
      `,
      profileText: `
        MASTER CV:
        Computer Science graduate (GPA 4.5).
        English: Fluent.
        Business Analyst and Associate Technology Consultant with requirements engineering, solution design, stakeholder communication, project delivery, and analysis experience.
        Authorized to work in the European Union and based in Warsaw.
      `,
      cvContent: `
        ## Summary
        Computer Science graduate with business analyst and associate technology consultant experience across requirements engineering, solution design, project delivery, and stakeholder communication.

        ## Skills
        English: Fluent
        Analytical problem solving, curiosity, drive, ownership, Agile delivery
      `,
    });

    expect(result?.score).toBeGreaterThanOrEqual(70);
    expect(result?.covered).toEqual(
      expect.arrayContaining([
        "associate consultant",
        "Fluency in English",
        "university graduate",
        "analytical mindset",
        "communication",
        "curiosity",
        "drive",
        "work ethic",
      ]),
    );
    expect(result?.missingOwnable).toEqual(
      expect.arrayContaining(["legal authorization", "European Union"]),
    );
  });
});
