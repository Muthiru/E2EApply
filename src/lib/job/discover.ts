export type DiscoverCandidate = {
  title: string;
  company: string | null;
  url: string;
  snippet: string | null;
  publishedAt?: string | null;
  source: "exa" | "jina" | "rss" | "board";
  estimatedMatch: number | null;
  matchedSkills: string[];
  location?: string | null;
};

export type ChannelReport = {
  channel: "exa" | "jina" | "rss" | "board";
  ok: boolean;
  count: number;
  error?: string;
};

const SEARCH_LIMIT = 10;
const TIMEOUT_MS = 20_000;
const FRESHNESS_DAYS = 10;

function firstString(...values: unknown[]): string | undefined {
  const value = values.find((entry) => typeof entry === "string");
  return typeof value === "string" ? value : undefined;
}

const SHORT_QUERY_TERMS = new Set([
  "ai",
  "c",
  "c#",
  "go",
  "hr",
  "it",
  "ml",
  "qa",
  "r",
  "ui",
  "ux",
]);

const JOB_BOARD_DOMAINS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "greenhouse.io",
  "lever.co",
  "jobs.lever.co",
  "workable.com",
  "wellfound.com",
  "himalayas.app",
  "remoteok.com",
  "jobicy.com",
  "themuse.com",
  "weworkremotely.com",
  "ashbyhq.com",
  "jobs.ashbyhq.com",
  "smartrecruiters.com",
  "myworkdayjobs.com",
  "freehire.me",
];

type TrackedJob = {
  sourceUrl: string | null;
  company: string | null;
  title: string;
};

function normalizeUrlKey(url: string): string {
  const lower = url.trim().toLowerCase();
  return lower.endsWith("/") ? lower.slice(0, -1) : lower;
}

