---
name: verify-before-commit
description: Use BEFORE ANY git commit in this project — the mandatory gate. Runs the full verification suite (lint, typecheck, Prisma validate, build, tests), reviews the diff for secrets/unintended files, and REQUIRES explicit user confirmation before the commit skill may run. Never commits itself.
---

# Verify Before Commit — the Gate

This skill is the mandatory checkpoint between writing code and committing. Nothing gets committed unless this gate passes AND the user explicitly approves. Never stage, never commit, never push in this skill.

## Process

1. **Run the full verification suite** (from the repo root, sequentially):
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npx prisma validate` (if `prisma/schema.prisma` exists)
   - `npm run build` (if the app builds; skip with a note if the change is docs-only)
   - Run tests if any exist (`npm test` / the project's test script — check `package.json`)
2. **Inspect the diff** — `git status --porcelain` and `git diff` (or `git diff --cached`):
   - Reject any unintended files (build artifacts, `node_modules`, `.env*` real secrets, logs).
   - Reject any hardcoded secrets/API keys anywhere in the diff.
   - Check for TODO/FIXME/debug leftovers and stub code not part of the task.
3. **Re-check scope** — does the diff match the build-plan item it claims to implement? Call out anything unrelated.
4. **Report** — a concise gate result table: check → pass/fail (with error text if failed), files changed summary, scope verdict, compliance note (against `docs/ats-tos-review.md` guardrails).

## Failure handling

- If any check fails or anything is rejected: **stop. Do not commit.** Fix the issue (with the user's approval), then re-run this skill from the top.

## Exit / handoff

- If all checks pass, present the summary and **ask for explicit approval**: *"Gate passed. Approve the commit?"* Use a question to the user.
- Only after the user says **yes/approve**: hand off to the `commit` skill with the approved diff. Do not commit here.
- If the user declines: stop and return to write-code for fixes.
