export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const LINKEDIN_JOB_PATTERN = /linkedin\.com\/jobs\//i;

export function isLinkedInSearchUrl(url: string): boolean {
  return LINKEDIN_JOB_PATTERN.test(url);
}

export function extractPageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function jinaReaderUrl(rawUrl: string): string {
  return `https://r.jina.ai/${rawUrl}`;
}

export async function fetchPageViaJinaReader(url: string): Promise<string> {
  const response = await fetch(jinaReaderUrl(url), {
    headers: {
      ...(process.env.JINA_API_KEY
        ? { authorization: `Bearer ${process.env.JINA_API_KEY}` }
        : {}),
      accept: "text/plain,text/markdown,text/html",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`The page returned HTTP ${response.status}.`);
  }

  const text = await response.text();
  if (text.length > 2_000_000) {
    throw new Error("The page is too large to analyze.");
  }
  if (text.trim().length < 80) {
    throw new Error("Couldn't read any job text from that page.");
  }

  return text.slice(0, 40_000);
}

export async function fetchJobPageText(url: string): Promise<string> {
  try {
    return await fetchPageViaJinaReader(url);
  } catch {
    return fetchPageText(url);
  }
}

export async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; E2EApply/1.0; job-search assistant)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`The page returned HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml")
  ) {
    throw new Error("The URL doesn't point to a job posting page.");
  }

  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 2_000_000) {
    throw new Error("The page is too large to analyze.");
  }

  const html = await response.text();
  if (html.length > 2_000_000) {
    throw new Error("The page is too large to analyze.");
  }

  const text = extractPageText(html);
  if (text.length < 80) {
    throw new Error("Couldn't read any job text from that page — paste the description instead.");
  }

  return text.slice(0, 40_000);
}