import { describe, expect, it, vi } from "vitest";
import {
  dedupeCandidates,
  estimateMatch,
  filterBoardCandidates,
  filterTrackedCandidates,
  isDiscoverableJobUrl,
  isJobPostingTitle,
  isJobPostingUrl,
  parseJinaSearchResults,
  parseJinaBoardListings,
  parseJobicyPayload,
  parseMusePayload,
  parseRemoteOkPayload,
  searchWithJina,
  JOB_FEED_SOURCES,
  buildJobSearchQuery,
  rankCandidatesByQuery,
  scoreByQueryWords,
  isLikelyOldCandidate,
  type DiscoverCandidate,
} from "./discover";

const baseCandidate = (overrides: Partial<DiscoverCandidate> = {}): DiscoverCandidate => ({
  title: "Senior Engineer",
  company: "Acme",
  url: "https://jobs.lever.co/acme/senior-engineer",
  snippet: "We build things.",
  source: "jina",
  estimatedMatch: null,
  matchedSkills: [],
  ...overrides,
});

describe("parseJinaSearchResults", () => {
  it("includes the public SOLID.Jobs RSS source", () => {
    expect(JOB_FEED_SOURCES).toContainEqual({
      name: "SOLID.Jobs",
      url: "https://solid.jobs/rss/job-offers",
    });
  });

  it("parses title-link lines followed by snippet text", () => {
    const markdown = [
      "# Search Results",
      "",
      "[Senior Engineer at Acme](https://jobs.lever.co/acme/123)",
      "Acme is hiring a Senior Engineer to build the platform.",
      "",
      "[DevOps Lead - Globex](https://boards.greenhouse.io/globex/jobs/456)",
      "Join Globex and own the infrastructure stack.",
      "",
    ].join("\n");

    const results = parseJinaSearchResults(markdown, 10);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      title: "Senior Engineer at Acme",
      url: "https://jobs.lever.co/acme/123",
      snippet: "Acme is hiring a Senior Engineer to build the platform.",
      source: "jina",
    });
    expect(results[1].title).toBe("DevOps Lead - Globex");
  });

  it("parses Jina's numbered Title, URL Source, and Description format", () => {
    const results = parseJinaSearchResults([
      "[1] Title: Oferta pracy AI-Native Software Engineer, Booksy, Warszawa",
      "[1] URL Source: https://www.pracuj.pl/praca/ai-native-software-engineer-warszawa,oferta,1004747666",
      "[1] Description: Python and JavaScript role based in Poland.",
      "Additional description text.",
      "",
      "[2] Title: Backend Developer",
      "[2] URL Source: https://www.pracuj.pl/praca/backend-developer-krakow,oferta,1004747667",
      "[2] Description: Build backend services.",
    ].join("\n"));

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      title: "Oferta pracy AI-Native Software Engineer, Booksy, Warszawa",
      url: "https://www.pracuj.pl/praca/ai-native-software-engineer-warszawa,oferta,1004747666",
      snippet: "Python and JavaScript role based in Poland.\nAdditional description text.",
    });
  });

  it("respects the limit", () => {
    const lines = [1, 2, 3, 4, 5].flatMap((n) => [
      `[Job ${n}](https://jobs.lever.co/acme/${n})`,
      `Snippet for job ${n}.`,
    ]);

    expect(parseJinaSearchResults(lines.join("\n"), 3)).toHaveLength(3);
  });

  it("skips non-link lines and empty titles", () => {
    const markdown = [
      "Some random intro text.",
      "",
      "[](https://example.com/empty-title)",
      "[Real Job](https://jobs.lever.co/acme/real)",
      "",
    ].join("\n");

    const results = parseJinaSearchResults(markdown, 10);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Real Job");
  });

  it("extracts individual Pracuj jobs and Polish publication dates from board search pages", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response([
      "# Praca software engineer, Warszawa",
      "[1] URL Source: https://www.pracuj.pl/praca/software-engineer;kw/warszawa;wp",
      "Opublikowana: 5 listopada 2026",
      "## [Frontend Developer — Warszawa](https://www.pracuj.pl/praca/frontend-developer-warszawa,oferta,1005025053 \"Zobacz ofertę Frontend Developer\")",
      "React and TypeScript. Praca hybrydowa.",
      "Opublikowana: 4 listopada 2026",
      "## [Backend Developer — Warszawa](https://www.pracuj.pl/praca/backend-developer-warszawa,oferta,1005025054 \"Zobacz ofertę Backend Developer\")",
      "Python and PostgreSQL.",
    ].join("\n"), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const results = await searchWithJina("Frontend Developer in Warszawa", 10, "pracuj.pl");
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        title: "Frontend Developer — Warszawa",
        url: "https://www.pracuj.pl/praca/frontend-developer-warszawa,oferta,1005025053",
        publishedAt: "2026-11-05T00:00:00.000Z",
      });
      expect(fetchMock.mock.calls[0][1].headers["X-Site"]).toBe("https://www.pracuj.pl");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("extracts OLX listing links and relative publication dates", () => {
    const results = parseJinaBoardListings([
      "Wyniki wyszukiwania dla praca Warszawa",
      "Opublikowana: 2 dni temu",
      "## [Software Developer](https://www.olx.pl/oferta/praca/software-developer-ID123.html \"Oferta pracy\")",
      "JavaScript, Warszawa",
    ].join("\n"), "olx.pl");

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Software Developer");
    expect(results[0].publishedAt).toMatch(/^2026-11-0[4-5]T/);
  });

  it("recognizes a Pracuj posting published one week ago in Polish", () => {
    const now = Date.now();
    const results = parseJinaBoardListings([
      "Opublikowana: 1 tydzień temu",
      "## [Software Engineer](https://www.pracuj.pl/praca/software-engineer-warszawa,oferta,1005000001)",
    ].join("\n"), "pracuj.pl");

    expect(results).toHaveLength(1);
    expect(results[0].publishedAt).not.toBeNull();
    const age = now - Date.parse(results[0].publishedAt ?? "");
    expect(age).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
    expect(age).toBeLessThan(8 * 24 * 60 * 60 * 1000);
  });

  it("drops job seeker profiles and company pages from job boards", () => {
    const markdown = [
      "[Senior Engineer at Acme](https://www.linkedin.com/jobs/view/1234567890)",
      "Acme is hiring a Senior Engineer.",
      "",
      "[John Doe - Senior Engineer - Profile - LinkedIn](https://www.linkedin.com/in/johndoe)",
      "10+ years of experience, open to work.",
      "",
      "[DevOps Lead - Globex](https://boards.greenhouse.io/globex/jobs/456)",
      "Join Globex.",
      "",
      "[Acme Careers](https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE1234.htm)",
      "About Acme.",
      "",
      "[Backend Engineer](https://himalayas.app/jobs/backend-engineer)",
      "Remote backend role.",
      "",
      "[Acme Jobs](https://www.indeed.com/cmp/Acme/jobs)",
      "All Acme openings.",
      "",
    ].join("\n");

    const results = parseJinaSearchResults(markdown, 10);

    expect(results.map((result) => result.url)).toEqual([
      "https://www.linkedin.com/jobs/view/1234567890",
      "https://boards.greenhouse.io/globex/jobs/456",
      "https://himalayas.app/jobs/backend-engineer",
    ]);
  });
});

