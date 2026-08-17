# E2E Apply

An AI-powered job application OS that takes a job from discovery to outcome — not a CV generator. The core differentiator: a tracker that closes the loop, and a "why you shouldn't apply" filter that saves time instead of just generating volume.

Compliance note: this product is **human-in-the-loop only** — automation pre-fills and validates, a human reviews and clicks the final submit. See `docs/ats-tos-review.md` for the full decision and checklists.

## Stack

- Next.js 16 (App Router, TypeScript) + Tailwind CSS
- PostgreSQL 16 (local: Docker) + Prisma 7
- Clerk (auth)
- Gemini (AI, behind a provider-agnostic wrapper in `src/lib/ai/`)

## Getting started

Prerequisites: Node 20+, Docker.

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env.local
#    Fill in Clerk keys (https://dashboard.clerk.com) and GEMINI_API_KEY
#    (https://aistudio.google.com/apikey)

# 4. Apply the database schema
npx prisma migrate dev

# 5. Run the dev server
npm run dev
```

Open http://localhost:3000. Sign up, then build your master candidate profile at `/profile`.

## Scripts

- `npm run dev` — dev server
- `npm run lint` / `npx tsc --noEmit` / `npm run build` — code quality suite
- `npx prisma validate` / `npx prisma migrate dev` — schema checks and migrations
- `npm test` — unit tests (vitest)
- `npm run qa:duplication` — duplication check (jscpd, threshold 5%)

## Repository docs

- `e2e-apply-build-plan-v2.md` — build plan, phases, checkpoints (source of truth)
- `docs/ats-tos-review.md` — ATS terms compliance reference + checklists (living doc)
- `AGENTS.md` — working agreement: skill-gated workflow (read-verify → write-code → verify-before-commit → commit)