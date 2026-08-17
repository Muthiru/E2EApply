---
name: qa-verify
description: Use when running tests, validating behavior, or recording build-plan checkpoint/exit-criteria results (e.g., "Phase 0 exit criteria", "does the app work"). Runs the project's test suite and manual validation steps, then records the ACTUAL result in the plan doc per the build plan's guardrail. Never edits product code; may only update the plan doc's checklist.
---

# QA Verify

Validates that what was built actually works, and records honest checkpoint results in `e2e-apply-build-plan-v2.md`. The build plan's guardrail: *"At every checkpoint, write down the actual result (not the hoped-for one)."*

## When to run

- Before/after each phase's exit criteria are claimed.
- When the user asks "does it work?", "run the tests", or wants a checkpoint recorded.
- Before a new phase starts, to confirm the previous phase's exit criteria.

## Process

1. **Determine the target** — which phase/checkpoint or feature is being validated. Read the relevant section of `e2e-apply-build-plan-v2.md`.
2. **Run automated checks** — the project's test script (check `package.json` for `test`/`qa` scripts; if none exists, report that as the actual current state). Include `npm run lint`, `npx tsc --noEmit`, `npm run build` when relevant.
3. **Manual validation** — for UI flows (e.g., auth, profile builder), enumerate concrete steps and their expected outcomes, then execute them (via dev server / API calls / `curl`). Record what ACTUALLY happened.
4. **Exit criteria review** — for each checkbox in the target phase's exit criteria, mark:
   - ✅ verified (with evidence — command output, URL, observed behavior)
   - ⏳ not yet / partially (describe what's missing)
   - Do NOT mark a checkbox done on intent alone.
5. **Record** — update `e2e-apply-build-plan-v2.md` checkboxes + add a dated note of the actual result (e.g., `(verified 2026-08-17: ...)`) or a line in the Change log section if the doc has one.

## Rules

- This skill may ONLY edit `e2e-apply-build-plan-v2.md`. Never product code, never docs that aren't the plan.
- Never fake a result to make a checkpoint pass — report failure honestly; the checkpoint system only works if it can say "not yet".
- If a checkpoint says "don't proceed", say so loudly and recommend the pivot the plan defines.

## Exit / handoff

- Summarize: pass/fail per exit criterion, what was recorded, and whether the phase may proceed.
- Hand off to `verify-before-commit` (the plan doc edit needs the gate too) if changes are ready to commit.