describe("isJobPostingUrl", () => {
  it("accepts real job postings on the named job boards", () => {
    expect(isJobPostingUrl("https://www.linkedin.com/jobs/view/1234567890")).toBe(true);
    expect(isJobPostingUrl("https://www.indeed.com/viewjob?jk=abc123")).toBe(true);
    expect(isJobPostingUrl("https://www.indeed.com/rc/clk?jk=abc123")).toBe(true);
    expect(isJobPostingUrl("https://www.glassdoor.com/job-listing/senior-engineer-JL_IC.htm")).toBe(true);
    expect(isJobPostingUrl("https://himalayas.app/jobs/backend-engineer")).toBe(true);
    expect(isJobPostingUrl("https://boards.greenhouse.io/acme/jobs/4567890")).toBe(true);
    expect(isJobPostingUrl("https://jobs.lever.co/acme/senior-engineer")).toBe(true);
    expect(isJobPostingUrl("https://solid.jobs/offer/senior-engineer-123")).toBe(true);
    expect(isJobPostingUrl("https://www.pracuj.pl/praca/frontend-developer-warszawa%2Coferta%2C1005025053")).toBe(true);
    expect(isJobPostingUrl("https://www.olx.pl/oferta/praca/frontend-developer-CID4-ID123.html")).toBe(true);
  });

  it("rejects job seeker profiles on the named job boards", () => {
    expect(isJobPostingUrl("https://www.linkedin.com/in/johndoe")).toBe(false);
    expect(isJobPostingUrl("https://www.linkedin.com/company/acme")).toBe(false);
    expect(isJobPostingUrl("https://www.linkedin.com/jobs/search")).toBe(false);
    expect(isJobPostingUrl("https://www.indeed.com/cmp/Acme/jobs")).toBe(false);
    expect(isJobPostingUrl("https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE1234.htm")).toBe(false);
    expect(isJobPostingUrl("https://www.glassdoor.com/profile/jane-smith.htm")).toBe(false);
    expect(isJobPostingUrl("https://himalayas.app/companies/acme")).toBe(false);
    expect(isJobPostingUrl("https://himalayas.app/@johndoe")).toBe(false);
    expect(isJobPostingUrl("https://www.pracuj.pl/praca/it")).toBe(false);
    expect(isJobPostingUrl("https://www.olx.pl/oferty/praca/")).toBe(false);
  });

  it("rejects candidate profiles and portfolio pages from web search", () => {
    expect(isJobPostingUrl("https://www.golangprojects.com/golang-go-profile-john-Senior-Go-Engineer.html")).toBe(false);
    expect(isJobPostingUrl("https://spdeepak.github.io/")).toBe(false);
    expect(isJobPostingUrl("https://jane.gitlab.io/")).toBe(false);
    expect(isJobPostingUrl("https://example.com/jane-resume-2026.pdf")).toBe(false);
    expect(isJobPostingUrl("https://example.com/assets/logo.svg")).toBe(false);
    expect(isJobPostingUrl("https://example.com/profile/")).toBe(false);
  });

  it("rejects career guide and definition articles", () => {
    expect(isJobPostingUrl("https://www.coursera.org/articles/full-stack-developer")).toBe(false);
    expect(isJobPostingUrl("https://aws.amazon.com/what-is/full-stack-development/")).toBe(false);
    expect(isJobPostingUrl("https://www.w3schools.com/whatis/whatis_fullstack.asp")).toBe(false);
    expect(isJobPostingUrl("https://en.wikipedia.org/wiki/Full_stack")).toBe(false);
    expect(isJobPostingUrl("https://www.careerexplorer.com/careers/full-stack-developer/")).toBe(false);
    expect(isJobPostingUrl("https://www.glassdoor.com/careers/full-stack-developer-career")).toBe(false);
  });

  it("rejects generic profile pages and social media", () => {
    expect(isJobPostingUrl("https://example.com/profile/jane")).toBe(false);
    expect(isJobPostingUrl("https://example.com/people/jane")).toBe(false);
    expect(isJobPostingUrl("https://example.com/team")).toBe(false);
    expect(isJobPostingUrl("https://www.youtube.com/watch?v=abc")).toBe(false);
    expect(isJobPostingUrl("https://twitter.com/jane_doe")).toBe(false);
    expect(isJobPostingUrl("https://github.com/janedoe")).toBe(false);
  });

  it("rejects malformed urls", () => {
    expect(isJobPostingUrl("not-a-url")).toBe(false);
    expect(isJobPostingUrl("")).toBe(false);
  });

  it("keeps generic company career pages without profile markers", () => {
    expect(isJobPostingUrl("https://acme.com/careers/backend-engineer")).toBe(true);
    expect(isJobPostingUrl("https://acme.com/jobs/backend-engineer")).toBe(true);
  });

  it("rejects job board search pages and career landing pages", () => {
    expect(isJobPostingUrl("https://www.indeed.com/jobs?q=engineer")).toBe(false);
    expect(isJobPostingUrl("https://acme.com/careers")).toBe(false);
    expect(isJobPostingUrl("https://acme.com/careers/")).toBe(false);
    expect(isJobPostingUrl("https://example.com/blog/how-to-get-hired")).toBe(false);
    expect(isJobPostingUrl("https://example.com/articles/salary-guide")).toBe(false);
  });
});

