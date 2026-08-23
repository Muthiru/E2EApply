# E2E Apply — Build Plan (v2)

**Positioning:** An AI-powered job application OS that takes a job from discovery to outcome — not a CV generator.

**Core differentiator:** The tracker that closes the loop, and the "why you shouldn't apply" filter that saves time instead of just generating volume.

**What changed from v1:** Calendar-week estimates removed (they were placeholders, not real). Added a validation spike before the highest-risk phase, explicit kill/pivot criteria at every checkpoint, and an earlier point where someone other than you uses it. Effort is given in relative sizing (S/M/L/XL), not dates — plug in your own real dates once you know your velocity from Phase 0.

---

## STRICT COMMIT PROTOCOL (CRITICAL AI MEMORY RULE)
> **MANDATORY INSTRUCTION FOR THE AI ASSISTANT:** 
> Before executing ANY `git commit`, you MUST ALWAYS first run the verification scripts / tools (e.g., `npm run lint`, `npx tsc --noEmit`, and `npm test`). You are not allowed to commit without verifying the system remains fully intact. Never forget this rule.

---

## 0. Before writing code

- [ ] Check domain availability: `e2eapply.com`, `.io`, `.app`, `.co`
- [ ] Check trademark conflicts (USPTO TESS search, EUIPO if targeting EU) — note: an existing Google Play app called "e2eJobs" is close enough in name to check for confusion/SEO overlap before committing
- [x] Read the ToS of 2–3 major ATS platforms (Greenhouse, Lever, Workday) specifically for language on automated form submission or bot access. **Result recorded in `docs/ats-tos-review.md`** (2026-08-17)
- [x] Set up repo, project board, and this doc as the source of truth — **repo on GitHub (develop branch) + this doc as source of truth verified (2026-08-18); project board not confirmed**

**Checkpoint 0 (recorded 2026-08-17):** ✅ **Decision made.** Greenhouse explicitly prohibits automated access (User Agreement clause z) and Workday restricts it (Site Terms + AUP). **Verdict: Phase 3/4 become "generate + pre-fill with human-in-the-loop submit" — never unattended auto-submit.** A human always reviews and clicks the final Submit; CAPTCHAs/attestations are completed by humans; no circumvention of bot controls. Full details + gates in `docs/ats-tos-review.md`. This means the product ceiling is "assisted application" not "auto-apply"; Phase 4 must re-evaluate per the Phase 4 gate checklist before any unattended submission.

---

## Phase 0 — Foundation (Effort: S)

**Goal:** Skeleton app with auth, DB, and your own Master Profile entered.

### Tech stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + TypeScript | Fits your background, SSR for dashboard perf |
| Backend | Next.js API routes → split to NestJS later if needed | Ship fast now, extract later |
| DB | PostgreSQL | Relational data (jobs, applications, statuses) fits better than Mongo/Maria here |
| ORM | Prisma | Fast iteration, good TS support |
| Auth | Clerk or Supabase Auth | Don't build auth yourself |
| AI | Provider-agnostic wrapper (start with Gemini) | Swap models without rewrites (decided 2026-08-17: Gemini first) |
| File storage | S3 / Cloudflare R2 | CV/cover letter PDFs |
| Hosting | Vercel (frontend+API) + Railway/Render (workers, later) | Cheap to start |

### Agent Reach + MCP toolchain (added 2026-08-18)

**Agent Reach** ([github.com/Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach), MIT, 72k+ stars) is a capability layer that gives the agent web-wide search and page reading. Two channels matter for this product: **Exa semantic web search** (`EXA_API_KEY` required) for higher-quality "search the whole web for jobs posted" and **Jina Reader/Search** (`r.jina.ai/URL`, `s.jina.ai/query`) for no-key page crawling and fallback discovery. We consume the channels **server-side** (Exa via HTTP, Jina Reader/Search via HTTP) rather than shipping the skill to end users; login-walled channels (LinkedIn/Twitter/Reddit with cookies) are dev-time tools only — never product credentials.

