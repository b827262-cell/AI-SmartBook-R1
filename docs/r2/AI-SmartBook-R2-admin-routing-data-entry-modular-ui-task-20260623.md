# AI-SmartBook-R2 Claude Code Task — Admin Routing, Data Entry, and Modular UI

Date: 2026-06-23

## 1. Purpose

This task documents the latest E500 manual test results and defines the next Claude Code implementation step for AI-SmartBook-R2.

The three R2 feature branches have been integrated into:

```text
feat/r2-integrate-imports-notes
```

However, manual testing shows that the integrated feature routes are not yet product-ready from the backend UI perspective.

Current observed problems:

1. Question Bank JSON Import page opens, but backend request fails with `404 Not Found`.
2. Smart Solve JSON Import page opens, but it requires a raw Book ID and fails with `404 Not Found` when the user does not know the correct ID.
3. AI Notes Navigation exists in code/reports, but the user does not know how to test it from the current UI.
4. The admin sidebar is still hardcoded and does not expose a complete modular R2 management structure.
5. Future modules should be easy to add/remove without scattering navigation logic.

## 2. Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

At the end of the task, include:

```text
建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 3. Target Workspace and Branch

Workspace:

```text
/home/b827262/project/AI-SmartBook-R2
```

Branch:

```text
feat/r2-integrate-imports-notes
```

Repository:

```text
b827262-cell/AI-SmartBook-R1
```

## 4. Manual Test Evidence

### 4.1 Question Bank Import

URL tested:

```text
http://127.0.0.1:5174/admin/import/question-bank
```

Observed request:

```text
POST http://127.0.0.1:5174/api/admin/import/question-bank/jobs
```

Observed result:

```text
404 Not Found
```

The frontend route exists, but the API request is not being served correctly in the current E500 runtime.

### 4.2 Smart Solve Import

URL tested:

```text
http://127.0.0.1:5174/admin/import/smart-solve
```

Observed request pattern:

```text
GET /api/admin/books/<typed-book-id>/imports/smart-solve/jobs
```

Observed result:

```text
404 Not Found
```

User-facing issue:

```text
The page asks for raw Book ID. The user does not know the correct bookId.
```

This must be changed to a book selector using existing `/api/admin/books` data.

### 4.3 AI Notes Navigation

The feature is expected to be tested from:

```text
http://127.0.0.1:5173/books
```

Current issue:

```text
The user does not know the exact UI flow for testing note navigation.
```

The UI must provide a clearer entry point, help text, or admin-side documentation for how to create/test a note with page navigation.

## 5. Immediate Technical Diagnosis

Claude Code must verify whether the 404 is caused by:

1. Admin API process on port `4300` is not running the integration branch code.
2. Vite admin dev server is proxying `/api` to the wrong target.
3. The API route exists in source but is not registered in the running server.
4. The frontend is using a non-book-scoped endpoint while backend expects a different route shape.
5. Smart Solve is using an invalid raw Book ID typed by the user.

Do not assume the previous integration report is enough. Re-test on the real E500 runtime.

## 6. Required Fixes

### 6.1 Fix API 404 for Question Bank Import

Expected frontend API request must succeed:

```text
POST /api/admin/import/question-bank/jobs
GET  /api/admin/import/question-bank/jobs
GET  /api/admin/import/question-bank/jobs/:jobId
```

Tasks:

1. Confirm the route exists in `apps/AI-adm-D1/src/server/index.ts`.
2. Confirm the running API process is from `feat/r2-integrate-imports-notes`.
3. Confirm admin Vite proxy target points to the correct API.
4. If the route is missing locally, restore it from the integrated branch implementation.
5. Add runtime verification to the report.

### 6.2 Fix Smart Solve Book ID UX

Current issue:

```text
The user has to type a raw Book ID.
```

Required behavior:

1. Load books from existing admin API.
2. Render a dropdown/select for books.
3. Show book title and actual book ID.
4. Use selected bookId for Smart Solve import and history requests.
5. If no book is selected, disable upload and show a clear message.
6. Do not ask the user to manually type `bookId` unless advanced/debug mode is explicitly needed.

Expected route remains:

```text
/admin/import/smart-solve
```

Expected API pattern:

```text
/api/admin/books/:bookId/imports/smart-solve/jobs
```

### 6.3 Add Clear AI Notes Navigation Test Entry

Do not invent fake functionality.

Add one of the following safe improvements:

Option A — Admin help panel:

```text
/admin/notes or an existing admin page section explaining how to test AI Notes Navigation
```

Option B — Reader UI help text:

```text
SmartNotesPanel displays a short hint: 點「定位」可跳到筆記頁碼；沒有頁碼的筆記會顯示提示。
```

Option C — Book detail link:

```text
Add a link from admin book detail to open student reader for that book.
```

Minimum requirement:

```text
User must know how to test: /books -> open book -> open notes panel -> click 定位.
```

### 6.4 Modularize Admin Navigation

Current sidebar is too hardcoded. Implement a modular navigation config so future items can be added/removed easily.

Recommended design:

```text
apps/AI-adm-D1/src/navigation/adminNav.ts
```

Suggested type:

```ts
export type AdminNavItem = {
  label: string;
  to: string;
  end?: boolean;
  enabled?: boolean;
  description?: string;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};
```

Suggested groups:

```text
管理後台
- 首頁 -> /admin
- 帳戶管理 -> /admin/accounts
- 介面設定 -> /admin/appearance

智能書本管理
- 書本列表 -> /admin/books
- 新增書本 -> /admin/books/new
- 章節 / TOC 管理 -> use existing route only if real route exists
- AI 筆記管理 -> use existing route only if real route exists, otherwise disabled/help item