describe("isDiscoverableJobUrl", () => {
  it("accepts configured job boards and ATS sources", () => {
    expect(isDiscoverableJobUrl("https://jobs.lever.co/acme/backend")).toBe(true);
    expect(isDiscoverableJobUrl("https://boards.greenhouse.io/acme/jobs/123")).toBe(true);
    expect(isDiscoverableJobUrl("https://www.pracuj.pl/praca/backend-developer-warszawa%2Coferta%2C1005025053")).toBe(true);
    expect(isDiscoverableJobUrl("https://www.olx.pl/oferta/praca/backend-developer-CID4-ID123.html")).toBe(true);
  });

  it("rejects custom domains even when their title looks like a job", () => {
    expect(isDiscoverableJobUrl("https://alexjohnson.dev/")).toBe(false);
    expect(isDiscoverableJobUrl("https://alexjohnson.dev/projects/full-stack-developer")).toBe(false);
    expect(isDiscoverableJobUrl("https://acme.com/careers/backend-engineer")).toBe(false);
  });
});

describe("isJobPostingTitle", () => {
  it("rejects titles that look like profiles or resumes", () => {
    expect(isJobPostingTitle("John Doe - Profile - LinkedIn")).toBe(false);
    expect(isJobPostingTitle("Jane Smith - Resume")).toBe(false);
    expect(isJobPostingTitle("Jane Smith - Job Seeker")).toBe(false);
  });

  it("rejects personal portfolio titles", () => {
    expect(isJobPostingTitle("About · Felix Geisendörfer")).toBe(false);
    expect(isJobPostingTitle("John's Portfolio - Senior Go Engineer")).toBe(false);
    expect(isJobPostingTitle("Open to work — Senior Engineer")).toBe(false);
    expect(isJobPostingTitle("Hire me: Senior Software Engineer")).toBe(false);
    expect(isJobPostingTitle("Personal site of Jane Smith")).toBe(false);
  });

  it("rejects image asset links and nav junk", () => {
    expect(isJobPostingTitle("Image 1: DailyRemote")).toBe(false);
    expect(isJobPostingTitle("[Image 1: RemoteOK logo]")).toBe(false);
  });

  it("rejects job definition and guide articles", () => {
    expect(isJobPostingTitle("What Is a Full-Stack Developer?")).toBe(false);
    expect(isJobPostingTitle("What is Full Stack Development?")).toBe(false);
    expect(isJobPostingTitle("How to become a full stack developer")).toBe(false);
    expect(isJobPostingTitle("Full Stack Developer Career Path")).toBe(false);
    expect(isJobPostingTitle("Full Stack Developer: Definition & Salary")).toBe(false);
  });

  it("rejects personal portfolio name-role titles", () => {
    expect(isJobPostingTitle("Shahriyar — Full-Stack Developer")).toBe(false);
    expect(isJobPostingTitle("Shannon Reed | Full Stack Developer")).toBe(false);
    expect(isJobPostingTitle("Omar Farooq Shah - Fullstack Developer")).toBe(false);
    expect(isJobPostingTitle("Becoming a Full-Stack Developer")).toBe(false);
    expect(isJobPostingTitle("Full-Stack Developer Role Explained: Key Insights")).toBe(false);
  });

  it("keeps ordinary job posting titles", () => {
    expect(isJobPostingTitle("Senior Engineer at Acme")).toBe(true);
    expect(isJobPostingTitle("DevOps Lead - Globex")).toBe(true);
    expect(isJobPostingTitle("Senior Engineer — Acme")).toBe(true);
  });
});