export function dedupeCandidates(
  candidates: DiscoverCandidate[],
): DiscoverCandidate[] {
  const seen = new Set<string>();
  const unique: DiscoverCandidate[] = [];
  for (const candidate of candidates) {
    const key = normalizeUrlKey(candidate.url);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

export function filterTrackedCandidates(
  candidates: DiscoverCandidate[],
  tracked: TrackedJob[],
): DiscoverCandidate[] {
  const trackedUrls = new Set(
    tracked
      .map((job) => job.sourceUrl ? normalizeUrlKey(job.sourceUrl) : null)
      .filter((url): url is string => Boolean(url)),
  );
  const trackedPairs = new Set(
    tracked.map(
      (job) => `${job.company?.toLowerCase() ?? ""}|${job.title.toLowerCase()}`,
    ),
  );

  return candidates.filter((candidate) => {
    if (trackedUrls.has(normalizeUrlKey(candidate.url))) return false;
    const pair = `${candidate.company?.toLowerCase() ?? ""}|${candidate.title.toLowerCase()}`;
    return !trackedPairs.has(pair);
  });
}

export function estimateMatch(
  candidate: DiscoverCandidate,
  skills: string[],
  query?: string,
): { estimatedMatch: number | null; matchedSkills: string[] } {
  const haystack = [candidate.title, candidate.company, candidate.snippet]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const words = query?.trim() ? queryWords(query.trim()) : [];
  const matchedQueryWords = words.filter((word) =>
    haystackIncludesWord(haystack, word),
  );

  const matchedSkills = skills.filter((skill) => {
    const needle = skill.trim().toLowerCase();
    if (!needle) return false;
    if (/^[a-z0-9+.#-]+$/.test(needle)) {
      return new RegExp(String.raw`\b${escapeRegExp(needle)}\b`).test(haystack);
    }
    return haystack.includes(needle);
  });

  if (words.length === 0 && skills.length === 0) {
    return { estimatedMatch: null, matchedSkills: [] };
  }

  let estimatedMatch: number;
  const matchedTerms = [...new Set([...matchedQueryWords, ...matchedSkills])];

  if (words.length > 0 && skills.length > 0) {
    const queryScore = Math.round(
      (matchedQueryWords.length / words.length) * 100,
    );
    const skillScore = Math.round((matchedSkills.length / skills.length) * 100);
    estimatedMatch = Math.round(queryScore * 0.6 + skillScore * 0.4);
  } else if (words.length > 0) {
    estimatedMatch = Math.round((matchedQueryWords.length / words.length) * 100);
  } else {
    estimatedMatch = Math.round((matchedSkills.length / skills.length) * 100);
  }

  return { estimatedMatch, matchedSkills: matchedTerms };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

const JOB_BOARD_RULES: { hostSuffix: string; accepts: RegExp }[] = [
  { hostSuffix: "linkedin.com", accepts: /^\/jobs\/(view|jobs2)\// },
  { hostSuffix: "indeed.com", accepts: /^\/(viewjob|rc\/clk)/ },
  { hostSuffix: "glassdoor.com", accepts: /^\/(job-listing|job)\// },
  { hostSuffix: "himalayas.app", accepts: /^\/jobs\// },
  { hostSuffix: "wellfound.com", accepts: /^\/job\// },
  { hostSuffix: "greenhouse.io", accepts: /^\/[^/]+\/jobs?\// },
  { hostSuffix: "workable.com", accepts: /^\/j\// },
];

const NON_JOB_PATH_PATTERNS: RegExp[] = [
  /\/jobs?\/?(?:search|browse|list|category|categories|collections?)(?:\/|$|\?)/i,
  /\/cmp\//i,
  /\/company\//i,
  /\/careers?\/?(?:$|\?)/i,
  /\/blog(?:\/|$)/i,
  /\/articles?(?:\/|$)/i,
  /\/news(?:\/|$)/i,
  /\/what-is[/-]/i,
  /\/topics?(?:\/|$)/i,
  /\/salary(?:\/|$)/i,
  /\/interview(?:\/|$)/i,
  /\/reviews?(?:\/|$)/i,
];

const PROFILE_PATH_PATTERNS: RegExp[] = [
  /\/(?:profile|people|member|members|user|users|seeker|seekers|freelancer|freelancers|talent|talentpool|employer|employers|companies|about-us)(?:\/|$)/i,
  /\/in\/[\w.-]+(?:\/|$)/i,
  /\/u\/\d+/i,
  /\/@[\w.-]+(?:\/|$)/i,
  /\/team(?:\/|$)/i,
  /\/[^/]*-profile-[^/]*/i,
  /\/[^/]*-resume-[^/]*/i,
];

const NON_HTML_FILE_PATTERN = /\.(?:png|jpe?g|gif|svg|webp|ico|css|js|json|xml|webmanifest|pdf)(?:$|[?#])/i;

const SOCIAL_HOST_SUFFIXES: string[] = [
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "medium.com",
  "quora.com",
  "stackoverflow.com",
  "github.com",
  "github.io",
  "gitlab.io",
  "wordpress.com",
];

const CONTENT_HOST_SUFFIXES: string[] = [
  "wikipedia.org",
  "coursera.org",
  "aws.amazon.com",
  "w3schools.com",
  "udemy.com",
  "edx.org",
  "careerexplorer.com",
  "careerfoundry.com",
  "zety.com",
  "resumegenius.com",
  "livecareer.com",
  "myperfectresume.com",
  "springboard.com",
  "brainstation.io",
  "tealhq.com",
  "thebalancecareers.com",
  "glassdoor.com",
  "computerscience.org",
];

const GUIDE_TITLE_PATTERNS: RegExp[] = [
  /^what\s+is\b/i,
  /^how\s+to\s+become\b/i,
  /becoming\s+a\b/i,
  /\bcareer\s+(?:path|guide|outlook)\b/i,
  /\bdefinition\b/i,
  /\bsalary\s+(?:guide|expectations)\b/i,
  /explained\b/i,
];

const ROLE_HINT_PATTERN = /\b(senior|lead|staff|principal|head|manager|director|engineer|developer|designer|architect|analyst|specialist|consultant|recruiter)\b/i;
const PERSONAL_NAME_TITLE_PATTERN = /^[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}\s*[-—|]\s*.+/;

export function isJobPostingUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (NON_HTML_FILE_PATTERN.test(parsed.pathname)) return false;

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  const boardRule = JOB_BOARD_RULES.find((rule) =>
    host === rule.hostSuffix || host.endsWith(`.${rule.hostSuffix}`),
  );
  if (boardRule) return boardRule.accepts.test(path);

  if (SOCIAL_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    return false;
  }

  if (CONTENT_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    return false;
  }

  if (NON_JOB_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
    return false;
  }

  return !PROFILE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

export function isDiscoverableJobUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const isApprovedSource = JOB_BOARD_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );

  return isApprovedSource && isJobPostingUrl(url);
}

export function isJobPostingTitle(title: string): boolean {
  const nameAndRole = PERSONAL_NAME_TITLE_PATTERN.exec(title);
  const personalPortfolio =
    nameAndRole !== null && !ROLE_HINT_PATTERN.test(nameAndRole[0].split(/[-—|]/)[0]);
  return !(
    /\b(profile|resume|job\s*seeker|freelancer|member)\b/i.test(title) ||
    /\b(portfolio|personal\s*site|hire\s*me|open\s*to\s*work|available\s*(?:for|to)\s*(?:hire|work))\b/i.test(title) ||
    /^\[?\s*image\s*\d+:/i.test(title) ||
    /\babout\s*[·•|]\s*\S/i.test(title) ||
    GUIDE_TITLE_PATTERNS.some((pattern) => pattern.test(title)) ||
    personalPortfolio
  );
}

function keepCandidate(candidate: DiscoverCandidate): boolean {
  const sourceUrlIsAllowed =
    candidate.source === "board" || candidate.source === "rss"
      ? isJobPostingUrl(candidate.url)
      : isDiscoverableJobUrl(candidate.url);

  return (
    candidate.title.length > 0 &&
    sourceUrlIsAllowed &&
    isJobPostingTitle(candidate.title)
  );
}

function extractJinaLinkData(line: string): { title: string; url: string } | null {
  const link = /^\[(.+?)\]\((https?:\/\/[^)\s]+)\)$/.exec(line);
  if (!link) return null;
  return { title: link[1].trim(), url: link[2] };
}

export function parseJinaSearchResults(
  markdown: string,
  limit = SEARCH_LIMIT,
): DiscoverCandidate[] {
  const candidates: DiscoverCandidate[] = [];
  let current: DiscoverCandidate | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const linkData = extractJinaLinkData(line);
    if (linkData) {
      if (current) candidates.push(current);
      if (candidates.length >= limit) break;
      current = {
        ...linkData,
        company: null,
        snippet: null,
        source: "jina",
        estimatedMatch: null,
        matchedSkills: [],
      };
      continue;
    }

    if (current?.snippet === null) {
      current.snippet = stripHtml(line);
    }
  }

  if (current && candidates.length < limit) candidates.push(current);

  return candidates.filter(keepCandidate);
}

export async function searchWithJina(
  query: string,
  limit = SEARCH_LIMIT,
): Promise<DiscoverCandidate[]> {
  const searchQuery = buildJobSearchQuery(query);
  const response = await fetch(
    `https://s.jina.ai/${encodeURIComponent(searchQuery)}`,
    {
      headers: {
        ...(process.env.JINA_API_KEY
          ? { authorization: `Bearer ${process.env.JINA_API_KEY}` }
          : {}),
        accept: "text/plain,text/markdown",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error("The search engine returned an error — try again.");
  }

  const markdown = await response.text();
  if (markdown.trim().length < 50) {
    throw new Error("The search returned no readable results — try a broader query.");
  }

  return parseJinaSearchResults(markdown, limit);
}

async function searchExa(
  query: string,
  limit: number,
  apiKey: string,
  includeDomains?: string[],
): Promise<DiscoverCandidate[]> {
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query: buildJobSearchQuery(query),
      numResults: limit,
      type: "auto",
      category: "job listing",
      ...(includeDomains?.length ? { includeDomains } : {}),
      contents: { text: { maxCharacters: 3000 } },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("The search engine returned an error — try again.");
  }

  const payload = (await response.json()) as {
    results?: { title?: string; url?: string; text?: string; publishedDate?: string }[];
  };

  return (payload.results ?? [])
    .filter(
      (result) =>
        result.title &&
        result.url?.startsWith("http") &&
        isRecentDate(result.publishedDate) &&
        isDiscoverableJobUrl(result.url) &&
        isJobPostingTitle(result.title ?? ""),
    )
    .map((result) => ({
      title: result.title as string,
      company: null,
      url: result.url as string,
      snippet: result.text ? stripHtml(result.text.trim()) || null : null,
      publishedAt: result.publishedDate ?? null,
      source: "exa" as const,
      estimatedMatch: null,
      matchedSkills: [],
      // Exa doesn't provide dates, so we can't filter by recency for web search results
    }));
}

export async function searchWithExa(
  query: string,
  apiKey: string,
  limit = SEARCH_LIMIT,
): Promise<DiscoverCandidate[]> {
  const fetchLimit = Math.max(limit, limit * 2);
  const focused = await searchExa(query, fetchLimit, apiKey, JOB_BOARD_DOMAINS);
  return rankCandidatesByQuery(focused, query).slice(0, limit);
}

export async function searchJobCandidates(
  query: string,
  limit = SEARCH_LIMIT,
): Promise<DiscoverCandidate[]> {
  const exaKey = process.env.EXA_API_KEY;
  const raw = exaKey
    ? await searchWithExa(query, exaKey, limit)
    : rankCandidatesByQuery(await searchWithJina(query, limit), query);
  return dedupeCandidates(raw).slice(0, limit);
}

export const JOB_FEED_SOURCES: { name: string; url: string }[] = [
  { name: "We Work Remotely", url: "https://weworkremotely.com/remote-jobs.rss" },
  { name: "RemoteOK", url: "https://remoteok.com/remote-jobs.rss" },
  { name: "HackerNews Jobs", url: "https://hnrss.org/jobs" },
  { name: "ReactJobs", url: "https://reactjs.jobboard.io/jobs.rss" },
  { name: "Python.org", url: "https://www.python.org/jobs/feed/rss/" },
  { name: "NodeJS Jobs", url: "https://nodejsjobs.app/rss" },
];

type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
};

function stripXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]{1,500}>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replace(/&#0?39;/g, "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&hellip;", "…")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return value.replace(/<\/?[A-Za-z][^<>]*>/g, "").trim();
}

function isRecentDate(dateString?: string | null): boolean {
  if (!dateString) return true;

  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) return true;

  const now = Date.now();
  const freshnessWindow = FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
  const futureTolerance = 24 * 60 * 60 * 1000;
  return timestamp >= now - freshnessWindow && timestamp <= now + futureTolerance;
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const extract = (tag: string, block: string): string | null => {
    const match = new RegExp(String.raw`<${tag}[^>]*>([\s\S]*?)</${tag}>`, "i").exec(block);
    return match ? stripXml(match[1]) : null;
  };

  for (const match of xml.matchAll(itemRegex)) {
    const title = extract("title", match[1]);
    const link = extract("link", match[1]) ?? extract("guid", match[1]);
    const description = extract("description", match[1]) ?? "";
    const pubDate = extract("pubDate", match[1]) ?? undefined;
    if (title && link && /^https?:\/\//.test(link)) {
      items.push({ title, link, description, pubDate });
    }
  }
  return items;
}

function extractFromDescriptionPrefix(description: string): string | null {
  const lowerDesc = description.toLowerCase();
  for (const prefix of ["company:", "company -", "employer:", "employer -"]) {
    const idx = lowerDesc.indexOf(prefix);
    if (idx >= 0) {
      const matchStart = idx + prefix.length;
      let matchEnd = matchStart;
      while (matchEnd < description.length && matchEnd - matchStart < 60) {
        const char = description[matchEnd];
        if (char === "\n" || char === "•" || char === "|") break;
        matchEnd++;
      }
      const candidate = description.slice(matchStart, matchEnd).trim();
      if (candidate.length >= 2) return candidate;
    }
  }
  return null;
}

function extractFromTitleAt(title: string): string | null {
  const atIdx = title.indexOf(" @ ");
  if (atIdx >= 0) {
    const company = title.slice(atIdx + 3).trim();
    if (company.length > 0) return company;
  }
  return null;
}

function extractFromTitleAtWord(title: string): string | null {
  for (const separator of [" at ", "\tat ", " at\t", "\tat\t"]) {
    const atWordIdx = title.indexOf(separator);
    if (atWordIdx >= 0) {
      const after = title.slice(atWordIdx + separator.length).trim();
      if (after.length >= 2 && after.length <= 42 && /^[A-Z]/.test(after)) {
        return after;
      }
      break;
    }
  }
  return null;
}

export function extractCompanyFromRss(
  title: string,
  description: string,
): string | null {
  return (
    extractFromDescriptionPrefix(description) ??
    extractFromTitleAt(title) ??
    extractFromTitleAtWord(title)
  );
}

export function filterRssItems(
  items: RssItem[],
  query: string,
  limit = SEARCH_LIMIT,
): DiscoverCandidate[] {
  return items
    .filter((item) => isRecentDate(item.pubDate)) // Filter out old jobs
    .map((item) => {
      const score = scoreByQueryWords(
        `${item.title} ${item.description}`,
        query,
      );
      return { item, score };
    })
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 2)
    .map((scored) => ({
      title: scored.item.title,
      company: extractCompanyFromRss(scored.item.title, scored.item.description),
      url: scored.item.link,
      snippet: stripHtml(scored.item.description.slice(0, 3000)) || null,
      publishedAt: scored.item.pubDate ?? null,
      source: "rss" as const,
      estimatedMatch: null,
      matchedSkills: [],
    }))
    .filter(keepCandidate)
    .slice(0, limit);
}

export async function searchWithRss(
  query: string,
  limit = SEARCH_LIMIT,
): Promise<DiscoverCandidate[]> {
  const responses = await Promise.allSettled(
    JOB_FEED_SOURCES.map((feed) =>
      fetch(feed.url, {
        headers: { accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }).then((response) => (response.ok ? response.text() : "")),
    ),
  );

  const items = responses.flatMap((response) =>
    response.status === "fulfilled" ? parseRss(response.value) : [],
  );

  if (items.length === 0) {
    throw new Error("The job feeds returned nothing — try again.");
  }

  return filterRssItems(items, query, limit);
}

type BoardJob = {
  title: string;
  company: string | null;
  url: string;
  location: string | null;
  tags: string[];
  snippet: string | null;
  date?: string;
};

export function parseRemoteOkPayload(payload: unknown[]): BoardJob[] {
  return payload
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).position === "string",
    )
    .map((item) => ({
      title: String(item.position).trim(),
      company:
        typeof item.company === "string" ? item.company.trim() || null : null,
      url: typeof item.url === "string" ? item.url : "",
      location:
        typeof item.location === "string" ? item.location.trim() || null : null,
      tags: [],
      snippet: typeof item.description === "string" ? stripHtml(item.description.trim()) || null : null,
      date: typeof item.created_at === "string" ? item.created_at : undefined,
    }))
    .filter((job) => job.title.length > 0 && /^https?:\/\//.test(job.url) && isRecentDate(job.date));
}

export async function fetchRemoteOkJobs(): Promise<BoardJob[]> {
  const response = await fetch("https://remoteok.com/api", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error("RemoteOK returned an error — try again.");
  }
  const payload = (await response.json()) as unknown[];
  return parseRemoteOkPayload(payload);
}

export function parseJobicyPayload(payload: {
  jobs?: {
    jobTitle?: unknown;
    companyName?: unknown;
    url?: unknown;
    jobGeo?: unknown;
    jobIndustry?: unknown;
    jobExcerpt?: unknown;
    jobPosted?: unknown;
    datePosted?: unknown;
    publishedAt?: unknown;
  }[];
}): BoardJob[] {
  return (payload.jobs ?? [])
    .filter(
      (job): job is { jobTitle: string; url: string } & typeof job =>
        typeof job.jobTitle === "string" && typeof job.url === "string",
    )
    .map((job) => ({
      title: job.jobTitle.trim(),
      company:
        typeof job.companyName === "string"
          ? job.companyName.trim() || null
          : null,
      url: job.url,
      location: typeof job.jobGeo === "string" ? job.jobGeo.trim() || null : null,
      tags: Array.isArray(job.jobIndustry)
        ? job.jobIndustry.map((industry) => stripXml(String(industry))).filter(Boolean)
        : [],
      snippet:
        typeof job.jobExcerpt === "string" && job.jobExcerpt.trim().length > 0
          ? stripXml(job.jobExcerpt)
          : null,
      date: firstString(job.jobPosted, job.datePosted, job.publishedAt),
    }))
    .filter((job) => job.title.length > 0 && /^https?:\/\//.test(job.url) && isRecentDate(job.date));
}

export async function fetchJobicyJobs(count = 50): Promise<BoardJob[]> {
  const response = await fetch(
    `https://jobicy.com/api/v2/remote-jobs?count=${count}`,
    {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new Error("Jobicy returned an error — try again.");
  }
  const payload = (await response.json()) as Parameters<typeof parseJobicyPayload>[0];
  return parseJobicyPayload(payload);
}

export function parseMusePayload(payload: {
  results?: {
    name?: unknown;
    company?: { name?: unknown };
    locations?: { name?: unknown }[];
    levels?: { name?: unknown }[];
    categories?: { name?: unknown }[];
    publication_date?: unknown;
    refs?: { landing_page?: unknown };
    contents?: unknown;
  }[];
}): BoardJob[] {
  return (payload.results ?? [])
    .filter(
      (job): job is { name: string; refs: { landing_page: string } } & typeof job =>
        typeof job.name === "string" &&
        typeof job.refs?.landing_page === "string",
    )
    .map((job) => ({
      title: job.name.trim(),
      company:
        typeof job.company?.name === "string"
          ? job.company.name.trim() || null
          : null,
      url: job.refs.landing_page,
      location:
        Array.isArray(job.locations) && job.locations.length > 0
          ? job.locations
            .map((location) => (typeof location.name === "string" ? location.name : ""))
            .filter(Boolean)
            .join(", ")
          : null,
      tags: (job.categories ?? [])
        .map((category) => (typeof category.name === "string" ? category.name : ""))
        .filter(Boolean),
      snippet: null,
      date: typeof job.publication_date === "string" ? job.publication_date : undefined,
    }))
    .filter((job) => job.title.length > 0 && /^https?:\/\//.test(job.url) && isRecentDate(job.date));
}

export async function fetchMuseJobs(): Promise<BoardJob[]> {
  const response = await fetch(
    "https://www.themuse.com/api/public/jobs?page=1",
    {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new Error("The Muse returned an error — try again.");
  }
  const payload = (await response.json()) as Parameters<typeof parseMusePayload>[0];
  return parseMusePayload(payload);
}

export function buildJobSearchQuery(query: string): string {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (/\b(?:job|jobs|hiring|career|careers|opening|openings|vacancy|vacancies)\b/i.test(normalized)) {
    return normalized;
  }
  return `${normalized} jobs`;
}

function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 || SHORT_QUERY_TERMS.has(word));
}

function haystackIncludesWord(haystack: string, word: string): boolean {
  if (/^[a-z0-9+#.-]+$/.test(word)) {
    return new RegExp(String.raw`\b${escapeRegExp(word)}\b`).test(haystack);
  }
  return haystack.includes(word);
}

export function scoreByQueryWords(text: string, query: string): number {
  const words = queryWords(query);
  if (words.length === 0) return 0;
  const haystack = text.toLowerCase();
  return words.reduce(
    (total, word) => (haystackIncludesWord(haystack, word) ? total + 1 : total),
    0,
  );
}

type RankedCandidate = {
  candidate: DiscoverCandidate;
  score: number;
  titleScore: number;
};

function getLocationQuery(query: string): { location: string | null; queryWithoutLocation: string } {
  const locationMarker = /\b(?:in|at|@)[ \t]+/i.exec(query);
  if (!locationMarker) return { location: null, queryWithoutLocation: query };

  const location = query
    .slice(locationMarker.index + locationMarker[0].length)
    .trim()
    .toLowerCase();
  const escapedLocation = location.replace(/\s+/g, String.raw`\s+`);
  const queryWithoutLocation = query
    .replace(
      new RegExp(String.raw`\b(?:in|at|@)\s+${escapedLocation}\b`, "i"),
      "",
    )
    .trim();

  return { location, queryWithoutLocation };
}

function candidateLocationText(candidate: DiscoverCandidate): string {
  return [candidate.title, candidate.company, candidate.location, candidate.snippet]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreCandidate(
  candidate: DiscoverCandidate,
  query: string,
): RankedCandidate {
  const titleScore = scoreByQueryWords(candidate.title, query);
  const snippetScore = scoreByQueryWords(
    [candidate.company, candidate.snippet].filter(Boolean).join(" "),
    query,
  );
  const queryScore = (titleScore * 3) + snippetScore;
  let score = queryScore;

  if (candidate.source === "board" || candidate.source === "rss") score += 2;
  if (candidate.company && queryScore > 0) score += 1;

  return { candidate, score, titleScore };
}

function hasExactLocation(entry: RankedCandidate, location: string): boolean {
  return candidateLocationText(entry.candidate).includes(location);
}

function hasRelaxedLocation(entry: RankedCandidate, location: string): boolean {
  const locationText = candidateLocationText(entry.candidate);
  return locationText.includes(location) ||
    locationText.includes(location.substring(0, 3)) ||
    locationText.includes(`${location} `) ||
    locationText.includes(` ${location}`);
}

function filterByLocation(
  entries: RankedCandidate[],
  location: string | null,
): RankedCandidate[] {
  if (!location) return entries;
  return entries.filter((entry) => hasExactLocation(entry, location));
}

function filterByRelaxedLocation(
  entries: RankedCandidate[],
  location: string | null,
): RankedCandidate[] {
  if (!location) return entries;
  return entries.filter((entry) => hasRelaxedLocation(entry, location));
}

export function rankCandidatesByQuery(
  candidates: DiscoverCandidate[],
  query: string,
): DiscoverCandidate[] {
  const { location, queryWithoutLocation } = getLocationQuery(query);
  const ranked = candidates
    .map((candidate) => scoreCandidate(candidate, queryWithoutLocation))
    .sort((a, b) => b.score - a.score);
  const titleMatches = ranked.filter((entry) => entry.titleScore >= 1);
  const locationMatches = filterByLocation(titleMatches, location);
  const relaxedMatches = locationMatches.length > 0
    ? locationMatches
    : filterByRelaxedLocation(titleMatches, location);
  const recentTitleMatches = titleMatches.filter(
    ({ candidate }) =>
      isRecentDate(candidate.publishedAt) && !isLikelyOldCandidate(candidate),
  );

  if (relaxedMatches.length === 0) {
    return location ? [] : recentTitleMatches.slice(0, 5).map(({ candidate }) => candidate);
  }

  return relaxedMatches.filter(
    ({ candidate }) =>
      isRecentDate(candidate.publishedAt) && !isLikelyOldCandidate(candidate),
  ).map(({ candidate }) => candidate);
}

function relativeAgeInDays(amount: number, unit: string): number {
  switch (unit) {
    case "day":
      return amount;
    case "week":
      return amount * 7;
    case "month":
      return amount * 30;
    default:
      return amount * 365;
  }
}

function containsPastYear(text: string): boolean {
  const yearMatch = /\b(20\d{2})\b/.exec(text);
  return Boolean(yearMatch && Number.parseInt(yearMatch[1], 10) < new Date().getFullYear());
}

export function isLikelyOldCandidate(candidate: DiscoverCandidate): boolean {
  const text = [candidate.title, candidate.company, candidate.snippet].join(" ").toLowerCase();

  const relativeAge = /\b(\d+)\s+(day|week|month|year)s?\s+ago\b/i.exec(text);
  if (relativeAge) {
    const amount = Number.parseInt(relativeAge[1], 10);
    if (relativeAgeInDays(amount, relativeAge[2].toLowerCase()) > FRESHNESS_DAYS) return true;
  }

  return containsPastYear(text);
}

export function filterBoardCandidates(
  jobs: Array<BoardJob | DiscoverCandidate>,
  query: string,
  limit = SEARCH_LIMIT,
): DiscoverCandidate[] {
  return jobs
    .map((job) => {
      const location = "location" in job ? job.location : null;
      const tags = "tags" in job ? (job.tags ?? []) : [];
      const haystack = [
        job.title,
        job.company,
        location,
        tags.join(" "),
        job.snippet,
      ]
        .filter(Boolean)
        .join(" ");
      return { job, score: scoreByQueryWords(haystack, query) };
    })
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((scored) => {
      const location = "location" in scored.job ? scored.job.location : null;
      const tags = "tags" in scored.job ? (scored.job.tags ?? []) : [];
      return {
        title: scored.job.title,
        company: scored.job.company ?? null,
        url: scored.job.url,
        location,
        snippet:
          scored.job.snippet ??
          ([location, tags.slice(0, 4).join(", ")]
            .filter(Boolean)
            .join(" — ") || null),
          publishedAt: "date" in scored.job ? scored.job.date ?? null : null,
        source: "board" as const,
        estimatedMatch: null,
        matchedSkills: [],
      };
    })
    .filter(keepCandidate)
    .slice(0, limit);
}

export async function searchWithBoards(
  query: string,
  limit = SEARCH_LIMIT,
): Promise<DiscoverCandidate[]> {
  const settled = await Promise.allSettled([
    fetchRemoteOkJobs(),
    fetchJobicyJobs(),
    fetchMuseJobs(),
    searchWithRss(query, Math.max(4, Math.ceil(limit / 2))),
  ]);

  const jobs: Array<BoardJob | DiscoverCandidate> = settled.flatMap(
    (result): Array<BoardJob | DiscoverCandidate> =>
      result.status === "fulfilled" ? result.value : [],
  );

  if (jobs.length === 0) {
    throw new Error("The job boards returned nothing — try again.");
  }

  return dedupeCandidates(filterBoardCandidates(jobs, query, limit)).slice(
    0,
    limit,
  );
}

export type AgentReachSearchResult = {
  candidates: DiscoverCandidate[];
  channels: ChannelReport[];
};

function channelReport(
  channel: ChannelReport["channel"],
  result: PromiseSettledResult<DiscoverCandidate[]>,
): ChannelReport {
  if (result.status === "fulfilled") {
    return { channel, ok: true, count: result.value.length };
  }

  return {
    channel,
    ok: false,
    count: 0,
    error: result.reason instanceof Error ? result.reason.message : "failed",
  };
}

async function searchWithJinaFallback(
  query: string,
  limit: number,
): Promise<{ candidates: DiscoverCandidate[]; report: ChannelReport }> {
  const result = await Promise.allSettled([searchWithJina(query, limit)]);
  const report = channelReport("jina", result[0]);
  return {
    candidates: result[0].status === "fulfilled" ? result[0].value : [],
    report,
  };
}

export async function agentReachSearch(
  query: string,
  limit = SEARCH_LIMIT,
): Promise<AgentReachSearchResult> {
  const exaKey = process.env.EXA_API_KEY;

  const settled = await Promise.allSettled([
    searchWithBoards(query, limit),
    exaKey ? searchWithExa(query, exaKey, limit) : searchWithJina(query, limit),
  ]);

  const channels: ChannelReport[] = [
    channelReport("board", settled[0]),
    channelReport(exaKey ? "exa" : "jina", settled[1]),
  ];

  let webCandidates = settled[1].status === "fulfilled" ? settled[1].value : [];

  if (exaKey && webCandidates.length === 0) {
    const jinaFallback = await searchWithJinaFallback(query, limit);
    channels.push(jinaFallback.report);
    webCandidates = jinaFallback.candidates;
  }

  const candidates = rankCandidatesByQuery(
    dedupeCandidates(
      [...(settled[0].status === "fulfilled" ? settled[0].value : []), ...webCandidates],
    ),
    query,
  ).slice(0, limit);

  return { candidates, channels };
}