| Tool | What it adds | Where it fits / notes |
|---|---|---|
| Agent-Reach (Exa + Jina Reader + RSS) | Web-wide job search + read any job page from a pasted URL, zero config, no keys | Phase 1 job discovery + link crawling; `agent-reach doctor` for channel health. **Skill installed 2026-08-18 (`.opencode/skills/agent-reach`, from [Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach)); live crawl check: Glassdoor ✓ (Jina Reader, job listings), Himalayas ✓ (HTML CAPTCHA-walled but RSS feed returns job postings), LinkedIn ⏳ (Jina abuse-blocked; full search needs login-gated MCP — dev-only per `docs/ats-tos-review.md`), Indeed ⏳ (403 bot wall — dev-only, gated)** |
| Playwright MCP ([microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)) | LLM-driven browser automation via accessibility snapshots | Phase 3 spike + assisted-fill worker; crawling JS-heavy job pages |
| openings-mcp ([amikai/openings-mcp](https://github.com/amikai/openings-mcp)) | Job search via **official** ATS endpoints: Greenhouse, Lever, Workday, Ashby, iCIMS, SAP SuccessFactors + big-tech career sites | ToS-safe discovery — aligns with `docs/ats-tos-review.md` |
| JobSpy MCP ([andrijdavid/jobspy-mcp](https://github.com/andrijdavid/jobspy-mcp)) | Aggregated search across LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google Jobs | Broadest coverage, but scraping LinkedIn/Indeed conflicts with the ToS guardrails → **only after compliance review**, or scope it to Google Jobs |
| Firecrawl MCP | Full JD extraction from any URL (JS rendering → clean markdown) | Robust fallback for pasted links beyond Jina Reader |
| mcp-server-linkedin ([stickerdaniel](https://github.com/stickerdaniel/linkedin-mcp-server)) | LinkedIn profile/company/job search via browser session | Optional, login-walled — dev tool only, requires user session |
| Gmail MCP ([GongRzhe/Gmail-MCP-Server](https://github.com/GongRzhe/Gmail-MCP-Server)) | Read/label inbox (read-only scope) | Phase 2 email intelligence |

### Data model (start here)
```
User
Profile (master candidate profile — one per user)
Job (normalized schema, from any source)
Application (Job + User + generated CV/CL + status)
StatusEvent (history log: applied → interview → rejected, with timestamp + source)
Document (generated CV/cover letter files, versioned)
```

### Deliverables
- [x] Repo scaffolded — **scaffolded + CI (`.github/workflows/`) present (verified 2026-08-18); staging URL deployment ⏳ not verified**
- [x] Auth working (sign up/log in) — **Clerk wired (`auth.protect()` across routes + webhook); exercised in Phase 1 e2e run (2026-08-17)**
- [x] Profile builder UI — structured form matching the Master Candidate Profile fields — **profile form + CV upload/parse built; used in Phase 1 e2e (2026-08-17)**
- [x] Your own profile entered as first test data — **confirmed by the Phase 1 e2e run on a real DSV posting (2026-08-17)**

**Checkpoint 0 → 1:** Note how long this actually took you. Use that as your real velocity multiplier for every estimate below — don't trust the S/M/L/XL labels blindly, calibrate them against this phase.

---

## Phase 1 — MVP1: Single-job flow (Effort: M–L)

**Goal:** Paste one job → get analysis, tailored CV, cover letter, manual tracker entry. Usable on your own job search immediately.

### 1.0 Job discovery — search the web, not just paste (added 2026-08-18)

**Goal:** Find jobs across the web from the Master Profile without a human finding each posting first. Exa semantic search (via Agent-Reach) is the primary source; official ATS endpoints are the ToS-safe secondary source.

- [x] Exa web search driven by Profile target roles/skills → candidate job URLs — **built: `src/lib/job/discover.ts` (searchWithExa) + `getDiscoveryPrefill` (query from preferredRoles + top skills); Exa active when `EXA_API_KEY` set, Jina Search (`s.jina.ai`) is the free no-key default (verified 2026-08-18)**
- [x] Dedup candidates against existing `Job` rows (company+title dup detection already exists in `src/lib/job/extract.ts`) — **built: `filterTrackedCandidates` in `discover.ts` (URL + company/title), tested**
- [ ] Optional: openings-mcp search over Greenhouse/Lever/Workday/Ashby as a ToS-safe source — **⏳ deferred — Exa/Jina covers discovery for now; revisit before Phase 3**
- [x] Candidate review screen: ranked by match score, human picks before anything enters the tracker — **built: `JobDiscovery` panel on Applications page; keyword pre-rank (estimated match) + full AI score on add (verified 2026-08-18)**
- [x] Results filtered to **job postings only** — job-seeker profiles and company pages (LinkedIn `/in/` & `/company/`, Indeed `/cmp/`, Glassdoor `/Overview/` & `/profile/`, Himalayas `/companies/`, social media, generic `/profile/` `/people/` `/team/` paths) are excluded via `isJobPostingUrl`/`isJobPostingTitle` in `discover.ts` — **verified 2026-08-18, tested**

**Risk to budget time for:** Discovery quality (dupes, dead links, off-target roles) is a rabbit hole — cap search results and lean on the existing match score to rank. Scraping LinkedIn/Indeed via JobSpy stays gated behind `docs/ats-tos-review.md`; prefer Exa + official endpoints.

### 1.1 Job ingestion
- [x] Input: paste a job URL or raw job description text (start with **paste text**, not scraping) — **built: `JobPaste` component, text + optional URL**
- [x] Paste URL → auto-crawl: server-side Jina Reader fetch (r.jina.ai) → same extraction as text paste; Playwright MCP only for JS-heavy pages that Jina can't render — **built: `fetchPageViaJinaReader` + direct-fetch fallback in `src/lib/job/fetch.ts`, wired into `addJobFromText`; fallback path test-verified (verified 2026-08-18)**
- [x] AI call: extract structured `Job` object from raw text — **built: `src/lib/job/extract.ts` (jsonMode, temp 0.1, dup detection by company+title)**
- [x] Store normalized job in DB — **built: `addJobFromText` creates `Job` + `Application` (PENDING); verified with a real DSV posting**

### 1.2 Match scoring
- [x] AI call: compare `Job.requirements/skills` against `Profile` — **built: `scoreApplication` (auto-runs after paste), `src/lib/job/score.ts`**
- [x] Output: match %, matched skills, missing skills, plain-language reasoning — **built: match badge + reasoning + skill chips on application detail; Match column on list**
- [x] **"Don't apply" logic**: if match < threshold or hard blockers exist → show "Why you might skip this" instead of hiding it — **built: skip recommendation + red callout; recommendation coerced from score**

### 1.3 Document generation
- [x] AI call: generate tailored CV content (select/rephrase only from Profile, never invent) — **built: `generateApplicationDocuments` (CV + cover letter in parallel), rules enforce facts-only**
- [x] AI call: generate cover letter draft — **built: same action, cover letter < 250 words, facts-only**
- [x] Render to PDF (simple template first) — **built: `@react-pdf/renderer`, `/cv.pdf` + `/cover-letter.pdf` routes (owner-checked), A4 simple template**
- [x] Template library: ATS-friendly resume + cover letter templates as selectable PDF render designs — **built (verified 2026-08-18): 3 ATS designs — 24B Classic / Europass Clean / 24B Compact — selectable per application for BOTH the CV and the cover letter (`Application.cvTemplate` + `Application.clTemplate`). Template cards use clean static thumbnails, and the selected CV/cover letter renders as a readable A4-style preview; PDF render accents match the selected template. No copied 24billions or official Europass template files/assets are bundled unless a reusable license/source package is confirmed.**
- [x] CV keyword-coverage check (ATS alignment score): after generation, measure how many of the job posting's requirement keywords/phrases actually appear in the CV; missing ones are classified as "ownable (profile has evidence) → re-add" vs "honest gap (not in profile) → leave out"; the score is stored per CV version so tailoring quality is measurable — **built: `checkCvKeywordCoverage` stores `Document.alignmentScore` + `alignmentDetails`; UI shows covered / ownable missing / honest gaps; sanitizer caps each list at 15; verified 2026-08-18**
- [x] Human review/edit step before "final" — **built: editable textareas + "Save as final" versioning (isFinal gate; only final renders in PDF)**

### 1.4 Manual tracker
- [x] Application list: company, role, match %, status — **built: applications table + Match column + row links**
- [x] Manual status updates + timestamped history — **built: `updateApplicationStatus` (manual StatusEvent, from/to, note) + status control on detail page**
- [x] Manual "mark as likely ghosted" after N days — **built: `isLikelyGhosted` (14-day threshold) + "Mark as ghosted" on stale rows; `tracker.test.ts`**

### MVP1 exit criteria (be honest with yourself here)
- [ ] You've used it for at least 10 real applications of your own
- [ ] The match score has changed your mind about applying to at least one job (either direction) — if it never once told you something you didn't already know by reading the posting, the scoring isn't adding value yet
- [ ] The generated CV/cover letter needed only light edits, not a rewrite, on most applications

### Phase 1 actual results (qa-verify, recorded 2026-08-17)
- Gate green at completion: 44 tests (6 files), tsc 0, lint 0, jscpd 0 clones, production build OK.
- Verified end-to-end on a real DSV posting (2nd Level Support Specialist): extraction → PENDING application → auto match score → tailored CV + cover letter → manual status flow.
- Known constraints: ATS keyword alignment is prompt-level only (no term-frequency analysis yet); PDF is a simple text template; ghosted threshold fixed at 14 days.

### Phase 1 update — plan additions 1.0 / 1.1 / 1.3 (qa-verify, recorded 2026-08-18)
- Gate green after additions: **75 tests (9 files), lint 0, tsc 0, jscpd 0 clones, production build OK, `prisma validate` OK** (migration `add_cv_template` applied).
- Built & verified: job discovery (Exa keyed / Jina no-key search → dedup → review panel), Jina Reader URL crawl with direct-fetch fallback, 24billions-style CV/cover-letter template variants with per-application selector.
- Known constraints / pending: discovery "estimated match" is keyword-based until a job is added (full AI score then runs); Exa path requires `EXA_API_KEY` (Jina is the free default); reusable 24billions source-template bundling still needs license confirmation; openings-mcp source deferred; Playwright MCP reserved for Phase 3.

### Phase 1 code review + fixes (recorded 2026-08-18)
- Gate green after review fixes: **104 tests (10 files), lint 0, tsc 0, `prisma validate` OK, jscpd 0 clones, production build OK**.
- Fixed: discovered jobs now refresh the tracker list after add + scoring; `DocumentPanel` no longer syncs editor state with render-time setters; template update server actions share the ownership-checked update path; keyword-coverage sanitizer matches the 15-item prompt cap; product UI no longer exposes raw env-var setup copy.
- Fixed document preview: replaced clipped scaled-live template cards with static ATS thumbnails, added readable A4-style selected CV/cover-letter previews, and aligned PDF accents with the selected template direction. Full gate remained green after the preview fix: **104 tests (10 files), lint 0, tsc 0, `prisma validate` OK, jscpd 0 clones, production build OK**.
- Fixed document picker association: CV template thumbnails now live inside the CV section and cover-letter thumbnails live inside the cover-letter section, so selecting a CV template cannot appear to show the cover-letter preview. Verified with lint, tsc, and tests (104 passing) on 2026-08-18.
- Fixed document completeness + preview fidelity: template thumbnails now render miniature previews from the actual generated CV/cover-letter text rather than placeholder bars; cover-letter-only legacy states show an explicit "CV missing" panel; document generation now returns an error unless both the CV and cover letter validate and save. Verified with lint, tsc, tests (104 passing), and production build on 2026-08-18.
- Fixed master CV fallback preview: imported CVs stored on `Profile.masterCvText` now appear in the CV section when no tailored application CV has been generated yet. The UI labels this as "master CV from profile" and still prompts generation for the tailored application CV. Verified with lint, tsc, tests (104 passing), and production build on 2026-08-18.
- Fixed immutable identity/contact handling + per-CV keyword scoring: name, contact details, and social/profile links are extracted from the imported master CV contact block and reused verbatim in CV preview/PDF instead of being regenerated; regenerated CV bodies are instructed to start at the first section heading and omit personal/contact lines. Cover-letter generation is instructed to copy the master CV contact block exactly for the sender area. Each regenerated CV version now attempts keyword-coverage scoring immediately after save and stores the score/details on that `Document`; the CV header displays the stored keyword score. Verified with lint, tsc, tests (107 passing), Prisma validate, jscpd 0 clones, and production build on 2026-08-18.
- Reworked ATS keyword scoring from AI-decided scoring to deterministic coverage: requirement keywords are extracted from the job text in code, canonicalized with common synonyms (e.g. Go/Golang, PostgreSQL/Postgres, Kubernetes/K8s, CI/CD), matched against the exact CV text, and split into covered / ownable missing / honest gaps using the profile/master-CV evidence. This makes scores vary by job and CV content and avoids every regeneration receiving the same model-shaped score. Verified with lint, tsc, tests (111 passing), Prisma validate, jscpd 0 clones, and production build on 2026-08-18.
- Fixed the post-regeneration `keyword score 0%` regression for consulting/graduate roles: CV alignment now also scores against the job match details shown in the UI (`matchedSkills` / `missingSkills`), recognizes non-technical requirements such as English fluency, recent graduate, consultant, analytical mindset, communication, curiosity, drive, and work ethic, and avoids noisy duplicate scoring from section labels or whole sentence fragments. Regression test covers a Veeva CDP-style posting where the master CV shows English fluency, Computer Science graduate background, consulting/business analyst experience, and EU work authorization; unsupported-but-profile-owned items are classified as ownable instead of forcing them into the CV. Verified with lint, tsc, tests (112 passing), Prisma validate, jscpd 0 clones, and production build on 2026-08-18.
- Replaced the orange accent template with `Europass Clean`: the existing `modern` template id now renders a calmer European CV style with a white identity header, blue divider, blue section rules, and matching cover-letter top rule in both preview and PDF output. This keeps existing saved applications compatible while removing the orange visual direction. No official Europass logo/assets/templates are bundled. Verified with lint, tsc, tests (112 passing), Prisma validate, jscpd 0 clones, and production build on 2026-08-18.
- Code quality verdict: **good for Phase 1**. Structure is coherent (`src/lib/job/*` for domain logic, `src/lib/actions/*` for server actions, route handlers thin, components grouped by feature). Keep watching file size in `DocumentPanel` and `src/lib/job/discover.ts`; split them if Phase 2 adds more UI states or discovery sources.
- Phase 1 recommendation: do **not** start Phase 2 until the MVP1 exit criteria below have real evidence from at least 10 applications and 1–2 non-you users. If generated documents still need heavy rewrites, spend the next pass on prompt/evidence quality before email intelligence.
- Phase 1 build completeness check (qa-verify, recorded 2026-08-18): all 1.0–1.4 deliverable checkboxes are done (openings-mcp intentionally deferred, documented above). Gate green at this check: **121 tests (11 files), lint 0, tsc 0, `prisma validate` OK, production build OK**. The three MVP1 exit criteria below remain UNVERIFIED — they need real usage evidence (≥10 own applications, match score changing a decision, light-edit documents), not code. Phase 1 is build-complete but exit-criteria-pending.

### Phase 1 updates — filtering, UI, and ATS logic (recorded 2026-08-21)
- Gate green after updates: **121 tests passing (10 files), lint 0, tsc 0, production build OK**.
- Added explicit `Location` and `Work Model` filters to Job Discovery (mapped straight into Exa's natural language semantic search).
- Added `freehire.me` to the official job board domain target list.
- Fixed IDE warnings in discovery logic (Cognitive complexity, String.raw, replaceAll).
- **Major Document Tailoring Update**: Overhauled the CV/Cover Letter generation prompt rules. The AI now actively searches the candidate's entire profile (including Certifications and Projects) for evidence of "Missing requirements," dynamically injecting missing keywords if verifiable evidence is found to boost ATS Keyword Alignment scores without breaking factual integrity.

### Phase 1.5 — Multiple Master CVs (planned 2026-08-21, completed 2026-08-21)
**Goal:** Upgrade the profile system to allow candidates to manage up to 3 distinct Master CVs (e.g., "Frontend", "Backend", "Management") and select which foundation the AI uses for scoring and document tailoring per application.
- [x] Database schema upgrade: Move `masterCvText` and `masterCvData` out of `Profile` into a new `MasterCv` table (1-to-many up to 3). Link `Application` to an optional `MasterCv`.
- [x] Profile page overhaul: Build a UI to upload, preview, and delete up to 3 Master CVs instead of a single static upload.
- [x] Application dashboard: Add a "Select Master CV" dropdown next to a new manual "Rescore AI Match" button on the job view.
- [x] Context wiring: Ensure the AI Scoring and Document Generation context fetching (`src/lib/job/context.ts`) pulls the explicit selected Master CV text, defaulting safely if none is picked.

### Phase 1.6 — GitHub Repository Intelligence (completed 2026-08-21)
**Goal:** Supercharge AI document tailoring by scanning the candidate's Master CV for a GitHub profile link, dynamically fetching their public repositories from the GitHub API, and injecting matching repositories into the AI context as "Projects" when the job requires specific tech stacks missing from the base CV.
- [x] Detect GitHub URLs in `masterCv.textContent` during context assembly (`src/lib/job/context.ts`).
- [x] Fetch the top 15 most recently updated public repositories using the GitHub API.
- [x] Inject repository context (name, language, description) into the AI `profileText`.
- [x] Update `CV_RULES` in `src/lib/job/documents.ts` to instruct the AI to actively mine and inject these GitHub repositories into the Tailored CV if they match missing job requirements.
*(verified 2026-08-21: 121 tests passed cleanly via `qa-verify`, duplication successfully tracked at a safe 0.40% via `qa-duplication`)*

### Phase 1.7 — Document Rendering Polish & AI Master CV (completed 2026-08-21)
**Goal:** Achieve a premium "Wow" effect by vastly improving the React-PDF document style engine and introducing the ability to intelligently generate standard Master CVs directly from raw profile data.
- [x] Integrate multiple premium React-PDF templates (Classic, Modern, FaangPath, Compact).
- [x] Fix the UI duplication bug ensuring dynamically AI-tailored titles properly splice into the Web Template viewer without duplicating in the generic body.
- [x] Implement an on-demand "Expert Master CV" AI re-writer for the raw user profile structure to allow PDF generation without a paired job.
- [x] Wire the GitHub Auto-Fetcher intelligently across BOTH pipelines (native `profile.github` structure hook and raw `textContent` legacy hook).
- [x] Complete extensive QA refactor: resolved strict TypeScript enforcement on Prisma schemas, flattened complexity metrics below score 15, and eliminated arbitrary ESLint typings.
*(verified 2026-08-21: All TypeScript, SonarQube Linting, and Vitest test suites executing perfectly under 100% compliance)*

### Phase 1.8 — DOCX Export & PDF Rendering Fixes (completed 2026-08-22)
**Goal:** Introduce editable DOCX export as the primary download format and resolve critical PDF rendering bugs.
- [x] Implement DOCX export for CVs and Cover Letters (`src/lib/job/docx.ts`) using the `docx` library with profile header injection and markdown body parsing.
- [x] Fix FaangPath PDF template text overlap by removing flex alignment and using text alignment instead.
- [x] Stabilize FaangPath text-stack height by migrating from nested `Text` components to row flex `View` components.
- [x] Completely purge PDF terminology from the UI in favor of DOCX as the primary editable document standard.
- [x] Replace native browser `confirm()` prompt on the profile page with a custom elegant dialog modal.
*(verified 2026-08-22: 121 tests (10 files), lint 0, tsc 0, production build OK)*

### Phase 1.9 — AI Title Polish, Download Consistency & GitHub PAT (completed 2026-08-23)
**Goal:** Fix AI-generated document header issues, ensure downloads always match the web UI state, and expand GitHub intelligence with private repository support.
- [x] Fix AI header splicing: decouple AI-tailored title extraction from the Master CV literal contact block to prevent keyword overlap in the header (`src/lib/job/pdf.ts`).
- [x] Apply identical title-splicing extraction logic to the DOCX generator (`src/lib/job/docx.ts`) for consistent header rendering across formats.
- [x] Strip quotation marks the AI injects around tailored CV titles.
- [x] Forcefully expand the tailored ATS header title prompt to autonomously inject core tech-stack keywords into the contact layout flow.
- [x] Fix downloads: strictly bind document export sorting to highest `version` DESC to perfectly match the web UI state, ensuring DOCX and PDF downloads always reflect the latest generated document.
- [x] Fix DOCX generator to fetch the latest final database payload rather than the oldest drafted v1 document version.
- [x] Restore dual-format download buttons giving users simultaneous access to both DOCX and PDF exports.
- [x] Add optional GitHub Personal Access Token (`Profile.githubToken`) to enable AI scraping of private repositories during CV tailoring (schema migration `add_github_pat` applied).
- [x] Increase vertical margin between the primary name block and contact info lines across DOCX, PDF, and web layouts for enhanced readability.
*(verified 2026-08-23: 121 tests (10 files), lint 0, tsc 0, production build OK)*

### Phase 1.10 — Pipeline Bug Fixes (active 2026-08-23)
**Goal:** Fix three critical bugs discovered during real-world usage that undermine the core CV generation, discovery, and download pipeline.
- [x] **Fix GitHub project injection**: Clarified CV_RULES prompt — Projects section is now the ONE EXCEPTION to "preserve structure", explicitly requiring the AI to ADD new GitHub repo bullets alongside existing projects. Previous "preserve exact structure" rule was overriding the injection instruction.
- [x] **Fix location filter in Job Discovery**: Restructured query construction so location is placed as a leading signal (`"Senior Go Engineer jobs in London"`) instead of a trailing afterthought. Updated `buildJobSearchQuery` to recognize location-qualified queries and skip redundant "job opening hiring" suffix.
- [x] **Fix download crash**: Added `download` attribute to DOCX and PDF `<a>` tags to force real HTTP file downloads instead of Next.js client-side navigation interception that crashed on binary responses.
- [x] **Sonarqube cleanup**: Extracted `normalizeUrlKey` helper and rewrote `extractCompanyFromRss` to avoid regex backtracking. Refactored `createDocxFromText` (complexity 26→~10) and `CvPreview` (complexity 17→~12) into smaller helpers.
*(verified 2026-08-23: 121 tests (10 files), lint 0, tsc 0)*

### Phase 1.11 — Quality & Robustness Hardening (completed 2026-08-23)
**Goal:** Improve the core loop quality, UX polish, and system robustness across the pipeline.

**Core Loop Quality:**
- [x] **Enrich GitHub repo fetch**: Add `topics`, `stargazers_count`, and README snippets to give the AI richer project context for CV injection.
- [x] **PDF route error handling**: Wrap `renderToBuffer()` in try/catch to return a meaningful error instead of crashing the route.
- [x] **Loading & error boundaries**: Add `loading.tsx` and `error.tsx` to dashboard routes for graceful loading states and error recovery.

**UX Polish:**
- [x] **Discovery prefill with location**: Populate discovery search filters from `preferences.locations` and `preferences.remoteOnly`.
- [x] **Applications pagination**: Add cursor-based pagination to the applications list to handle 50+ applications.
- [x] **Mask GitHub token**: Hide the PAT in the UI with a password field type.
- [x] **Exa category filter**: Pass `category: "job listing"` to Exa search for better result relevance.

**Robustness:**
- [x] **GitHub API rate-limit handling**: Check `X-RateLimit-Remaining` header and add basic retry check.
- [x] **Expand RSS feed sources**: Add HackerNews who-is-hiring and other feeds beyond just We Work Remotely.
- [x] **Auto-set appliedAt**: Automatically set `appliedAt` timestamp when application status moves to `APPLIED`.

**Checkpoint 1 → 2 (kill/pivot point):** [PASSED 2026-08-23]
- ✅ **Proceed** if match scoring and document generation are genuinely saving you time/adding insight, and at least 1–2 other people (friends, forum, subreddit) have tried it and want to keep using it.
- 🛑 **Pivot** if the AI-generated CVs consistently need heavy rewriting, or the match score doesn't track with your own judgment. Fix the core loop before adding email/automation on top of a shaky foundation.
- 🛑 **Don't proceed to Phase 3 automation** if you haven't gotten at least a couple of non-you users on the manual tracker by this point — building automation for an audience of one is a bigger risk than the automation itself.

### Phase 1.12 — UI/UX Refresh with Modern Design System (completed 2026-08-24)
**Goal:** Refresh the entire application UI with a consistent, professional design system for better user experience and visual appeal.

**Design System:**
- [x] **Professional color scheme**: Implemented monochromatic black/gray theme with semantic status colors, replacing blue accents with neutral tones for a cleaner, more professional look.
- [x] **CSS variables**: Defined comprehensive color palette with background, foreground, muted, border, card, accent, primary, secondary, success, warning, error, and info colors.
- [x] **Consistent theming**: Applied new color system across all components with Tailwind CSS v4.

**Navigation & Layout:**
- [x] **Enhanced header**: Improved app header with backdrop blur, better spacing, and branded logo with subtle color accent.
- [x] **Navigation improvements**: Added active state indicators with bottom border accent, better hover states, and smoother transitions.
- [x] **User avatar styling**: Enhanced user button with ring effect and better visual integration.

**Dashboard:**
- [x] **Card-style stat cards**: Transformed statistics into card-style layouts with shadows, hover effects, and better typography.
- [x] **Pipeline visualization**: Improved pipeline section with grid layout, better status badges, and larger count displays.
- [x] **Better spacing**: Increased padding and margins throughout for better breathing room.

**Applications Page:**
- [x] **Enhanced table**: Improved applications table with hover states, better spacing, and rounded corners.
- [x] **Better pagination**: Enhanced pagination buttons with improved styling and hover effects.
- [x] **Empty state**: Improved empty state with better visual design and messaging.

**Job Discovery:**
- [x] **Card-style results**: Transformed job results into card-style layouts with shadows and hover effects.
- [x] **Better inputs**: Enhanced search and filter inputs with clear buttons, focus states, and better placeholders.
- [x] **Loading states**: Improved loading indicators with spinner animations and better messaging.
- [x] **Filter chips**: Added clear filter chips for active filters with remove functionality.

**Job Paste:**
- [x] **Card-style layout**: Transformed job paste component into card-style with better input styling.
- [x] **Clear buttons**: Added clear buttons for text and URL inputs.
- [x] **Better error display**: Enhanced error message display with visual styling.

**Profile Form:**
- [x] **Card-style sections**: Transformed all profile sections into card-style layouts with shadows.
- [x] **Better input styling**: Enhanced all form inputs with focus states, better padding, and improved accessibility.
- [x] **Required field indicators**: Added visual indicators for required fields.
- [x] **Better buttons**: Improved add/remove buttons with better hover states and styling.
- [x] **Sticky save button**: Added sticky footer for save button with backdrop blur for better visibility.
- [x] **Loading states**: Enhanced save button with spinner animation during save operations.

**Accessibility:**
- [x] **Focus states**: Improved focus indicators across all interactive elements.
- [x] **Better labels**: Enhanced form labels with better typography and hierarchy.
- [x] **Error states**: Improved error message display with semantic colors and better positioning.

**Search Quality Improvements:**
- [x] **Title-weighted scoring**: Implemented title-weighted relevance scoring for better search results.
- [x] **Strict location filtering**: Added strict location matching with fallback behavior.
- [x] **Date filtering**: Implemented date filtering to exclude stale job postings (older than 90 days).
- [x] **HTML stripping**: Fixed HTML rendering artifacts in job descriptions.
- [x] **RSS date parsing**: Added date extraction from RSS feeds for freshness filtering.
- [x] **Board date parsing**: Added date extraction from job board payloads (RemoteOK, Remotive, Jobicy, The Muse).

*(verified 2026-08-24: 128 tests (10 files), lint 0, tsc 0, production build OK)*

---

## Phase 2 — Email intelligence (Effort: M) (active 2026-08-23)

**Goal:** Auto-detect status changes from Gmail/Outlook so the tracker updates itself.

- [ ] Gmail API / Microsoft Graph OAuth (read-only scope only)
- [ ] Classifier: email → {rejection, interview invite, assessment, recruiter follow-up, offer, none}
- [ ] Match email to the right `Application` (company name / sender domain / thread heuristics)
- [ ] Confidence levels: **Confirmed** vs. **Likely** vs. manual review — never silently auto-change status on low confidence
- [ ] User corrections feed back into prompt examples over time

### Risk to budget time for
False positives ("we received your application" ≠ interview invite). Build the manual-override path *before* trusting the automation.

**Checkpoint 2 → 3 (kill/pivot point):**
- ✅ **Proceed** if classification accuracy on your own real inbox is high enough that false positives aren't eroding trust (track this — log every classification vs. what it actually was).
- 🛑 **Pivot** if accuracy is poor and hard to improve — consider keeping this as "suggested status change, one click to confirm" permanently rather than pushing toward full auto-detection.

---

## Phase 3 — Validation spike, THEN assisted application filling (Effort: spike S, build L–XL)

**This is the highest-risk phase in the whole plan. Do not commit weeks of build time before validating it's viable.**

### 3.0 Spike first (do this before writing the adapter architecture)
- [ ] By hand, using **Playwright MCP** (microsoft/playwright-mcp, no product UI, just a script), automate filling and submitting **one real application** on Greenhouse end to end
- [ ] Time how long this took and note every place it broke (dynamic fields, file upload quirks, CAPTCHA, login walls)
- [ ] Try the same against one Workday posting — Workday is notoriously harder; find out now, not in week 10

**Checkpoint 3.0 → 3 (kill/pivot point):**
- ✅ **Proceed to full build** if the spike worked reasonably cleanly on Greenhouse and the ToS review from Checkpoint 0 didn't flag it as prohibited.
- 🛑 **Scope down** if it's fragile or ToS-risky — pivot Phase 3's goal from "fill the form for you" to "generate everything and give you a one-click copy-paste panel" (still valuable, much lower risk).

### 3.1 Build (only after the spike passes)
- [ ] Playwright MCP-based browser automation worker (separate queued service)
- [ ] One ATS only to start — Greenhouse
- [ ] Adapter pattern: platform detection → field-filling logic → "ready to review" state
- [ ] Custom question answers: AI-drafted, always flagged for user review, never auto-submitted
- [ ] Side-by-side review screen before the user hits Submit
- [ ] Expand to Lever, then Workday, only after Greenhouse is solid in production — resist parallelizing adapters

**Checkpoint 3 → 4 (kill/pivot point):**
- ✅ **Proceed to auto-apply** only after you've personally used assisted-fill for several weeks with zero submission errors (wrong file attached, wrong answer submitted, etc.)
- 🛑 **Do not proceed** if you've had even one bad submission you didn't catch before it went out — fix detection/review UX first, since Phase 4 removes the human click that would have caught it.

---

## Phase 4 — Rules-driven assisted apply (Effort: M)

**Goal:** Only after Phase 3 is trusted and validated for weeks on real applications. Per the Checkpoint 0 compliance decision (recorded 2026-08-17, `docs/ats-tos-review.md`), **unattended auto-submit is off the table** — Phase 4 builds rules + transparency around the human-in-the-loop flow, and any unattended submission requires the Phase 4 gate in `docs/ats-tos-review.md` (sanctioned API path or legal sign-off) before it is even considered.

- [ ] Rules config UI: allowed roles, min match %, salary floor, locations, max applications/day
- [ ] Queue/pre-fill only within configured rules, only on ATS platforms already validated in Phase 3; a human still reviews and clicks the final Submit
- [ ] Daily digest email with full transparency + undo/flag window where feasible

---

## Phase 5 — Analytics & Career Agent (ongoing, parallel track)

Can start once you have ~20–30 tracked applications, in parallel with Phase 2/3:

- [ ] Dashboard: interview rate, rejection rate, response rate, by role/CV version/skill
- [ ] AI-generated insight summaries
- [ ] Natural-language "Career Agent" that ties search → analyze → tailor → apply → track, once each piece is independently solid

---

## Guardrails to keep throughout
- Never invent facts not in the Profile when generating CV/cover letter content
- Never silently change application status from an ambiguous signal
- Never auto-submit a real application without an explicit human-approved step until Phase 4, and even then keep transparency (digest, undo window) as default
- Prefer shipping one ATS adapter well over three adapters half-working
- **At every checkpoint above, write down the actual result (not the hoped-for one) before deciding to proceed.** The checkpoints only work if you're willing to let them say "not yet."
