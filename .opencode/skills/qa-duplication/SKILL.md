---
name: qa-duplication
description: Use when checking code quality for duplication — before commits, during review, or when CI flags duplication. Runs jscpd on the codebase, reviews reported clones for whether they're real issues or false positives, and reports per-file findings. Read-only; never fixes code — hands off fixes to write-code.
---

# QA — Duplication Check

Checks the codebase for copy-paste duplication (DRY violations). This is part of the project's quality bar (enforced in CI) and runs before commits and at code review time.

## Process

1. **Run the duplication scanner** (from repo root):
   - `npx jscpd src --config jscpd.json` (or `npm run qa:duplication` if the script exists)
2. **Review the report** — for each flagged clone group, determine:
   - **Real issue**: duplicated logic that should be extracted (shared util, hook, component, server action). Note the files + lines.
   - **False positive**: unavoidable repetition (schema mirrors, near-identical test fixtures, generated code, UI patterns that legitimately repeat). State why it's acceptable.
3. **Check threshold** — the project threshold is set in `jscpd.json` (currently 5%). Report whether the run passes or fails it, with the measured percentage.

## Rules

- This skill is **read-only**: it reports and recommends; it does NOT edit files.
- Do not suggest aggressive abstractions for UI repetition in this codebase — the convention is to prefer small, dedicated components, not premature generic abstractions.
- Never modify `jscpd.json` thresholds to make a failure go away. If a threshold feels wrong, raise it with the user and record the decision.

## Exit / handoff

- Report: pass/fail vs. threshold, real issues (path:line), false positives reviewed, recommended fixes.
- If real duplication is found: hand off to `write-code` (after user confirmation), then re-run this skill to confirm the fix.
- If clean: report "no real duplication found" and hand back to the active stage (verify-before-commit gate includes duplication in CI).