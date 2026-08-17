# E2E Apply

An AI-powered job application OS — from job discovery to outcome.

Not just another CV generator. Paste a job, get an honest match score (including the reasons to skip it), a tailored CV and cover letter, and a tracker that closes the loop: applied → assessment → interview → offer, or rejection.

Human-in-the-loop by design — E2E Apply drafts and pre-fills; you review and click the final submit.

## Features

- **Job tracking** — paste any job description and it's added to your tracker as a structured record: role, company, location, salary, requirements.
- **Master candidate profile** — one structured profile (skills, experience, education, projects, certifications, preferences) that powers everything else.
- **CV import** — upload a PDF or DOCX and the profile form fills itself; review and save.
- **Match scoring** — every job gets an honest score against your profile, including the reasons you might want to skip it.
- **Tailored documents** — CV and cover letter generated per job, always from your profile's facts — never invented.
- **Closing the loop** — every application tracked with status history, so you always know where things stand.

## Tech stack

- **Frontend:** Next.js 16 (App Router, TypeScript) + Tailwind CSS 4
- **Backend:** Next.js server actions & route handlers
- **Database:** PostgreSQL 16 + Prisma 7
- **Auth:** Clerk
- **AI:** Gemini (provider-agnostic wrapper in `src/lib/ai/`)
- **Tests:** Vitest · **CI:** GitHub Actions + SonarQube

## Getting started

Prerequisites: Node 20+, Docker.

```bash
npm install
docker compose up -d
cp .env.example .env.local      # add your keys (see below)
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000, sign up, and build your profile at `/profile`.

### Environment variables

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks |
| `DATABASE_URL` | PostgreSQL connection string (pre-filled for docker-compose) |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npx prisma validate` | Schema check |
| `npm test` | Unit tests |
| `npm run build` | Production build |
| `npm run qa:duplication` | Duplication check |

## Project structure

```
src/
├── app/
│   ├── (app)/            # Dashboard, applications, profile
│   ├── api/              # CV parsing endpoint, Clerk webhook
│   └── page.tsx          # Landing page
├── components/           # Job paste, CV upload, profile form
└── lib/
    ├── actions/          # Server actions
    ├── ai/               # AI provider wrapper
    ├── cv/               # CV text extraction & sanitizing
    ├── job/              # Job extraction from pasted text
    └── validations/      # Zod schemas
```

## Documentation

- `docs/ats-tos-review.md` — ATS terms-of-service review and compliance checklists
- `e2e-apply-build-plan-v2.md` — build plan and phase checkpoints