import { describe, expect, it } from "vitest";
import {
  extractPageText,
  isLinkedInSearchUrl,
  normalizeUrl,
} from "./fetch";

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
