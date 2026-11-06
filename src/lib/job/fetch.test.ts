import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractJobPostingDate,
  extractPageText,
  fetchJobPostingDate,
  fetchJobPageText,
  fetchPageViaJinaReader,
  isLinkedInSearchUrl,
  jinaReaderUrl,
  normalizeUrl,
} from "./fetch";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
      handler(String(input), init),
    ),
  );
}

function stubPageFetch(init?: RequestInit) {
  const seen: { url: string; init?: RequestInit }[] = [];
  stubFetch((url, fetchInit) => {
    seen.push({ url, init: fetchInit });
    return new Response("Acme is hiring a Senior Engineer.\n".repeat(30), {
      status: 200,
      ...init,
    });
  });
  return seen;
}

describe("normalizeUrl", () => {
  it("keeps http(s) URLs as-is", () => {
    expect(normalizeUrl("https://example.com/job/123")).toBe(
      "https://example.com/job/123",
    );
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// to bare URLs", () => {
    expect(normalizeUrl("example.com/job/123")).toBe("https://example.com/job/123");
  });

  it("returns null for empty input", () => {
    expect(normalizeUrl("   ")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
});

describe("extractPageText", () => {
  it("strips scripts, styles, tags, and entities", () => {
    const html =
      "<script>var x = 1;</script><style>.a { color: red }</style><p>Hello &amp; welcome</p>";
    expect(extractPageText(html)).toBe("Hello & welcome");
  });

  it("collapses whitespace", () => {
    expect(extractPageText("<p>line1\n\n   line2</p>")).toBe("line1 line2");
  });
});

describe("extractJobPostingDate", () => {
  it("reads the datePosted field from JobPosting JSON-LD", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","datePosted":"2026-11-03T09:00:00Z"}</script>`;
    expect(extractJobPostingDate(html)).toBe("2026-11-03T09:00:00Z");
  });

  it("reads the original publication date from embedded board metadata", () => {
    const html = `<script>window.data={"dateOfInitialPublicationUtc":"2026-11-02T12:00:00Z"}</script>`;
    expect(extractJobPostingDate(html)).toBe("2026-11-02T12:00:00Z");
  });

  it("returns null when the page has no reliable posting date", () => {
    expect(extractJobPostingDate("<html><body>Senior Engineer</body></html>")).toBeNull();
  });
});

describe("fetchJobPostingDate", () => {
  it("reads date metadata from supported public job-board pages", async () => {
    const requested: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      requested.push(String(input));
      return new Response(
        `<script type="application/ld+json">{"@type":"JobPosting","datePosted":"2026-11-03"}</script>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    }));

    const url = "https://www.pracuj.pl/praca/backend-dev,oferta,100000001";
    await expect(fetchJobPostingDate(url)).resolves.toBe("2026-11-03");
    expect(requested).toEqual([url]);
  });

  it("does not fetch an unsupported host", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJobPostingDate("https://example.com/jobs/123")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("isLinkedInSearchUrl", () => {
  it("flags LinkedIn job paths (all render behind a browser)", () => {
    expect(
      isLinkedInSearchUrl(
        "https://www.linkedin.com/jobs/search-results/?currentJobId=4426621780",
      ),
    ).toBe(true);
    expect(isLinkedInSearchUrl("https://www.linkedin.com/jobs/")).toBe(true);
    expect(isLinkedInSearchUrl("https://www.linkedin.com/jobs/view/4426621780")).toBe(
      true,
    );
  });

  it("does not flag other sites or LinkedIn profile pages", () => {
    expect(isLinkedInSearchUrl("https://example.com/jobs/123")).toBe(false);
    expect(isLinkedInSearchUrl("https://www.linkedin.com/in/janedoe")).toBe(false);
  });
});

describe("jinaReaderUrl", () => {
  it("prepends the r.jina.ai reader host", () => {
    expect(jinaReaderUrl("https://jobs.lever.co/acme/123")).toBe(
      "https://r.jina.ai/https://jobs.lever.co/acme/123",
    );
  });
});

describe("fetchPageViaJinaReader", () => {
  it("fetches the reader endpoint and returns the page text", async () => {
    const seen = stubPageFetch();

    const text = await fetchPageViaJinaReader("https://jobs.lever.co/acme/123");

    expect(seen[0].url).toBe("https://r.jina.ai/https://jobs.lever.co/acme/123");
    expect(text.length).toBeGreaterThan(80);
  });

  it("adds a bearer token when JINA_API_KEY is set", async () => {
    vi.stubEnv("JINA_API_KEY", "secret");
    const seen = stubPageFetch();

    await fetchPageViaJinaReader("https://example.com/job");

    expect(
      (seen[0].init?.headers as Record<string, string>).authorization,
    ).toBe("Bearer secret");
    vi.unstubAllEnvs();
  });

  it("throws when the reader returns an error status", async () => {
    stubFetch(() => new Response("blocked", { status: 403 }));

    await expect(
      fetchPageViaJinaReader("https://example.com/job"),
    ).rejects.toThrow("HTTP 403");
  });
});

describe("fetchJobPageText", () => {
  it("falls back to the direct fetch when Jina Reader fails", async () => {
    const urls: string[] = [];
    stubFetch((url) => {
      urls.push(url);
      if (url.startsWith("https://r.jina.ai/")) {
        return new Response("blocked", { status: 403 });
      }
      return new Response(
        "<html><body><p>Acme is hiring a Senior Engineer with five years of experience in Go, Kubernetes, and distributed systems. Apply today.</p></body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    });

    const text = await fetchJobPageText("https://example.com/job");

    expect(urls).toEqual([
      "https://r.jina.ai/https://example.com/job",
      "https://example.com/job",
    ]);
    expect(text).toContain("Acme is hiring a Senior Engineer");
  });

  it("uses the Jina Reader result when it succeeds", async () => {
    stubFetch((url) =>
      url.startsWith("https://r.jina.ai/")
        ? new Response("Acme is hiring a Senior Engineer.\n".repeat(30), {
            status: 200,
          })
        : new Response("never reached", { status: 500 }),
    );

    const text = await fetchJobPageText("https://example.com/job");

    expect(text).toContain("Acme is hiring a Senior Engineer");
  });
});
