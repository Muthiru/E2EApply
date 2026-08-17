# E2E Apply — Build Plan (v2)

**Positioning:** An AI-powered job application OS that takes a job from discovery to outcome — not a CV generator.

**Core differentiator:** The tracker that closes the loop, and the "why you shouldn't apply" filter that saves time instead of just generating volume.

**What changed from v1:** Calendar-week estimates removed (they were placeholders, not real). Added a validation spike before the highest-risk phase, explicit kill/pivot criteria at every checkpoint, and an earlier point where someone other than you uses it. Effort is given in relative sizing (S/M/L/XL), not dates — plug in your own real dates once you know your velocity from Phase 0.

---

## 0. Before writing code

- [ ] Check domain availability: `e2eapply.com`, `.io`, `.app`, `.co`
- [ ] Check trademark conflicts (USPTO TESS search, EUIPO if targeting EU) — note: an existing Google Play app called "e2eJobs" is close enough in name to check for confusion/SEO overlap before committing
- [x] Read the ToS of 2–3 major ATS platforms (Greenhouse, Lever, Workday) specifically for language on automated form submission or bot access. **Result recorded in `docs/ats-tos-review.md`** (2026-08-17)
- [ ] Set up repo, project board, and this doc as the source of truth

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
- [ ] Repo scaffolded, deployed to a staging URL
- [ ] Auth working (sign up/log in)
- [ ] Profile builder UI — structured form matching the Master Candidate Profile fields
- [ ] Your own profile entered as first test data

**Checkpoint 0 → 1:** Note how long this actually took you. Use that as your real velocity multiplier for every estimate below — don't trust the S/M/L/XL labels blindly, calibrate them against this phase.

---

## Phase 1 — MVP1: Single-job flow (Effort: M–L)

**Goal:** Paste one job → get analysis, tailored CV, cover letter, manual tracker entry. Usable on your own job search immediately.

### 1.1 Job ingestion
- [ ] Input: paste a job URL or raw job description text (start with **paste text**, not scraping)
- [ ] AI call: extract structured `Job` object from raw text
- [ ] Store normalized job in DB

### 1.2 Match scoring
- [ ] AI call: compare `Job.requirements/skills` against `Profile`
- [ ] Output: match %, matched skills, missing skills, plain-language reasoning
- [ ] **"Don't apply" logic**: if match < threshold or hard blockers exist → show "Why you might skip this" instead of hiding it

### 1.3 Document generation
- [ ] AI call: generate tailored CV content (select/rephrase only from Profile, never invent)
- [ ] AI call: generate cover letter draft
- [ ] Render to PDF (simple template first)
- [ ] Human review/edit step before "final"

### 1.4 Manual tracker
- [ ] Application list: company, role, match %, status
- [ ] Manual status updates + timestamped history
- [ ] Manual "mark as likely ghosted" after N days

### MVP1 exit criteria (be honest with yourself here)
- [ ] You've used it for at least 10 real applications of your own
- [ ] The match score has changed your mind about applying to at least one job (either direction) — if it never once told you something you didn't already know by reading the posting, the scoring isn't adding value yet
- [ ] The generated CV/cover letter needed only light edits, not a rewrite, on most applications

**Checkpoint 1 → 2 (kill/pivot point):**
- ✅ **Proceed** if match scoring and document generation are genuinely saving you time/adding insight, and at least 1–2 other people (friends, forum, subreddit) have tried it and want to keep using it.
- 🛑 **Pivot** if the AI-generated CVs consistently need heavy rewriting, or the match score doesn't track with your own judgment. Fix the core loop before adding email/automation on top of a shaky foundation.
- 🛑 **Don't proceed to Phase 3 automation** if you haven't gotten at least a couple of non-you users on the manual tracker by this point — building automation for an audience of one is a bigger risk than the automation itself.

---

## Phase 2 — Email intelligence (Effort: M)

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
- [ ] By hand, using Playwright (no product UI, just a script), automate filling and submitting **one real application** on Greenhouse end to end
- [ ] Time how long this took and note every place it broke (dynamic fields, file upload quirks, CAPTCHA, login walls)
- [ ] Try the same against one Workday posting — Workday is notoriously harder; find out now, not in week 10

**Checkpoint 3.0 → 3 (kill/pivot point):**
- ✅ **Proceed to full build** if the spike worked reasonably cleanly on Greenhouse and the ToS review from Checkpoint 0 didn't flag it as prohibited.
- 🛑 **Scope down** if it's fragile or ToS-risky — pivot Phase 3's goal from "fill the form for you" to "generate everything and give you a one-click copy-paste panel" (still valuable, much lower risk).

### 3.1 Build (only after the spike passes)
- [ ] Playwright-based browser automation worker (separate queued service)
- [ ] One ATS only to start — Greenhouse
- [ ] Adapter pattern: platform detection → field-filling logic → "ready to review" state
- [ ] Custom question answers: AI-drafted, always flagged for user review, never auto-submitted
- [ ] Side-by-side review screen before the user hits Submit
- [ ] Expand to Lever, then Workday, only after Greenhouse is solid in production — resist parallelizing adapters

**Checkpoint 3 → 4 (kill/pivot point):**
- ✅ **Proceed to auto-apply** only after you've personally used assisted-fill for several weeks with zero submission errors (wrong file attached, wrong answer submitted, etc.)
- 🛑 **Do not proceed** if you've had even one bad submission you didn't catch before it went out — fix detection/review UX first, since Phase 4 removes the human click that would have caught it.

---

## Phase 4 — Controlled auto-apply (Effort: M)

**Goal:** Only after Phase 3 is trusted and validated for weeks on real applications.

- [ ] Rules config UI: allowed roles, min match %, salary floor, locations, max applications/day
- [ ] Auto-apply only within configured rules, only on ATS platforms already validated in Phase 3
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