describe("buildJobSearchQuery", () => {
  it("preserves the query while normalizing whitespace", () => {
    expect(buildJobSearchQuery("Senior Go Engineer Berlin")).toBe(
      "Senior Go Engineer Berlin jobs",
    );
  });

  it("leaves queries that already mention jobs alone", () => {
    expect(buildJobSearchQuery("remote backend jobs")).toBe("remote backend jobs");
  });

  it("leaves queries with location keywords alone", () => {
    expect(buildJobSearchQuery("Senior Go Engineer jobs in Berlin")).toBe(
      "Senior Go Engineer jobs in Berlin",
    );
  });

  it("leaves queries with hiring keywords alone", () => {
    expect(buildJobSearchQuery("Senior Go Engineer hiring")).toBe(
      "Senior Go Engineer hiring",
    );
  });
});

describe("scoreByQueryWords", () => {
  it("matches short tech terms like Go with word boundaries", () => {
    expect(scoreByQueryWords("Senior Go Engineer", "Go engineer")).toBe(2);
    expect(scoreByQueryWords("Senior Golang Engineer", "Go engineer")).toBe(1);
  });
});

describe("rankCandidatesByQuery", () => {
  it("ranks matching jobs first and drops unrelated web results when matches exist", () => {
    const candidates = [
      baseCandidate({
        title: "What Is a Full-Stack Developer?",
        company: null,
        url: "https://example.com/guide",
        snippet: "Career guide article",
        source: "jina",
      }),
      baseCandidate({
        title: "Senior Go Engineer",
        company: "Acme",
        url: "https://remoteok.com/jobs/1",
        snippet: "Build backend services in Go.",
        source: "board",
      }),
    ];

    const ranked = rankCandidatesByQuery(candidates, "Go engineer");

    expect(ranked).toHaveLength(1);
    expect(ranked[0].title).toBe("Senior Go Engineer");
  });

  it("requires title relevance (at least 1 title word match)", () => {
    const candidates = [
      baseCandidate({
        title: "Senior Engineer",
        company: "Acme",
        url: "https://example.com/jobs/1",
        snippet: "Build systems.",
        source: "jina",
      }),
      baseCandidate({
        title: "Go Developer",
        company: "TechCorp",
        url: "https://example.com/jobs/2",
        snippet: "Build backend services in Go.",
        source: "board",
      }),
      baseCandidate({
        title: "Marketing Manager",
        company: "SalesCo",
        url: "https://example.com/jobs/3",
        snippet: "We need Go developers for marketing.",
        source: "jina",
      }),
    ];

    const ranked = rankCandidatesByQuery(candidates, "Go engineer");

    // Only title matches should be included
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every(c => c.title.toLowerCase().includes("go") || c.title.toLowerCase().includes("engineer"))).toBe(true);
  });

  it("strictly filters by location when specified", () => {
    const candidates = [
      baseCandidate({
        title: "Full Stack Developer",
        company: "TechCorp Poland",
        url: "https://example.com/jobs/1",
        snippet: "Remote role based in Poland.",
        source: "board",
      }),
      baseCandidate({
        title: "Full Stack Developer",
        company: "GlobalTech",
        url: "https://example.com/jobs/2",
        snippet: "Remote role worldwide.",
        source: "jina",
      }),
      baseCandidate({
        title: "Billing Officer",
        company: "Nepal Corp",
        url: "https://example.com/jobs/3",
        snippet: "Finance role in Nepal.",
        source: "jina",
      }),
    ];

    const ranked = rankCandidatesByQuery(candidates, "full stack developer jobs in poland");

    // Should only return Poland results
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every(c => {
      const haystack = [c.title, c.company, c.snippet].join(" ").toLowerCase();
      return haystack.includes("poland");
    })).toBe(true);
  });

  it("excludes results without location match when location is specified", () => {
    const candidates = [
      baseCandidate({
        title: "Senior Engineer",
        company: "Berlin Tech",
        url: "https://example.com/jobs/1",
        snippet: "Based in Berlin, Germany.",
        source: "board",
      }),
      baseCandidate({
        title: "Senior Engineer",
        company: "London Tech",
        url: "https://example.com/jobs/2",
        snippet: "Based in London, UK.",
        source: "board",
      }),
    ];

    const ranked = rankCandidatesByQuery(candidates, "senior engineer jobs in london");

    // Only London result should be included
    expect(ranked).toHaveLength(1);
    expect(ranked[0].company).toBe("London Tech");
  });

  it("weights title matches 3x higher than snippet matches", () => {
    const candidates = [
      baseCandidate({
        title: "Go Developer",
        company: "Acme",
        url: "https://example.com/jobs/1",
        snippet: "Backend services.",
        source: "jina",
      }),
      baseCandidate({
        title: "Backend Developer",
        company: "TechCorp",
        url: "https://example.com/jobs/2",
        snippet: "Build backend services in Go.",
        source: "board",
      }),
    ];

    const ranked = rankCandidatesByQuery(candidates, "Go");

    // Title match should rank higher than snippet match
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].title).toBe("Go Developer");
  });

  it("filters out candidates with old dates in content", () => {
    const candidates = [
      baseCandidate({
        title: "Senior Engineer",
        company: "TechCorp",
        url: "https://example.com/jobs/1",
        snippet: "Position available since February 2023.",
        source: "jina",
      }),
      baseCandidate({
        title: "Senior Engineer",
        company: "NewTech",
        url: "https://example.com/jobs/2",
        snippet: "New position opening August 2026.",
        source: "board",
      }),
      baseCandidate({
        title: "Senior Engineer",
        company: "FreshTech",
        url: "https://example.com/jobs/3",
        snippet: "Recent position.",
        source: "board",
      }),
    ];

    const ranked = rankCandidatesByQuery(candidates, "senior engineer");

    // Should filter out the old 2023 position (fallback won't kick in with 3 candidates)
    expect(ranked.every(c => !c.snippet?.toLowerCase().includes("2023"))).toBe(true);
    
    // Test the helper function directly
    expect(isLikelyOldCandidate(candidates[0])).toBe(true);
    expect(isLikelyOldCandidate(candidates[1])).toBe(false);
    expect(isLikelyOldCandidate(candidates[2])).toBe(false);
  });

  it("excludes candidates published more than ten days ago", () => {
    const candidates = [
      baseCandidate({
        title: "Senior Engineer",
        publishedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      baseCandidate({
        title: "Senior Engineer",
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ];

    const ranked = rankCandidatesByQuery(candidates, "senior engineer");

    expect(ranked).toHaveLength(1);
    expect(ranked[0].publishedAt).toBe(candidates[1].publishedAt);
  });
});

describe("dedupeCandidates", () => {
  it("drops duplicate urls ignoring case and trailing slashes", () => {
    const candidates = [
      baseCandidate({ url: "https://example.com/jobs/1" }),
      baseCandidate({ url: "https://example.com/jobs/1/" }),
      baseCandidate({ url: "https://EXAMPLE.com/jobs/1" }),
    ];

    expect(dedupeCandidates(candidates)).toHaveLength(1);
  });
});

describe("filterTrackedCandidates", () => {
  it("filters out jobs already tracked by url or company+title", () => {
    const candidates = [
      baseCandidate({ url: "https://example.com/jobs/tracked-url" }),
      baseCandidate({ title: "Tracked Title", company: "Tracked Co" }),
      baseCandidate({ title: "Fresh Role", company: "Fresh Co" }),
    ];

    const tracked = [
      { sourceUrl: "https://example.com/jobs/tracked-url", company: null, title: "X" },
      { sourceUrl: null, company: "Tracked Co", title: "Tracked Title" },
    ];

    const result = filterTrackedCandidates(candidates, tracked);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Fresh Role");
  });
});

describe("estimateMatch", () => {
  const candidate = baseCandidate({
    title: "Senior Go Engineer",
    company: "Acme",
    snippet: "We build Kubernetes tooling.",
  });

  it("returns null when there is no query and no profile skills", () => {
    expect(estimateMatch(candidate, [])).toEqual({
      estimatedMatch: null,
      matchedSkills: [],
    });
  });

  it("scores against the search query when profile skills are empty", () => {
    const { estimatedMatch, matchedSkills } = estimateMatch(
      baseCandidate({
        title: "Junior Full Stack Developer",
        company: "Acme",
        snippet: "Entry level role for graduates.",
      }),
      [],
      "full stack developer entry level",
    );

    expect(matchedSkills).toEqual(
      expect.arrayContaining(["full", "stack", "developer", "entry", "level"]),
    );
    expect(estimatedMatch).toBe(100);
  });

  it("blends query and profile skill matches when both are present", () => {
    const { estimatedMatch, matchedSkills } = estimateMatch(
      baseCandidate({
        title: "Senior Go Engineer",
        company: "Acme",
        snippet: "We build Kubernetes tooling.",
      }),
      ["Go", "Kubernetes", "Rust"],
      "Go engineer",
    );

    expect(matchedSkills).toEqual(
      expect.arrayContaining(["go", "engineer", "Go", "Kubernetes"]),
    );
    expect(estimatedMatch).toBe(87);
  });

  it("counts skills found in the title, company, or snippet", () => {
    const { estimatedMatch, matchedSkills } = estimateMatch(candidate, [
      "Go",
      "Kubernetes",
      "Rust",
    ]);
    expect(matchedSkills).toEqual(["Go", "Kubernetes"]);
    expect(estimatedMatch).toBe(67);
  });

  it("uses word boundaries so short skills don't match inside words", () => {
    const { matchedSkills } = estimateMatch(candidate, ["AI", "go"]);
    expect(matchedSkills).toEqual(["go"]);
  });
});

describe("parseRemoteOkPayload", () => {
  it("skips the API metadata entry and maps job fields", () => {
    const payload = [
      { last_updated: 1787040007, legal: "API Terms of Service" },
      {
        position: "Senior Go Engineer",
        company: "Solarisbank AG",
        url: "https://remoteok.com/remote-jobs/103028-senior-go-engineer",
        location: "Remote",
        tags: ["dev", "golang", "remote"],
      },
      {
        position: "Designer",
        url: "https://remoteok.com/remote-jobs/103029-designer",
        tags: ["design"],
      },
    ];

    const jobs = parseRemoteOkPayload(payload);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      title: "Senior Go Engineer",
      company: "Solarisbank AG",
      url: "https://remoteok.com/remote-jobs/103028-senior-go-engineer",
      location: "Remote",
      tags: [],
    });
    expect(jobs[1].company).toBeNull();
  });
});

