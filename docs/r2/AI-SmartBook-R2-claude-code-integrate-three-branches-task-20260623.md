# AI-SmartBook-R2 Claude Code Task — Integrate Three Feature Branches

Date: 2026-06-23

## 1. Purpose

This document is a Claude Code handoff task for integrating the three R2 feature branches into one integration branch and validating the combined result on the real E500 / AI-SmartBook-R2 workspace.

The goal is not to create another isolated feature branch. The goal is to combine the three already-developed R2 modules and perform a true integration validation.

## 2. Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

At the end of the task, Claude Code must include:

```text
建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 3. Repository and Workspace

Repository:

```text
b827262-cell/AI-SmartBook-R1
```

Local R2 workspace:

```text
/home/b827262/project/AI-SmartBook-R2
```

Stable base branch:

```text
feat/ai-smartbook-r2-modular-imports
```

New integration branch to create:

```text
feat/r2-integrate-imports-notes
```

## 4. Branches to Integrate

Integrate these three feature branches:

```text
feat/r2-question-bank-json-import
feat/r2-smart-solve-json-import
feat/r2-ai-notes-navigation
```

Known completed work:

### Branch A — Question Bank JSON Import

```text
Branch: feat/r2-question-bank-json-import
Initial implementation commit: 9bc0f78
Verification update commit: be652e4
Acceptance/report commit: 53df5c8
```

Known status:

```text
Typecheck: PASS
Frontend build: PASS
runMigrations(): PASS
Question-bank import API endpoints: PASS
DB persistence: PASS
Admin frontend: HTTP 200
.env/db committed: no
```

### Branch B — Smart Solve JSON Import

```text
Branch: feat/r2-smart-solve-json-import
Implementation commit referenced by report: b2e380b
Termination report commit: 682ebb0
```

Known status:

```text
Typecheck: PASS
Frontend build: PASS
Migration: PASS
Runtime API tests: 9/9 PASS
DB persistence: PASS
.env/db committed: no
Independent from Branch A: yes
```

### Branch C — AI Notes Navigation

```text
Branch: feat/r2-ai-notes-navigation
SQLite verification report commit: 1a8d04f
```

Known status from SQLite verification report:

```text
smart_book_notes reused existing table
chapter_id / page_number / source_message_id already exist
Navigate API was reported as verified with anchor true / false examples
.env/db committed: no
```

Important caution:

Branch C must be inspected carefully before integration. Confirm that it contains the actual AI Notes Navigation implementation, not only a report. At minimum it should include:

```text
GET /api/student/books/:bookId/notes/:noteId/navigate
student client method or equivalent
SmartNotesPanel / reader click-to-navigate behavior
fallback behavior for notes without page or chapter metadata
```

If Branch C does not contain actual implementation code, stop and report `blocker` instead of merging a report-only branch.

## 5. Why This Integration Is Needed

A prior acceptance report was created at:

```text
docs/validation/R2_ACCEPTANCE_REPORT_2026-06-22.md
```

That report is useful but is not a full E500 end-to-end acceptance signoff because:

```text
local listen sockets were blocked in that Codex environment
browser/manual UI acceptance could not be performed there
that checkout did not expose all Branch A/B/C routes and APIs at the same time
student app TypeScript errors were observed in BookReaderPage.tsx
```

Therefore, this integration task must validate the combined feature set in the real AI-SmartBook-R2 workspace.

## 6. Non-Negotiable Safety Rules

1. Do not commit `.env`.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, or temporary files.
4. Do not directly merge MySQL-oriented reference branches.
5. Do not force-push unless the user explicitly approves it.
6. Do not delete local database files.
7. Do not hide merge conflicts or validation failures.
8. If any branch is report-only or missing required implementation, stop and report `blocker`.
9. If merge conflicts are non-trivial, stop and summarize the conflict files before editing.
10. Keep all changes on `feat/r2-integrate-imports-notes`; do not push implementation changes directly to `feat/ai-smartbook-r2-modular-imports`.

## 7. Integration Strategy

Claude Code should create a fresh integration branch from the stable base branch:

```text
feat/ai-smartbook-r2-modular-imports
```

Then integrate the three feature branches in this recommended order:

```text
1. feat/r2-question-bank-json-import
2. feat/r2-smart-solve-json-import
3. feat/r2-ai-notes-navigation
```

Reasoning:

```text
Branch A and Branch B both touch admin schema/db/server/admin UI paths.
Branch C touches student note navigation and reader behavior.
Merging admin import features first makes reader-side conflicts easier to isolate.
```

If Branch A and Branch B both added similar migration/repository patterns, preserve both modules without collapsing them into one generic abstraction during this integration. Avoid broad refactoring.

## 8. Pre-Integration Checklist

Before merging, Claude Code must inspect:

```text
current branch
working tree status
remote branch availability
latest commit of each feature branch
changed file list for each feature branch
```

Expected local workspace:

```text
/home/b827262/project/AI-SmartBook-R2
```

Expected worktree:

```text
clean, except ignored local runtime files such as .env, DB, logs, and optional local tool directories
```

If `.claude/` exists as untracked local state, do not commit it.

## 9. Merge Requirements

After creating the integration branch, merge the three feature branches one by one.

For each merge:

1. Record branch name and merge result.
2. If no conflict, continue.
3. If conflict occurs, inspect the conflict.
4. If conflict is small and obvious, resolve conservatively.
5. If conflict affects shared schema, DB migrations, server route order, App router, or reader state flow in a non-trivial way, stop and report `blocker`.

Expected conflict-prone files:

```text
packages/schema/src/index.ts
packages/db/src/schema.ts
packages/db/src/migrate.ts
packages/db/src/repositories/index.ts
apps/AI-adm-D1/src/server/index.ts
apps/AI-adm-D1/src/api.ts
apps/AI-adm-D1/src/App.tsx
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx
apps/AI-Stu-R1/src/studentClient.ts
```

## 10. Required Integrated Feature Set

The integration branch must expose all three features at the same time.

### 10.1 Question Bank JSON Import

Expected route/API:

```text
/admin/import/question-bank
POST /api/admin/import/question-bank/jobs
GET  /api/admin/import/question-bank/jobs
GET  /api/admin/import/question-bank/jobs/:jobId
```

Expected persistence:

```text
question_bank_import_jobs
```

### 10.2 Smart Solve JSON Import

Expected route/API:

```text
/admin/import/smart-solve
POST /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs/:jobId
```

Expected persistence:

```text
smart_solve_import_jobs
smart_solve_import_items
```

### 10.3 AI Notes Navigation

Expected API and UI behavior:

```text
GET /api/student/books/:bookId/notes/:noteId/navigate
click note with pageNumber -> reader jumps to page
click note without pageNumber/chapterId -> no crash, fallback message or safe no-op
```

Expected persistence:

```text
smart_book_notes existing table reused
no destructive schema changes
```

## 11. Student TypeScript Risk to Address

The constrained acceptance report noted student TypeScript errors in `BookReaderPage.tsx`, including nullability and ref typing issues.

During integration, Claude Code must run student-side typecheck. If the same errors remain, fix them only if they are directly related to reader/note navigation or safe type refinements.

Do not do a large reader refactor.

## 12. Validation Requirements

Run available validation after integration.

Required static checks:

```text
pnpm --filter @ai-smartbook/schema typecheck
pnpm --filter @ai-smartbook/db typecheck
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-Stu-R1 typecheck
pnpm build
```

If full build fails, classify the failure as:

```text
introduced by integration
pre-existing
unrelated
unknown
```

Required SQLite checks:

```text
PRAGMA integrity_check must be ok
books count should remain 13 or otherwise explain difference
question_bank_import_jobs table exists
smart_solve_import_jobs table exists
smart_solve_import_items table exists
smart_book_notes table remains readable
```

Required live HTTP checks on E500 if services can run:

```text
GET /api/admin/books returns non-empty books
GET /api/admin/import/question-bank/jobs works
GET /api/admin/books/:bookId/imports/smart-solve/jobs works for a real bookId
GET /api/student/books/:bookId/notes works
GET /api/student/books/:bookId/notes/:noteId/navigate works for a noteId when available
Admin frontend returns HTTP 200
Student frontend /books returns HTTP 200
```

Required browser/manual checks when possible:

```text
/admin/import/question-bank opens
/admin/import/smart-solve opens
student /books opens
reader opens for a real book
notes panel opens
click note with pageNumber jumps reader to that page
click note without navigation metadata does not crash
```

## 13. Required Integration Report

Create this report on the integration branch:

```text
docs/r2/AI-SmartBook-R2-three-branch-integration-report-20260623.md
```

The report must include:

1. Status: success / failure / blocker / permission-halt.
2. Integration branch name.
3. Base branch.
4. Merged branch list.
5. Merge commit SHAs or fast-forward status.
6. Conflict files and resolutions, if any.
7. Final changed file summary.
8. Confirmation that `.env`, DB, logs, uploads, backups were not committed.
9. Static validation results.
10. SQLite validation results.
11. Live HTTP validation results.
12. Browser/manual validation results.
13. Student TypeScript status.
14. Known limitations.
15. Rollback plan.
16. Final commit SHA.
17. Push result.
18. `git status --short`.

## 14. Rollback Plan

If integration fails after merge, do not force the result into the stable base branch.

Rollback guidance:

```text
Keep failed work only on feat/r2-integrate-imports-notes.
Document the blocker.
Do not merge into feat/ai-smartbook-r2-modular-imports.
Do not delete the three original feature branches.
```

The three source branches should remain independently recoverable.

## 15. Suggested Claude Code Initial Prompt

Use this prompt in Claude Code:

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Please read and follow:
docs/r2/AI-SmartBook-R2-claude-code-integrate-three-branches-task-20260623.md

Target workspace:
/home/b827262/project/AI-SmartBook-R2

Stable base branch:
feat/ai-smartbook-r2-modular-imports

Create a new integration branch:
feat/r2-integrate-imports-notes

Integrate these branches in order:
1. feat/r2-question-bank-json-import
2. feat/r2-smart-solve-json-import
3. feat/r2-ai-notes-navigation

Do not commit .env, SQLite DB files, logs, uploads, backups, or .claude local state.
Do not directly merge MySQL-oriented reference branches.
If Branch C is report-only or lacks the actual AI Notes Navigation implementation, stop and report blocker.
If merge conflicts are non-trivial, stop and report blocker with conflict file list.

After integration, run static checks, SQLite checks, and live E500 HTTP checks where possible.
Create docs/r2/AI-SmartBook-R2-three-branch-integration-report-20260623.md.
Commit and push to origin feat/r2-integrate-imports-notes.
Finish with a Traditional Chinese termination report.
```

## 16. Success Criteria

This integration task is successful only if:

1. `feat/r2-integrate-imports-notes` exists remotely.
2. All three feature branches are integrated or any blocker is honestly reported.
3. Question Bank Import UI/API exists in the integrated branch.
4. Smart Solve Import UI/API exists in the integrated branch.
5. AI Notes Navigation API and click behavior exist in the integrated branch.
6. SQLite integrity is ok.
7. Static validation is passed or failures are clearly classified.
8. Live HTTP checks are passed on E500 or blocked reasons are documented.
9. No `.env`, DB, logs, uploads, backups, or `.claude` files are committed.
10. Integration report is committed and pushed.
