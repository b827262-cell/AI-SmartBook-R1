# AI-SmartBook-R2 Claude Code Task — Smart Solve JSON Import Branch

Date: 2026-06-22

## 1. Purpose

This document is a Claude Code handoff task for the second R2 feature branch:

```text
feat/r2-smart-solve-json-import
```

The first branch has already been completed and verified:

```text
feat/r2-question-bank-json-import
```

Known first-branch verification:

```text
Initial implementation commit: 9bc0f78
Verification update commit: be652e4
Typecheck: PASS
Frontend build: PASS
runMigrations(): PASS
Question-bank import API endpoints: PASS
DB persistence: PASS
Admin frontend: HTTP 200
.env/db committed: no
```

This Smart Solve task must start from the stable R2 base branch unless the user explicitly approves using the first feature branch as a dependency.

Stable base branch:

```text
feat/ai-smartbook-r2-modular-imports
```

## 2. Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

At the end of the task, include:

```text
建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 3. Target Workspace

```text
/home/b827262/project/AI-SmartBook-R2
```

Repository:

```text
b827262-cell/AI-SmartBook-R1
```

Target branch to create:

```text
feat/r2-smart-solve-json-import
```

Base branch:

```text
feat/ai-smartbook-r2-modular-imports
```

## 4. Important Context

AI-SmartBook-R2 is SQLite-first.

Do not directly merge MySQL-oriented reference branches.

The local R2 services are currently verified as working, and the previous DB path issue has been diagnosed and corrected locally. Do not reintroduce relative DB assumptions.

Local DB should resolve to:

```text
/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
```

Do not commit `.env` or SQLite database files.

## 5. Safety Rules

1. Do not commit `.env`.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, or temporary files.
4. Do not directly merge MySQL-oriented reference branches.
5. Keep this branch independent from `feat/r2-question-bank-json-import` unless dependency is explicitly approved.
6. If reusable code from Branch A is needed, stop and report the dependency before proceeding.
7. Keep the implementation as the smallest safe vertical slice.
8. Preserve existing book upload, PDF parse, reader, chat, and note flows.
9. Create a module-specific implementation report under `docs/r2/`.
10. If a blocker appears, report `blocker` instead of forcing a risky implementation.

## 6. Branch Setup

Claude Code should start from the stable base branch:

```text
feat/ai-smartbook-r2-modular-imports
```

Then create:

```text
feat/r2-smart-solve-json-import
```

Do not push implementation changes directly to `feat/ai-smartbook-r2-modular-imports`.

## 7. Feature Scope

Implement the smallest safe vertical slice for Smart Solve JSON Import.

Minimum scope:

1. Add Smart Solve import Zod schema.
2. Add SQLite import job persistence.
3. Add admin API for validation and dry-run preview.
4. Add scope mapping preview for book/chapter/page mapping.
5. Add admin UI panel or route for Smart Solve import.
6. Add implementation report under `docs/r2/`.
7. Run available typecheck, build, migration, and runtime checks.

Out of scope for this branch:

1. Full tutor engine integration.
2. AI grading or answer generation.
3. Large refactor of admin server routing.
4. Direct dependency on MySQL schemas.
5. Changes to existing reader/chat behavior.

## 8. Suggested Payload Concept

Smart Solve JSON should support a tolerant but validated payload shape.

Suggested top-level shape:

```text
SmartSolveImportFile
- version
- source
- bookId
- scopes[]
- items[]
```

Suggested item shape:

```text
SmartSolveItem
- externalId
- title
- prompt
- solution
- explanation
- skill
- difficulty
- scope
- tags
- metadata
```

Suggested scope shape:

```text
scope
- bookId
- chapterId
- chapterTitle
- pageStart
- pageEnd
```

The implementation should allow both direct item-level scope and a reusable `scopes[]` section if practical.

## 9. Suggested SQLite Design

Prefer append-only tables.

Recommended tables:

```text
smart_solve_import_jobs
smart_solve_import_items
```

Optional, only if needed for a clean minimal slice:

```text
smart_solve_import_scopes
```

Recommended job fields:

```text
id
book_id
file_name
status
total_records
valid_records
mapped_records
unmapped_records
invalid_records
result_json
error_message
created_at
updated_at
```

Recommended item fields:

```text
id
job_id
book_id
external_id
title
prompt
solution
explanation
skill
difficulty
scope_json
tags_json
metadata_json
status
error_json
created_at
updated_at
```

Use JSON text columns for flexible payload fields.

Keep migration compatible with the current SQLite migration style.

## 10. Suggested API Namespace

Suggested admin endpoints:

```text
POST /api/admin/books/:bookId/imports/smart-solve/validate
POST /api/admin/books/:bookId/imports/smart-solve/scopes/preview
POST /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs/:jobId
```

If a smaller route set is safer, implement fewer endpoints but document the decision in the report.

Minimum acceptable route set:

```text
POST /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs/:jobId
```

## 11. Scope Mapping Behavior

Smart Solve import must preview mapping quality.

Mapping priority:

1. Direct `chapterId`, if it exists and belongs to the target book.
2. `chapterTitle` fuzzy or exact match, if available.
3. `pageStart` / `pageEnd`, mapped to existing book chapters by page range if possible.
4. Unmapped fallback, recorded as warning rather than fatal error unless required fields are missing.

The preview should include counts:

```text
totalRecords
validRecords
mappedRecords
unmappedRecords
invalidRecords
warningCount
```

Each invalid or unmapped item should record a concise error/warning reason.

## 12. Suggested Admin UI

Add a Smart Solve import admin page or panel.

Suggested route:

```text
/admin/import/smart-solve
```

Minimum UI behavior:

1. Upload JSON file.
2. Show validation summary.
3. Show mapping summary.
4. Show first 20 parsed items.
5. Show unmapped items and validation errors.
6. Show recent Smart Solve import jobs.
7. Do not break existing admin pages.

## 13. Suggested Files to Inspect

Claude Code should inspect relevant files before editing:

```text
packages/schema/src/*
packages/db/src/schema.ts
packages/db/src/migrate.ts
packages/db/src/repositories/*
apps/AI-adm-D1/src/server/index.ts
apps/AI-adm-D1/src/api.ts
apps/AI-adm-D1/src/App.tsx
apps/AI-adm-D1/src/pages/*
apps/AI-adm-D1/src/components/*
packages/book-core/src/*
```

## 14. Required Report

Create this report:

```text
docs/r2/AI-SmartBook-R2-smart-solve-json-import-implementation-report-20260622.md
```

The report must include:

1. Status: success / failure / blocker / permission-halt.
2. Branch name.
3. Base branch.
4. Changed files.
5. Schema changes.
6. SQLite migration behavior.
7. Repository changes.
8. API endpoints added.
9. Admin UI changes.
10. Scope mapping behavior.
11. Validation examples.
12. Typecheck result.
13. Build result.
14. Runtime API verification result.
15. DB persistence verification result.
16. Known limitations.
17. Commit SHA.
18. Push result.
19. `git status --short`.
20. Confirmation that `.env` and DB files were not committed.

## 15. Validation Requirements

Run available validations appropriate to touched packages.

At minimum, try:

```text
pnpm --filter @ai-smartbook/schema typecheck
pnpm --filter @ai-smartbook/db typecheck
pnpm --filter AI-adm-D1 typecheck
pnpm build
```

If full build fails, classify it clearly:

```text
introduced by this branch
pre-existing
unrelated
unknown
```

Runtime checks should verify:

```text
/api/admin/books returns non-empty books
Smart Solve jobs endpoint works
Admin frontend returns HTTP 200
DB persistence works for smart_solve_import_jobs
```

## 16. Git Requirements

Commit message suggestion:

```text
feat(r2): add smart solve json import
```

Push target:

```text
origin feat/r2-smart-solve-json-import
```

Do not stage or commit:

```text
.env
*.db
*.sqlite
*.sqlite3
logs
uploads
backups
temporary files
```

## 17. Initial Claude Code Prompt

Use this prompt in Claude Code:

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Please read and follow:
docs/r2/AI-SmartBook-R2-claude-code-smart-solve-branch-task-20260622.md

Target workspace:
/home/b827262/project/AI-SmartBook-R2

Stable base branch:
feat/ai-smartbook-r2-modular-imports

Create and work on this feature branch only:
feat/r2-smart-solve-json-import

Important:
Branch feat/r2-question-bank-json-import is complete and verified, but do not merge it unless explicitly required.
Start from stable base branch feat/ai-smartbook-r2-modular-imports unless reusable code from Branch A is absolutely required. If it is required, stop and report the dependency first.

Do not commit .env or SQLite database files.
Do not directly merge MySQL-oriented reference branches.
Implement the smallest safe vertical slice for Smart Solve JSON Import:
- schema
- SQLite import job persistence
- admin API validation / dry-run preview
- scope mapping preview
- admin UI panel
- implementation report under docs/r2/

Run typecheck/build/runtime verification where possible.
Commit, push to feat/r2-smart-solve-json-import, and finish with the Traditional Chinese termination report.

最後提醒：建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 18. Success Criteria

This branch is successful only if:

1. `feat/r2-smart-solve-json-import` exists remotely.
2. A minimal Smart Solve JSON import vertical slice is implemented.
3. Smart Solve import job persistence works.
4. Scope mapping preview is present or honestly documented as limited.
5. Typecheck/build/runtime validation is passed or honestly reported.
6. A module-specific report is committed under `docs/r2/`.
7. `.env` and DB files are not committed.
8. Existing R2 services and core flows are not broken.
