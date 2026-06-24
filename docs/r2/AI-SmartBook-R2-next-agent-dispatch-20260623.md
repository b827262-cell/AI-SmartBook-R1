# AI-SmartBook-R2 下一輪 Agent 任務分配

日期：2026-06-23

## 1. 目的

本文件用於分配 AI-SmartBook-R2 下一輪工作給三個 Agent：

1. **Codex-Spark 128K** — 整合 build/typecheck 修復分支回主整合分支。
2. **AGY** — 在 E500 上做合併後實機驗收、重啟服務與 curl / browser 驗證。
3. **Claude** — 依後台盤點結果，準備下一個低風險後台功能分支。

本輪任務的核心目標：

```text
先把 Codex-Spark 的 BookReaderPage.tsx typecheck/build 修復合回 feat/r2-integrate-imports-notes，
再由 AGY 重新驗收 E500 live service，
最後才讓 Claude 開始下一個後台功能分支。
```

---

## 2. 已完成背景

### 2.1 AGY — E500 live acceptance

```text
分支：feat/r2-integrate-imports-notes
報告 commit：fd22dcaf053c378f01fc6f31270c17335d5c5357
報告檔案：docs/r2/AI-SmartBook-R2-e500-live-acceptance-report-20260623.md
```

已驗證：

```text
/api/admin/books：200 OK
/api/admin/import/question-bank/jobs：200 OK
/admin/import/question-bank：200 OK
/admin/import/smart-solve：200 OK
/books：200 OK
stale server：已清除
404 問題：已消失
```

### 2.2 Claude — Admin module inventory

```text
分支：feat/r2-integrate-imports-notes
報告 commit：f78f22cdae465189930f6bfadbbaa43d8cba38a8
報告檔案：docs/r2/AI-SmartBook-R2-admin-module-architecture-inventory-termination-report-20260623.md
```

盤點結果：

```text
總模組數：17
Done：8
Partial：5
Missing：4
缺少 Route：8
缺少 API：10
缺少 DB table：5
```

建議優先實作：

```text
1. feat/r2-admin-notes-management
2. feat/r2-admin-student-overview
3. feat/r2-admin-global-qa-logs
4. feat/r2-admin-import-history
```

### 2.3 Codex-Spark — Build/typecheck 修復

```text
分支：fix/r2-build-typecheck-runtime-guards
報告 commit：2d0b60eca14cd44cb4ece2525fa718c9591a40fc
實作 commit：f95e801cb6806124136be9e7dd423b8d7bc9f731
報告檔案：docs/r2/AI-SmartBook-R2-runtime-fix-report-20260623.md
```

已修正：

```text
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
```

已驗證：

```text
AI-Stu-R1 typecheck：PASS
AI-Stu-R1 build：PASS
AI-adm-D1 typecheck：PASS
AI-adm-D1 build：PASS
JSX parse error：已消失
```

---

## 3. 執行順序

請依序執行，不要三個 Agent 同時改同一分支。

```text
Step 1：Codex-Spark 合併 fix 分支回 feat/r2-integrate-imports-notes
Step 2：AGY pull 最新 feat/r2-integrate-imports-notes，重啟 E500 服務並實機驗收
Step 3：Claude 從穩定後的 feat/r2-integrate-imports-notes 開下一個功能分支
```

---

# 4. Codex-Spark 128K 任務

## 4.1 任務名稱

```text
Merge R2 Build/Typecheck Runtime Guards Into Integration Branch
```

## 4.2 負責 Agent

```text
Codex-Spark 128K
```

## 4.3 工作目錄

```text
/home/b827262/project/AI-SmartBook-R2
```

## 4.4 目標

將以下分支的修復合回主整合分支：

```text
source branch：fix/r2-build-typecheck-runtime-guards
target branch：feat/r2-integrate-imports-notes
```

必須確保實作 commit：

```text
f95e801cb6806124136be9e7dd423b8d7bc9f731
```

進入 `feat/r2-integrate-imports-notes`。

## 4.5 Codex-Spark Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Task:
Merge the R2 build/typecheck runtime guard fix branch back into the integration branch.

Workspace:
/home/b827262/project/AI-SmartBook-R2

Target branch:
feat/r2-integrate-imports-notes

Source branch:
fix/r2-build-typecheck-runtime-guards

Important commits:
- fix code commit: f95e801cb6806124136be9e7dd423b8d7bc9f731
- fix report commit: 2d0b60eca14cd44cb4ece2525fa718c9591a40fc

Rules:
1. Do not modify .env.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, or .claude.
4. Do not refactor reader architecture.
5. Only merge the build/typecheck runtime guard fix into feat/r2-integrate-imports-notes.
6. If merge conflict appears, inspect it. If non-trivial, stop and report blocker.

