---
name: commit
description: Use when committing changes — ONLY after verify-before-commit has passed with explicit user approval in this session. Inspects status/diff/log, stages only intended files, writes a conventional commit message matching repo style, commits (no push unless explicitly asked). Refuses to run if the gate hasn't passed.
---

# Commit

Commits approved changes. **Prerequisite: the `verify-before-commit` gate passed and the user explicitly approved the commit for THIS set of changes.** If that hasn't happened in this session, stop and run verify-before-commit first — do not proceed.

## Refusals (stop immediately)

- No explicit gate approval in this session → refuse, point to verify-before-commit.
- Staged/unstaged content includes secrets, `.env*` (real), or unrelated files → refuse and report.
- User asks to commit without verification → refuse; the gate is mandatory.

## Process

1. `git status` — confirm exactly what's changed since the gate ran.
2. `git diff` (unstaged + cached) — re-verify nothing unintended slipped in; if new changes appeared after the gate, stop and re-run verify-before-commit.
3. `git log --oneline -10` — match the repo's commit message style.
4. Stage only intended files: `git add <files>` (never `git add -A` blindly — review first). Never stage `.env*` files (except `.env.example`).
5. Commit with a concise message in the repo style (current style: `type(scope): summary`, e.g. `docs: ...`, `feat: ...`):
   - Do not add "Signed-off-by", co-authors, or extra trailers the repo doesn't use.
   - Reference the plan doc/phase if relevant (e.g., `(Phase 0)`).

## After committing

- Report: commit hash, summary, what was included.
- **Do NOT push unless the user explicitly asks** (no `git push` in this skill by default; a `push` step exists only if requested).
- Do not amend, rebase, force-push, or rewrite history. If a commit is wrong, make a new commit or ask.
