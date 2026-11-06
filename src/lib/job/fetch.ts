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
    .replace(/<\/?[A-Za-z][^<>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function collectJobPostingDates(value: unknown, dates: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJobPostingDates(item, dates));
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];
  const isJobPosting = types.some(
    (item) => typeof item === "string" && item.toLowerCase() === "jobposting",
  );
  if (isJobPosting) {
    for (const key of ["datePosted", "datePublished", "dateOfInitialPublicationUtc"]) {
      const date = record[key];
      if (typeof date === "string" && Number.isFinite(Date.parse(date))) {
        dates.push(date);
      }
    }
  }

  for (const [key, child] of Object.entries(record)) {
    if (key === "dateOfInitialPublicationUtc" && typeof child === "string" && Number.isFinite(Date.parse(child))) {
      dates.push(child);
    } else if (child && typeof child === "object") {
      collectJobPostingDates(child, dates);
    }
  }
}

export function extractJobPostingDate(html: string): string | null {
  const dates: string[] = [];
  const jsonLdScripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of jsonLdScripts) {
    try {
      collectJobPostingDates(JSON.parse(match[1].trim()), dates);
    } catch {
      // Ignore malformed structured data and try the board's embedded posting metadata.
    }
  }

  const embeddedDates = html.matchAll(
    /["']dateOfInitialPublicationUtc["']\s*:\s*["']([^"']+)["']/gi,
  );
  for (const match of embeddedDates) {
    if (Number.isFinite(Date.parse(match[1]))) dates.push(match[1]);
  }

  return dates[0] ?? null;
}

const DATE_LOOKUP_HOSTS = ["solid.jobs", "pracuj.pl", "olx.pl"];

function isSupportedJobPostingUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "solid.jobs" || host.endsWith(".solid.jobs")) return /^\/offer\//i.test(url.pathname);
  if (host === "pracuj.pl" || host.endsWith(".pracuj.pl")) {
    return /^\/praca\/.*(?:,|%2c)oferta(?:,|%2c)\d+/i.test(url.pathname);
  }
  if (host === "olx.pl" || host.endsWith(".olx.pl")) return /^\/oferta\/praca\//i.test(url.pathname);
  return false;
}

export async function fetchJobPostingDate(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== "https:" ||
    !DATE_LOOKUP_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)) ||
    !isSupportedJobPostingUrl(parsed)
  ) {
    return null;
  }

  try {
    const response = await fetch(parsed, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; E2E-Apply/1.0; job-search assistant)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) {
      return null;
    }
    if (Number(response.headers.get("content-length") ?? 0) > 2_000_000) return null;
    const html = await response.text();
    if (html.length > 2_000_000) return null;
    return extractJobPostingDate(html);
  } catch {
    return null;
  }
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