Steps:
1. cd /home/b827262/project/AI-SmartBook-R2
2. git fetch origin --prune
3. git checkout feat/r2-integrate-imports-notes
4. git pull --ff-only origin feat/r2-integrate-imports-notes
5. git merge origin/fix/r2-build-typecheck-runtime-guards
6. Verify that apps/AI-Stu-R1/src/pages/BookReaderPage.tsx contains the typecheck fixes from f95e801c.

Validation:
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build

git status --short

Create report:
docs/r2/AI-SmartBook-R2-merge-runtime-guards-report-20260623.md

Commit if needed:
merge: integrate R2 build/typecheck runtime guards

Push:
origin feat/r2-integrate-imports-notes

Final report in Traditional Chinese:
- 狀態：success / failure / blocker / permission-halt
- target branch
- source branch
- merged commit SHA
- conflict status
- changed files
- typecheck/build results
- report path
- final commit SHA
- push result
- git status --short
- 是否提交 .env/db/log/.claude：否

建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 4.6 驗收標準

```text
1. feat/r2-integrate-imports-notes 包含 f95e801c 的 BookReaderPage.tsx 修復。
2. AI-Stu-R1 typecheck PASS。
3. AI-Stu-R1 build PASS。
4. AI-adm-D1 typecheck PASS。
5. AI-adm-D1 build PASS。
6. 沒有提交 .env / DB / logs / uploads / backups / .claude。
```

---

# 5. AGY 任務

## 5.1 任務名稱

```text
Post-Merge E500 Live Acceptance Verification
```

## 5.2 負責 Agent

```text
AGY
```

## 5.3 工作目錄

```text
/home/b827262/project/AI-SmartBook-R2
```

## 5.4 前置條件

必須等 Codex-Spark 完成 merge 後再開始。

確認 `feat/r2-integrate-imports-notes` 已包含：

```text
f95e801c 或其 merge commit
```

## 5.5 AGY Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Task:
Run post-merge E500 live acceptance verification after the build/typecheck runtime guard fixes are merged into feat/r2-integrate-imports-notes.

Workspace:
/home/b827262/project/AI-SmartBook-R2

Branch:
feat/r2-integrate-imports-notes

Precondition:
The branch must include the Codex-Spark fix commit f95e801c or its merge commit.

Rules:
1. Do not modify source code.
2. Do not commit .env.
3. Do not commit SQLite DB files.
4. Do not commit logs, uploads, backups, or .claude.
5. Stop only R2 processes confirmed by cwd under /home/b827262/project/AI-SmartBook-R2.

Steps:
1. git fetch origin --prune
2. git checkout feat/r2-integrate-imports-notes
3. git pull --ff-only origin feat/r2-integrate-imports-notes
4. git log --oneline -10 and confirm the runtime guard merge is present.
5. Stop stale R2 node processes after verifying cwd.
6. Restart:
   - Admin API 4300
   - Student API 4310
   - Admin frontend 5174
   - Student frontend 5173

Curl validation:
curl -s http://127.0.0.1:4300/api/admin/books | head -c 1000
curl -s http://127.0.0.1:4300/api/admin/import/question-bank/jobs
curl -I http://127.0.0.1:5174/admin/import/question-bank
curl -I http://127.0.0.1:5174/admin/import/smart-solve
curl -I http://127.0.0.1:5173/books

Browser/manual validation:
1. Admin sidebar modular groups still appear.
2. Question Bank JSON Import page works and no 404.
3. Smart Solve page still has book selector.
4. Student /books opens.
5. Reader opens for a real book.
6. AI Notes navigation guide/test flow is still understandable.
7. No Vite JSX parse overlay appears.

Create report:
docs/r2/AI-SmartBook-R2-post-merge-e500-acceptance-report-20260623.md

Commit:
docs(r2): add post-merge E500 acceptance report

Push:
origin feat/r2-integrate-imports-notes

Final report in Traditional Chinese:
- 狀態
- branch / commit
- 是否包含 runtime guard merge
- 停止與重啟 PID
- curl 結果
- 瀏覽器實測結果
- 是否仍有 404
- 是否仍有 stale server 問題
- 是否仍有 Vite JSX parse overlay
- report path
- Commit SHA
- Push 結果
- 是否提交 .env/db/log/.claude：否

建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 5.6 驗收標準

```text
1. 四個服務正常啟動。
2. /api/admin/books 回傳非空。
3. Question Bank jobs API 不 404。
4. /admin/import/question-bank HTTP 200。
5. /admin/import/smart-solve HTTP 200。
6. /books HTTP 200。
7. 無 Vite parse error overlay。
8. 無 stale server。
```

---

# 6. Claude 任務

## 6.1 任務名稱

```text
Prepare R2 Admin Notes Management Feature Branch
```