題庫與題解
- 題庫中心（PDF辨識） -> only if real route exists, otherwise disabled/help item
- 題庫 JSON 匯入 -> /admin/import/question-bank
- 智慧題解 JSON 匯入 -> /admin/import/smart-solve
- 匯入紀錄 / Job History -> either a real combined route or disabled/help item

AI 助教管理
- AI助教科管理 -> disabled/help item until implemented
- AI助教答記錄 -> disabled/help item until implemented
- AI助教本綁定 -> disabled/help item until implemented
- AI課堂端點管理 -> disabled/help item until implemented
- 建議問快取管理 -> disabled/help item until implemented
- 學生內容總覽 -> disabled/help item until implemented
```

Important:

```text
Do not create fake working links to routes that do not exist.
```

If a feature is planned but not implemented, show it as disabled or route it to a clear placeholder page only if the placeholder is intentionally implemented and documented.

## 7. Data Entry Design Clarification

### 7.1 Question Bank JSON Import

Current expected behavior:

```text
Upload JSON -> validate -> create import job/staging record
```

The UI must explain that this currently creates import job records, not a full production question bank table unless such table is implemented.

Add sample JSON visible in UI or collapsible help:

```json
[
  {
    "question_number": 1,
    "question": "下列何者為會計恆等式？",
    "options": ["資產=負債+權益", "資產=收入+費用"],
    "answer": "資產=負債+權益"
  }
]
```

### 7.2 Smart Solve JSON Import

Current expected behavior:

```text
Select book -> upload JSON -> validate -> map scope -> create job/items staging records
```

Add sample JSON visible in UI or collapsible help:

```json
{
  "items": [
    {
      "externalId": "ss-001",
      "prompt": "Explain debit and credit.",
      "solution": "Debit and credit are the two sides of accounting entries.",
      "scope": {
        "chapterTitle": "第一章"
      },
      "tags": ["accounting", "basic"]
    }
  ]
}
```

## 8. API and Proxy Verification

Claude Code must explicitly verify these after fixing:

```text
curl -s http://127.0.0.1:4300/api/admin/books | head -c 1000
curl -s http://127.0.0.1:4300/api/admin/import/question-bank/jobs
curl -I http://127.0.0.1:5174/admin/import/question-bank
curl -I http://127.0.0.1:5174/admin/import/smart-solve
```

For Smart Solve, use a real bookId obtained from `/api/admin/books`:

```text
GET http://127.0.0.1:4300/api/admin/books
then
GET http://127.0.0.1:4300/api/admin/books/<realBookId>/imports/smart-solve/jobs
```

Also verify the frontend requests use the selected real bookId.

## 9. Build and Typecheck Requirements

Run:

```text
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 build
```

If `AI-Stu-R1 typecheck` still has known pre-existing errors, document them without hiding them.

The JSX parse error in `BookReaderPage.tsx` must not remain. `AI-Stu-R1 build` must pass.

## 10. Upstream / UI Mother Template Policy

The user mentioned:

```text
upstream/codex/fix-ai-notes-navigation
```

Claude Code must check whether this branch exists locally or remotely.

If it exists:

1. Treat it as a UI reference only.
2. Do not directly merge it into R2.
3. Compare the diff against `feat/r2-integrate-imports-notes`.
4. Cherry-pick or manually replay only small safe UI improvements if needed.
5. Document what was reused.

If it does not exist:

```text
Document that the branch was unavailable and continue with local integrated code.
```

## 11. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-admin-routing-data-entry-modular-ui-report-20260623.md
```

Report must include:

1. Status: success / failure / blocker / permission-halt.
2. Branch name.
3. Root cause of Question Bank 404.
4. Root cause of Smart Solve 404.
5. Whether API server/proxy mismatch was found.
6. Sidebar modularization design and changed files.
7. New navigation groups and links.
8. Smart Solve book selector behavior.
9. AI Notes Navigation user test guide.
10. Upstream `codex/fix-ai-notes-navigation` check result.
11. Build/typecheck results.
12. Live curl results.
13. Screenshots/manual test notes if available.
14. Commit SHA.
15. Push result.
16. `git status --short`.
17. Confirmation that `.env`, DB, logs, uploads, backups, `.claude` were not committed.

## 12. Commit and Push

Commit message:

```text
feat(r2): modularize admin navigation and fix import data entry
```

Push target:

```text
origin feat/r2-integrate-imports-notes
```

## 13. Final Report Format

Final response must be in Traditional Chinese:

```text
狀態：success / failure / blocker / permission-halt
分支：feat/r2-integrate-imports-notes
修正內容：
- ...

實測結果：
- Question Bank API：...
- Smart Solve API：...
- Admin UI：...
- Student build：...

新增/修改檔案：
- ...

Commit SHA：...
Push 結果：...
git status --short：...
是否提交 .env/db/log/.claude：否
限制與後續：...

建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 14. Success Criteria

This task is successful only if:

1. `/admin/import/question-bank` can call its API without 404.
2. `/admin/import/smart-solve` no longer requires the user to manually guess Book ID.
3. Smart Solve uses a real selected bookId from `/api/admin/books`.
4. Admin sidebar is modularized via a config/module structure.
5. New R2 feature entries are discoverable from the sidebar.
6. Non-implemented future entries are disabled or clearly marked, not broken links.
7. AI Notes Navigation testing path is clearly documented in UI/report.
8. `AI-adm-D1` build passes.
9. `AI-Stu-R1` build passes and JSX parse error is gone.
10. No local secrets, DB files, logs, uploads, backups, or `.claude` state are committed.
