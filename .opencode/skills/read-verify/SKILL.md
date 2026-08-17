---
name: read-verify
description: Use when exploring, reading, or verifying the current state of the codebase BEFORE any changes — and after code has been written, before moving on. Read-only skill: never edits files. Maps what exists against e2e-apply-build-plan-v2.md and docs/ats-tos-review.md, reports status, and requires explicit user confirmation to proceed.
---

# Read & Verify

Read-only skill. **Never edit files, never run git commit, never write code.** Your job is to establish ground truth about the project and verify it against the plan.

## When this skill is active

- Start of any new task: establish what exists vs. what the plan expects.
- After code has been written: confirm the changes actually match the plan item they were for.
- Whenever the user asks "what did we do so far?" or "where are we?"

## Process

1. **Read the source of truth** — `e2e-apply-build-plan-v2.md`. Identify the current phase and the checkboxes relevant to the task at hand.
2. **Check project context** — `docs/ats-tos-review.md` Quick Reference + checklists (this is a living compliance doc; product decisions depend on it), `README.md`, `AGENTS.md`.
3. **Verify actual state** — read the code that should implement the plan items. Confirm with evidence:
   - Do the files exist? Are the models/fields/routes actually implemented, or stubs?
   - Run read-only checks: `npm run lint`, `npx tsc --noEmit`, `npx prisma validate` (these do not modify files).
   - If the plan doc has checkboxes, only report them as done if the code proves it.
4. **Report** — give a concise status: phase, what's done (with file paths + line references), what's missing, what's risky. Do not fix anything in this skill.

## Exit / handoff

- State whether the project is ready for the next step (write-code) or what blocks it.
- **Get explicit user confirmation before proceeding.** End your response with: *"Ready to proceed to write-code? Confirm to continue."*
- If the user says no or flags an issue, stop and address their concern before anything else.