## 6.2 負責 Agent

```text
Claude Code
```

## 6.3 工作目錄

```text
/home/b827262/project/AI-SmartBook-R2
```

## 6.4 前置條件

必須等 AGY 完成 post-merge E500 live acceptance 後再開始。

起點分支：

```text
feat/r2-integrate-imports-notes
```

新分支：

```text
feat/r2-admin-notes-management
```

## 6.5 任務目的

依 Claude 盤點報告，下一個最低風險功能為：

```text
AI 筆記管理（admin CRUD）
```

理由：

```text
1. 可沿用既有 smart_book_notes table。
2. 不需要新增 DB table。
3. 可補齊 Admin Sidebar 中的 AI 筆記管理入口。
4. 可讓後台管理員查看、篩選、刪除學生筆記。
```

## 6.6 Claude Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Task:
Prepare and implement the first low-risk R2 admin module after integration: Admin Notes Management.

Workspace:
/home/b827262/project/AI-SmartBook-R2

Base branch:
feat/r2-integrate-imports-notes

Create branch:
feat/r2-admin-notes-management

Precondition:
AGY post-merge E500 acceptance must be complete and successful.

Goal:
Add an admin-side AI Notes Management module using the existing smart_book_notes table.

Scope:
1. Add admin route only if real page is implemented:
   /admin/notes

2. Add admin sidebar entry:
   智能書本管理 -> AI 筆記管理

3. Add admin API endpoints:
   GET /api/admin/notes
   GET /api/admin/books/:bookId/notes
   DELETE /api/admin/books/:bookId/notes/:noteId

4. Reuse existing smart_book_notes table.
   Do not add new DB table unless absolutely necessary.

5. Page features:
   - show notes list
   - filter by book
   - show note title/content/type/pageNumber/chapterId/createdAt
   - link/open related student reader if possible
   - delete note with confirmation
   - show fallback when no notes exist

Rules:
1. Do not modify .env.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, or .claude.
4. Do not refactor unrelated reader logic.
5. Do not implement student overview or QA logs in this branch.
6. Keep this as a small vertical slice.

Validation:
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build

Runtime checks if services can run:
curl -s http://127.0.0.1:4300/api/admin/notes | head -c 1000
curl -I http://127.0.0.1:5174/admin/notes

Create report:
docs/r2/AI-SmartBook-R2-admin-notes-management-implementation-report-20260623.md

Commit:
feat(r2): add admin notes management

Push:
origin feat/r2-admin-notes-management

Final report in Traditional Chinese:
- 狀態：success / failure / blocker / permission-halt
- branch
- base branch
- changed files
- added routes
- added API endpoints
- DB table reused
- UI behavior
- typecheck/build results
- runtime curl results
- report path
- Commit SHA
- Push result
- git status --short
- 是否提交 .env/db/log/.claude：否

建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

## 6.7 驗收標準

```text
1. /admin/notes 頁面存在且可開。
2. Admin Sidebar 有 AI 筆記管理入口。
3. GET /api/admin/notes 可回傳筆記資料。
4. GET /api/admin/books/:bookId/notes 可依書本查詢。
5. DELETE /api/admin/books/:bookId/notes/:noteId 可刪除指定筆記。
6. 沿用 smart_book_notes，不新增不必要 table。
7. Admin build/typecheck PASS。
8. 不影響 student reader / notes navigation。
```

---

## 7. 總分工表

| 順序 | Agent | 任務 | 分支 | 是否改 Source | 產出 |
|---|---|---|---|---|---|
| 1 | Codex-Spark 128K | 合併 runtime guard fix | `feat/r2-integrate-imports-notes` | 是，merge 既有修復 | merge report |
| 2 | AGY | 合併後 E500 live 驗收 | `feat/r2-integrate-imports-notes` | 否，只報告 | post-merge acceptance report |
| 3 | Claude Code | Admin Notes Management | `feat/r2-admin-notes-management` | 是，小型功能 | implementation report |

---

## 8. 不可並行事項

```text
1. AGY 不要在 Codex-Spark merge 前驗收。
2. Claude 不要在 AGY post-merge 驗收前開功能分支。
3. 三個 Agent 不要同時改 feat/r2-integrate-imports-notes。
4. 不要直接在主整合分支上做大型新功能。
```

---

## 9. 結論

本輪建議採取保守串行流程：

```text
Codex-Spark 先合併 build/typecheck 修復
AGY 再做 E500 post-merge 驗收
Claude 最後開低風險 Admin Notes Management 分支
```

這樣可以確保：

```text
1. R2 主整合分支先穩定。
2. Student build/typecheck 修復不被遺漏。
3. E500 實機服務可用。
4. 下一個後台功能分支從穩定基準開發。
```
