# AI-SmartBook-R2 Task — One-Click Solve Book and My Question Bank

Date: 2026-06-23

## 1. Goal

Add a book-based question workflow that connects Admin Smart Solve with the Student Reader `我的題庫` tab.

Target flow:

```text
Admin selects book
→ click 一鍵解書
→ system extracts or stages choice-question candidates
→ admin reviews/stages results
→ student sees staged items in 我的題庫
```

This task is based on the user screenshots:

```text
1. Admin Smart Solve page already has book selector.
2. Student Reader already has 我的題庫 tab, currently placeholder.
```

---

## 2. Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

Final report must include:

```text
建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

---

## 3. Workspace and Branch

Workspace:

```text
/home/b827262/project/AI-SmartBook-R2
```

Base branch:

```text
feat/r2-student-reader-toolbar-modules
```

Create branch:

```text
feat/r2-one-click-solve-book-my-question-bank
```

---

## 4. Admin Requirements

Update:

```text
/admin/import/smart-solve
```

Add a new panel:

```text
一鍵解書
```

Minimum first version:

```text
1. Use the existing selected book.
2. Support 選擇題 as the first question type.
3. Read existing parsed text / page-index / sentence-index / book artifacts when available.
4. Create candidate question records or candidate JSON.
5. Show result count and review status.
6. Keep existing Smart Solve JSON import working.
```

Admin UI copy:

```text
一鍵解書會從目前書本的解析文字與索引資料中整理選擇題候選，結果需確認後再提供給學生端使用。
```

---

## 5. Candidate Data Shape

For the first version, support choice-question candidates.

Suggested shape:

```json
{
  "questionType": "single_choice",
  "question": "題目文字",
  "options": [
    { "label": "A", "text": "選項 A" },
    { "label": "B", "text": "選項 B" },
    { "label": "C", "text": "選項 C" },
    { "label": "D", "text": "選項 D" }
  ],
  "answer": "A",
  "explanation": "解析說明",
  "sourcePage": 1,
  "sourceText": "教材來源片段",
  "status": "candidate"
}
```

If no reliable answer exists, mark the item as needing review.

---

## 6. Backend Requirements

Add admin APIs, names may be adjusted to project convention:

```text
POST /api/admin/books/:bookId/one-click-solve/jobs
GET  /api/admin/books/:bookId/one-click-solve/jobs
GET  /api/admin/books/:bookId/one-click-solve/jobs/:jobId
POST /api/admin/books/:bookId/one-click-solve/jobs/:jobId/stage
```

Minimum first version:

```text
1. POST generate job.
2. GET job detail.
3. Stage or expose candidates to Student My Question Bank.
```

Use SQLite-first design and non-destructive migrations if tables are needed.

Suggested tables:

```text
one_click_solve_jobs
one_click_solve_candidates
```

Status values:

```text
candidate
needs_review
approved
staged
rejected
```

---

## 7. Student My Question Bank Requirements

Update Student Reader tab:

```text
我的題庫
```

Minimum first version:

```text
1. Replace placeholder with a real current-book question list.
2. Show question text, type, source page.
3. Allow expanding answer and explanation.
4. Show empty state if no items exist.
5. Do not expose admin-only routes.
```

Empty state:

```text
這本書尚未建立題庫。請由後台執行「一鍵解書」或匯入題庫資料。
```

---

## 8. Safety Rules

```text
1. Do not commit .env.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, .claude, generated-json, or runtime files.
4. Do not remove existing Smart Solve JSON Import.
5. Do not break Reader toolbar and tabs.
6. Do not publish unreviewed candidates as final student answers.
7. Do not expose admin-only endpoints to the student frontend.
```

---

## 9. Suggested Files

Inspect:

```text
apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx
apps/AI-adm-D1/src/server/index.ts
apps/AI-adm-D1/src/api.ts
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
apps/AI-Stu-R1/src/components/ReaderTabs.tsx
apps/AI-Stu-R1/src/studentClient.ts
packages/db/src/
packages/schema/src/
```

Potential new files:

```text
apps/AI-adm-D1/src/components/OneClickSolvePanel.tsx
apps/AI-Stu-R1/src/components/MyQuestionBankPanel.tsx
packages/schema/src/oneClickSolve.schema.ts
packages/db/src/repositories/oneClickSolve.repo.ts
```

---

## 10. Validation

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter @ai-smartbook/schema typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter @ai-smartbook/db typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

Manual tests:

```text
1. Open /admin/import/smart-solve.
2. Select a real book.
3. Confirm 一鍵解書 panel appears.
4. Run one-click solve with 選擇題.
5. Confirm candidates appear or clear no-candidate message appears.
6. Confirm existing Smart Solve JSON import still works.
7. Open the same book in Student Reader.
8. Open 我的題庫 tab.
9. Confirm staged/approved candidates appear.
10. Expand answer/explanation.
```

---

## 11. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-one-click-solve-book-my-question-bank-report-20260623.md
```

Report must include:

```text
1. status
2. branch
3. changed files
4. admin UI changes
5. APIs added
6. DB changes
7. candidate shape
8. My Question Bank behavior
9. validation results
10. known limitations
11. commit SHA
12. push result
13. git status --short
14. confirmation no .env/db/log/.claude/runtime files committed
```

---

## 12. Commit and Push

Commit message:

```text
feat(r2): add one-click solve book and my question bank
```

Push:

```text
origin feat/r2-one-click-solve-book-my-question-bank
```

---

## 13. Success Criteria

```text
1. Admin can run 一鍵解書 from selected book.
2. First version supports 選擇題 candidates.
3. Candidates can be staged or shown to student side.
4. Student 我的題庫 shows current-book items.
5. Existing Smart Solve JSON import still works.
6. Build/typecheck pass.
7. No .env/db/log/.claude/runtime files committed.
```
