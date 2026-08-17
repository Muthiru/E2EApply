---
name: write-code
description: Use when implementing, editing, or refactoring code for this project (E2E Apply). Follows the project's conventions, scopes work to the current build-plan phase, and respects the compliance guardrails. After finishing, hands off to verify-before-commit — never commits.
---

# Write Code

Implement or edit code for the E2E Apply project. Scope is determined by `e2e-apply-build-plan-v2.md` (source of truth). This skill NEVER commits — the commit path goes through verify-before-commit.

## Before writing

1. Run the `read-verify` skill first if it hasn't run this session (or read the build plan + relevant files yourself).
2. Re-read `docs/ats-tos-review.md` Checklists — compliance guardrails apply to all code, not just Phase 3 (e.g., never build unattended auto-submit, never bypass bot controls).

## Conventions (from the tech stack in the build plan)

- **Next.js + TypeScript, App Router, `src/` dir, import alias `@/*`** — server components by default; add `"use client"` only when needed.
- **Tailwind v4 + shadcn/ui** — prefer existing components over new ones; don't introduce a new UI library.
- **Prisma + PostgreSQL** — all data access through Prisma; schema changes go through migrations (`npx prisma migrate dev`).
- **Zod** for validation, shared between client and server where practical.
- **Auth: Clerk** — no hand-rolled auth. Protect routes via middleware/clerk, never trust client-side checks.
- **AI: provider-agnostic wrapper under `src/lib/ai/`** — never call an LLM provider directly from feature code.
- No code comments unless the user asks. Follow the style of neighboring files.

## Guardrails (non-negotiable)

- Never invent facts not in the user's Profile when generating CV/cover letter content.
- Never silently change application status from an ambiguous signal — always require confidence levels or human review.
- Never automate the final submit of an application without a human-approved review step; never bypass CAPTCHA/bot detection.
- Never commit secrets or `.env*` files (`.env*.local` is gitignored; `.env.example` is the committed template).

## Quality bar

- Type-check and lint clean (`npx tsc --noEmit`, `npm run lint`).
- Keep changes scoped to the task; don't refactor unrelated code.
- If a task is bigger than one phase/plan item, stop and confirm scope with the user first.

## Exit / handoff

- After finishing, summarize what changed (files + why, with `path:line` references).
- **Do NOT commit. Do NOT push.** Hand off to the `verify-before-commit` skill: end with *"Changes ready. Run verify-before-commit to gate the commit."* — and wait for the user to confirm before the gate runs.