describe("parseJobicyPayload", () => {
  it("maps job fields and decodes html entities in the excerpt", () => {
    const payload = {
      jobs: [
        {
          jobTitle: "Startup Customer Success Manager",
          companyName: "Ashby",
          url: "https://jobicy.com/jobs/145717-csm",
          jobGeo: "Canada, USA",
          jobIndustry: ["Customer Support &amp; Success"],
          jobExcerpt: "Hello &amp; welcome to the team&hellip;",
        },
      ],
    };

    const jobs = parseJobicyPayload(payload);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: "Startup Customer Success Manager",
      company: "Ashby",
      location: "Canada, USA",
      tags: ["Customer Support & Success"],
      snippet: "Hello & welcome to the team…",
    });
  });
});

describe("parseMusePayload", () => {
  it("maps job fields and drops entries without landing pages", () => {
    const payload = {
      results: [
        {
          name: "Full Stack Developer",
          company: { name: "Acme" },
          refs: { landing_page: "https://www.themuse.com/jobs/acme/full-stack-developer" },
          locations: [{ name: "Remote" }],
          categories: [{ name: "Engineering" }],
        },
        { name: "No Page Job", company: { name: "Globex" } },
      ],
    };

    const jobs = parseMusePayload(payload);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: "Full Stack Developer",
      company: "Acme",
      url: "https://www.themuse.com/jobs/acme/full-stack-developer",
      location: "Remote",
      tags: ["Engineering"],
    });
  });
});

