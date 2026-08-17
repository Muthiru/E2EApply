# AGENTS.md — E2E Apply working agreement

This project uses a **skill-gated workflow**. The build plan (`e2e-apply-build-plan-v2.md`) is the source of truth for WHAT to build; the skills define HOW to work. Follow the chain on every task — never skip a gate, never commit without approval.

## The workflow chain (one stage at a time)

```
read-verify → write-code → verify-before-commit → commit
                      ↑            ↓
                    (fixes)   qa-verify (at checkpoints / exit criteria)
                            qa-duplication (quality review)
```

1. **read-verify** — Before any change: read the plan, verify actual state, report. Read-only. Requires user confirmation to proceed.
2. **write-code** — Implement, scoped to the current phase, following conventions. Never commits.
3. **verify-before-commit** — Mandatory gate before ANY commit: lint + typecheck + Prisma validate + build + tests, diff review for secrets/unintended files, scope check. **Requires explicit user approval.**
4. **commit** — Only after the gate passed AND user approved this exact change set. Conventional message, no push unless asked.
5. **qa-verify** — At phase checkpoints: run tests, validate behavior, record ACTUAL results in the plan doc. Only edits the plan doc.
6. **qa-duplication** — Run jscpd on the codebase; report real duplication vs. false positives. Read-only.

## Hard rules

- **No commit without the verify-before-commit gate + explicit user approval.** Ever.
- **No push** unless the user explicitly asks.
- Never commit `.env*` (real) or secrets; `.env.example` is the committed template.
- The `docs/ats-tos-review.md` guardrails apply to all code: no unattended auto-submit, no bypassing bot controls, human-in-the-loop submits only.
- The plan doc's checkboxes are only marked done with evidence (see qa-verify).

## Commands

- `npm run dev` — dev server (needs `docker compose up -d` for Postgres + Clerk keys in `.env.local`)
- `npm run lint`, `npx tsc --noEmit`, `npx prisma validate`, `npm run build` — the gate suite
- `npm run qa:duplication` — jscpd duplication check (threshold 5%)
- `npx prisma migrate dev` — schema migrations
- `docker compose up -d` — local Postgres
- CI (GitHub Actions, `.github/workflows/`): `ci.yml` runs the full gate + duplication on every push/PR to main; `sonarqube.yml` scans when `SONAR_TOKEN` + `SONAR_HOST_URL` secrets exist

## Context docs

- `e2e-apply-build-plan-v2.md` — what we're building, phases, checkpoints (source of truth)
- `docs/ats-tos-review.md` — compliance reference + checklists (living doc, read the Quick Reference first)