# AI-SmartBook-R2 Claude Code Three-Branch Redesign Task

Date: 2026-06-22

## 1. Purpose

This document is a Claude Code handoff plan for the next AI-SmartBook-R2 redesign phase.

The current R2 service baseline has been verified by today's GPT-5.3 Spark / AGY reports:

- R2 frontend, backend, and API services are currently working.
- R2 is SQLite-first.
- R2 must not directly merge MySQL-oriented reference branches.
- The prior empty-books issue was diagnosed as a DB path/runtime instance problem, not a missing data problem.
- Local runtime DB paths must be absolute, but local environment files and database files must never be committed.

Claude Code should implement the redesign as three separate feature branches rather than one large patch.

## 2. Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

At the end of every module task, Claude Code must remind the user:

```text
建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 3. Repository and Base Branch

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

Claude Code must create implementation branches from this stable base branch unless the user explicitly approves another base.

## 4. Three Required Feature Branches

### Branch A

```text
feat/r2-question-bank-json-import
```

Goal:

```text
Admin-side Question Bank JSON Import: upload, validate, dry-run preview, import job persistence, and report.
```

### Branch B

```text
feat/r2-smart-solve-json-import
```

Goal:

```text
Admin-side Smart Solve JSON Import: upload, validate, scope mapping, dry-run preview, import job persistence, and report.
```

### Branch C

```text
feat/r2-ai-notes-navigation
```

Goal:

```text
Student-side AI Notes Navigation: click note, jump to page/chapter, preserve existing smart_book_notes compatibility.
```

Recommended order:

```text
1. feat/r2-question-bank-json-import
2. feat/r2-smart-solve-json-import
3. feat/r2-ai-notes-navigation
```

## 5. Global Safety Rules

1. Do not commit local environment files.
2. Do not commit SQLite database files.
3. Do not commit logs, uploads, temporary files, or generated backups.
4. Do not directly merge MySQL-oriented reference branches.
5. Use the reference branches only as design references.
6. Keep each branch small and reviewable.
7. Prefer append-only SQLite schema changes.
8. Preserve existing book upload, PDF parsing, reader, chat, and notes workflows.
9. Add one implementation report under `docs/r2/` for each branch.
10. If a blocker appears, stop and report it clearly.

## 6. Current Architecture Assumptions

- Admin app: `apps/AI-adm-D1`.
- Student app: `apps/AI-Stu-R1`.
- Shared schema package: `packages/schema`.
- Shared DB package: `packages/db`.
- Book logic package: `packages/book-core`.
- Admin/server API is currently concentrated in `apps/AI-adm-D1/src/server/index.ts`.
- Student notes API already exists under `/api/student/books/:bookId/notes`.
- Existing note records must remain backward compatible.

## 7. Branch A Design: Question Bank JSON Import

### 7.1 Scope

Implement a safe admin workflow for importing external question-bank JSON files.

Minimum vertical slice:

1. Define Zod schema for question-bank import payload.
2. Add SQLite import job persistence.
3. Add admin API for JSON validation and dry-run preview.
4. Add admin UI panel or tab for upload/paste JSON and preview results.
5. Add error and warning summary.
6. Add implementation report.

### 7.2 Suggested payload concept

```text
QuestionBankImportFile
- version
- source
- bookId
- items[]

QuestionBankItem
- externalId
- question
- type
- choices
- answer
- explanation
- chapterId or chapterTitle
- pageNumber
- tags
```

Supported initial question types:

```text
single_choice
multiple_choice
true_false
short_answer
```

### 7.3 Suggested API namespace

```text
POST /api/admin/books/:bookId/imports/question-bank/validate
POST /api/admin/books/:bookId/imports/question-bank/jobs
GET  /api/admin/books/:bookId/imports/question-bank/jobs/:jobId
POST /api/admin/books/:bookId/imports/question-bank/jobs/:jobId/execute
```

The first implementation may keep execution conservative and prioritize validation, preview, and job records.

### 7.4 Suggested report file

```text
docs/r2/AI-SmartBook-R2-question-bank-json-import-implementation-report-20260622.md
```

Report must include:

- status
- branch
- changed files
- schema changes
- API endpoints
- UI changes
- DB changes
- validation result
- build/typecheck result
- commit SHA
- push result
- limitations

## 8. Branch B Design: Smart Solve JSON Import

### 8.1 Scope

Implement Smart Solve JSON import with book/chapter/page scope mapping.

Minimum vertical slice:

1. Define Zod schema for Smart Solve import payload.
2. Add import job persistence.
3. Add scope mapping preview.
4. Add admin API for validation and dry-run preview.
5. Add admin UI panel or tab.
6. Add implementation report.

### 8.2 Suggested payload concept

```text
SmartSolveImportFile
- version
- source
- bookId
- scopes[]
- items[]

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