describe("filterBoardCandidates", () => {
  const jobs = [
    {
      title: "Senior Go Engineer",
      company: "Acme",
      url: "https://remoteok.com/jobs/1",
      location: "Remote",
      tags: ["golang", "backend"],
      snippet: null,
    },
    {
      title: "Marketing Lead",
      company: "Globex",
      url: "https://remoteok.com/jobs/2",
      location: "Remote",
      tags: ["marketing"],
      snippet: null,
    },
    {
      title: "Go Developer",
      company: "Initech",
      url: "https://jobicy.com/jobs/3",
      location: "Berlin",
      tags: ["golang"],
      snippet: "Building backend services in Go.",
    },
  ];

  it("keeps only jobs matching the query words, ranked by hits", () => {
    const results = filterBoardCandidates(jobs, "Go engineer Berlin", 10);

    expect(results.map((result) => result.url)).toEqual([
      "https://remoteok.com/jobs/1",
      "https://jobicy.com/jobs/3",
    ]);
    expect(results[0].source).toBe("board");
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterBoardCandidates(jobs, "design sales", 10)).toHaveLength(0);
  });

  it("filters invalid board links before applying the result limit", () => {
    const results = filterBoardCandidates(
      [
        {
          title: "Full Stack Developer",
          company: "RemoteOK",
          url: "https://remoteok.com/jobs/search",
          location: "Remote",
          tags: ["full-stack"],
          snippet: null,
        },
        {
          title: "Full Stack Developer",
          company: "RemoteOK",
          url: "https://remoteok.com/jobs/profile",
          location: "Remote",
          tags: ["full-stack"],
          snippet: null,
        },
        {
          title: "Full Stack Developer",
          company: "Acme",
          url: "https://remoteok.com/jobs/full-stack-developer",
          location: "Remote",
          tags: ["full-stack"],
          snippet: "We are hiring a full stack developer.",
        },
      ],
      "Full Stack Developer",
      1,
    );

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://remoteok.com/jobs/full-stack-developer");
  });
});
