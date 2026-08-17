import { describe, expect, it } from "vitest";
import { extractPageText, normalizeUrl } from "./fetch";

describe("normalizeUrl", () => {
  it("keeps http(s) URLs as-is", () => {
    expect(normalizeUrl("https://example.com/job/123")).toBe(
      "https://example.com/job/123",
    );
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// when the scheme is missing", () => {
    expect(normalizeUrl("example.com/job/123")).toBe(
      "https://example.com/job/123",
    );
  });

  it("returns null for empty input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });
});

describe("extractPageText", () => {
  it("strips scripts, styles, and tags", () => {
    const html = `
      <html><head><style>body { color: red }</style></head>
      <body><script>const x = 1;</script>
      <h1>Job Title</h1><p>Some <strong>description</strong> text.</p>
      <noscript>enable js</noscript></body></html>`;
    const text = extractPageText(html);
    expect(text).toContain("Job Title");
    expect(text).toContain("Some description text.");
    expect(text).not.toContain("<script");
    expect(text).not.toContain("<style");
    expect(text).not.toContain("const x");
    expect(text).not.toContain("color");
  });

  it("decodes common HTML entities", () => {
    expect(extractPageText("<p>a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;</p>")).toBe(
      'a & b < c > d "e" \'f\'',
    );
  });

  it("collapses whitespace", () => {
    expect(extractPageText("<p>line1\n\n   line2</p>")).toBe("line1 line2");
  });
});