Scope should support:

```text
bookId
chapterId
chapterTitle
pageStart
pageEnd
```

### 8.3 Suggested API namespace

```text
POST /api/admin/books/:bookId/imports/smart-solve/validate
POST /api/admin/books/:bookId/imports/smart-solve/scopes/preview
POST /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs/:jobId
POST /api/admin/books/:bookId/imports/smart-solve/jobs/:jobId/execute
```

### 8.4 Suggested report file

```text
docs/r2/AI-SmartBook-R2-smart-solve-json-import-implementation-report-20260622.md
```

Report must include:

- status
- branch
- changed files
- schema changes
- API endpoints
- UI changes
- DB changes
- scope mapping behavior
- validation result
- build/typecheck result
- commit SHA
- push result
- limitations

## 9. Branch C Design: AI Notes Navigation

### 9.1 Scope

Improve student-side AI notes navigation.

Minimum vertical slice:

1. Keep existing `smart_book_notes` records compatible.
2. Add or reuse note navigation fields such as `chapterId`, `pageNumber`, and `sourceMessageId`.
3. Add a student navigation endpoint if needed.
4. Update the student reader notes panel so clicking a note jumps to the related page/chapter.
5. Add graceful fallback behavior when a note has no page or chapter.
6. Add implementation report.

### 9.2 Suggested API

```text
GET /api/student/books/:bookId/notes/:noteId/navigate
```

Suggested response concept:

```text
noteId
bookId
chapterId
pageNumber
sourceMessageId
anchor
fallback
```

### 9.3 Suggested UI behavior

When a user clicks a note:

1. If `pageNumber` exists, jump reader to that page.
2. If `chapterId` exists, sync active chapter state.
3. If `sourceMessageId` exists, optionally focus the related chat message.
4. If navigation data is missing, show a non-blocking fallback message.
5. Never crash the reader because of incomplete note metadata.

### 9.4 Suggested report file

```text
docs/r2/AI-SmartBook-R2-ai-notes-navigation-implementation-report-20260622.md
```

Report must include:

- status
- branch
- changed files
- API changes
- UI behavior
- backward compatibility notes
- manual test result
- build/typecheck result
- commit SHA
- push result
- limitations

## 10. Validation Requirements for Every Branch

Claude Code should run the available validations appropriate to the touched packages:

```text
pnpm typecheck
pnpm build
```

If a full build fails, Claude Code must state whether it is:

```text
introduced by this branch
pre-existing
unrelated
unknown
```

Runtime checks should include at least:

```text
/api/admin/books returns non-empty books
admin frontend returns 200 OK
student frontend /books returns 200 OK
```

## 11. Git Rules for Every Branch

Each branch must:

1. Commit only intentional source/doc changes.
2. Include one module-specific report under `docs/r2/`.
3. Push to its own feature branch.
4. Not push implementation changes directly to `feat/ai-smartbook-r2-modular-imports`.

Suggested commit messages:

```text
feat(r2): add question bank json import
feat(r2): add smart solve json import
feat(r2): add ai notes navigation
```

## 12. Final Report Format

Each Claude Code branch run must end with:

```text
狀態：success / failure / blocker / permission-halt
分支：<branch name>
基準分支：feat/ai-smartbook-r2-modular-imports
完成內容：
- ...

變更檔案：
- ...

驗證結果：
- typecheck：...
- build：...
- runtime：...

Commit SHA：...
Push 結果：...
git status --short：...
是否修改原始碼：是 / 否
是否提交 .env/db：否
限制與後續：...

建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 13. Initial Claude Code Prompt

Use this prompt for the first implementation round:

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Please read and follow:
docs/r2/AI-SmartBook-R2-claude-code-three-branch-redesign-task-20260622.md

Target workspace:
/home/b827262/project/AI-SmartBook-R2

Stable base branch:
feat/ai-smartbook-r2-modular-imports

Create and work on the first feature branch only:
feat/r2-question-bank-json-import

Do not commit local environment files or SQLite database files.
Do not directly merge MySQL-oriented reference branches.
Implement the smallest safe vertical slice for Question Bank JSON Import, create the required implementation report under docs/r2/, commit, push, and finish with the Traditional Chinese termination report.
```

After Branch A is reviewed, repeat the same process for Branch B and Branch C.

## 14. Success Definition

This redesign phase is complete when all three branches exist remotely and each branch has:

1. A small reviewable implementation.
2. A module-specific report under `docs/r2/`.
3. No committed environment or database files.
4. No direct MySQL branch merge.
5. Honest validation results.
6. Clear rollback boundaries.
