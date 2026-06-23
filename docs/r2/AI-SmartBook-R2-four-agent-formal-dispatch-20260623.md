# AI-SmartBook-R2 四 Agent 正式分工任務書

日期：2026-06-23

## 1. 目的

本文件整理 AI-SmartBook-R2 目前最新狀態，並正式分配後續四個 Agent 的任務範圍：

| Agent | 指定模型 | 任務定位 |
|---|---|---|
| Agent A | codex-5.3-Spark 128K | 修 `pnpm build`、DB build error、`BookReaderPage.tsx` TypeScript |
| Agent B | GPT-5.4 Medium / High | 前台六大模組盤點與移植策略 |
| Agent C | Claude Sonnet 4.6 Medium / High | 管理後台盤點與架構建議 |
| Agent D | AGY / Gemini 3.1 Pro High | UX、外觀、底圖、圖片素材、CSS、RWD、截圖驗收 |

本文件可作為後續開新 worktree、分支、交辦任務與驗收的統一依據。

---

## 2. 目前最新狀態摘要

### 2.1 R2 主整合分支

```text
feat/r2-integrate-imports-notes
```

目前已完成：

```text
1. Question Bank JSON Import 整合
2. Smart Solve JSON Import 整合
3. AI Notes Navigation 整合
4. Admin sidebar 模組化
5. Smart Solve 書本下拉選單
6. Question Bank / Smart Solve API 404 修正
7. E500 live acceptance 驗收
8. Post-merge E500 acceptance 驗收
```

### 2.2 AGY 最新回報

```text
報告檔案：docs/r2/AI-SmartBook-R2-post-merge-e500-acceptance-report-20260623.md
Commit SHA：8e340927
分支：feat/r2-integrate-imports-notes
Push：成功
```

內容涵蓋：

```text
1. Post-merge E500 live acceptance
2. R2 服務重啟
3. curl 驗證
4. browser/manual 驗證
5. stale server 確認
6. Vite JSX parse overlay 確認
```

### 2.3 Claude Sonnet 最新回報

```text
報告檔案：docs/r2/AI-SmartBook-R2-admin-notes-management-termination-report-20260623.md
Commit SHA：92665e70
分支：feat/r2-admin-notes-management
Push：成功
```

內容涵蓋：

```text
1. worktree 切換問題與解法
2. linter 自動介入處理
3. 7 個修改檔案清單
4. 3 個新增 API
5. Admin Notes Management 頁面功能
6. 驗證結果
7. 安全性確認
8. 後續建議
```

### 2.4 Codex 最新回報

```text
報告檔案：.claude/worktrees/r2-admin-notes-management/docs/r2/AI-SmartBook-R2-admin-notes-management-session-upload-report-20260623.md
最新 Commit SHA：57b8d4df
分支：feat/r2-admin-notes-management
Push：成功
```

內容涵蓋：

```text
1. 本次續作
2. 重複 route 清理
3. typecheck/build
4. 臨時埠 runtime 驗證
5. 上傳結果
6. worktree clean
```

重要注意：

```text
.claude/worktrees/... 為本地 worktree 路徑。
若該報告檔已被提交到 GitHub，後續應確認實際 repository path 是否也位於 docs/r2/。
不得提交 .claude 本地狀態或 agent runtime 資料。
```

---

## 3. 分工總原則

### 3.1 工作方式

建議使用 `git worktree`，避免多 Agent 同時在同一個目錄與分支修改檔案。

基準目錄：

```text
/home/b827262/project/AI-SmartBook-R2
```

建議 worktree 目錄：

```text
/home/b827262/project/AI-SmartBook-R2-agent-a-build
/home/b827262/project/AI-SmartBook-R2-agent-b-student-modules
/home/b827262/project/AI-SmartBook-R2-agent-c-admin-architecture
/home/b827262/project/AI-SmartBook-R2-agent-d-ux-acceptance
```

### 3.2 不可同時做的事

```text
1. 不要讓四個 Agent 同時改 feat/r2-integrate-imports-notes。
2. 不要直接 merge 大型上游分支。
3. 不要提交 .env、SQLite DB、logs、uploads、backups、.claude。
4. 不要把 UI / UX 驗收和功能實作混在同一個 commit。
5. 不要讓文件任務與 source code 任務混在同一個分支。
```

### 3.3 建議分支策略

```text
Agent A：fix/r2-build-typecheck-runtime-guards-v2
Agent B：docs/r2-student-six-modules-inventory
Agent C：docs/r2-admin-architecture-next-plan
Agent D：docs/r2-ux-rwd-visual-acceptance
```

若 Agent C 已在 `feat/r2-admin-notes-management` 進行功能實作，後續應先完成該分支驗收，再決定是否 merge 回 `feat/r2-integrate-imports-notes`。

---

# 4. Agent A 任務 — codex-5.3-Spark 128K

## 4.1 定位

```text
快速修 build、typecheck、runtime guard、小範圍 bug，不做大型架構決策。
```

## 4.2 工作目標

```text
1. 確保 pnpm build 可穩定執行。
2. 排除 DB build error / unable to open database file。
3. 維持 BookReaderPage.tsx TypeScript clean。
4. 確認 AI-Stu-R1 / AI-adm-D1 build 和 typecheck PASS。
5. 檢查 feat/r2-admin-notes-management 是否引入新 build/typecheck 問題。
```

## 4.3 建議分支

```text
fix/r2-build-typecheck-runtime-guards-v2
```

Base branch：

```text
feat/r2-integrate-imports-notes
```

如果要檢查 notes management 分支，則可另外 compare：

```text
feat/r2-admin-notes-management
```

## 4.4 Agent A Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Task:
Run R2 build/typecheck stability verification and fix only small build/typecheck/runtime guard issues.

Workspace:
/home/b827262/project/AI-SmartBook-R2-agent-a-build

Base branch:
feat/r2-integrate-imports-notes

Create branch:
fix/r2-build-typecheck-runtime-guards-v2

Context:
Previous fixes were made in BookReaderPage.tsx and post-merge E500 acceptance passed. A new admin notes management feature branch also exists:
feat/r2-admin-notes-management

Scope:
1. Verify current integration branch build/typecheck.
2. Verify whether feat/r2-admin-notes-management has any build/typecheck regressions.
3. Fix only safe TypeScript/build issues if found.
4. Do not refactor architecture.
5. Do not touch UX/CSS except if needed for build correctness.

Commands:
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm build

Rules:
- Do not commit .env.
- Do not commit DB files.
- Do not commit logs, uploads, backups, .claude.
- Do not implement new features.
- If pnpm build fails due to DB access, document root cause and implement the smallest safe guard.

Create report:
docs/r2/AI-SmartBook-R2-agent-a-build-typecheck-report-20260623.md

Commit:
fix(r2): stabilize build and typecheck after admin notes work

Push:
origin fix/r2-build-typecheck-runtime-guards-v2

Final report in Traditional Chinese:
- 狀態
- 分支
- 檢查的 base branch / feature branch
- 修正檔案
- pnpm build 結果
- AI-Stu-R1 typecheck/build 結果
- AI-adm-D1 typecheck/build 結果
- 是否仍有 DB build error
- Commit SHA
- Push 結果
- 是否提交 .env/db/log/.claude：否
```

## 4.5 驗收標準

```text
1. AI-Stu-R1 typecheck PASS。
2. AI-Stu-R1 build PASS。
3. AI-adm-D1 typecheck PASS。
4. AI-adm-D1 build PASS。
5. pnpm build 若仍失敗，必須明確分類為 pre-existing / environment / code regression。
6. 沒有提交不該提交的本地檔案。
```

---

# 5. Agent B 任務 — GPT-5.4 Medium / High

## 5.1 定位

```text
前台六大模組盤點與移植策略，不先大改 source code。
```

## 5.2 六大模組

```text
1. 智能書本
2. 智能影音
3. 智能題庫
4. 智能筆記
5. 智能手稿
6. 我的題庫
```

## 5.3 工作目標

盤點 R2 目前前台對這六大模組的狀態：

```text
1. 是否有 route
2. 是否有 page/component
3. 是否有 API
4. 是否有 DB table/model
5. 是否有 CSS/RWD
6. 是否有上游參考實作
7. 目前是 done / partial / placeholder / missing
8. 下一步建議
```

## 5.4 建議分支

```text
docs/r2-student-six-modules-inventory
```

Base branch：

```text
feat/r2-integrate-imports-notes
```

## 5.5 Agent B Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Task:
Create the AI-SmartBook-R2 student six-module inventory and migration strategy.

Workspace:
/home/b827262/project/AI-SmartBook-R2-agent-b-student-modules

Base branch:
feat/r2-integrate-imports-notes

Create branch:
docs/r2-student-six-modules-inventory

Reference upstream directory:
/home/b827262/project/ai_tutor_helper_upstream_ai_notes

Do not modify the upstream reference directory.

Scope:
Documentation only. Do not modify source code.

Modules to inventory:
1. 智能書本
2. 智能影音
3. 智能題庫
4. 智能筆記
5. 智能手稿
6. 我的題庫

For each module, document:
- R2 route
- R2 page/component
- R2 API endpoint
- R2 DB table/model
- R2 CSS/RWD status
- upstream route/page/API/table if found
- status: done / partial / placeholder / missing / incompatible
- migration risk
- recommended implementation branch
- recommended next step

Search keywords:
student, books, video, media, question, quiz, notes, handwriting, manuscript, my questions, smart book, smart video, smart question, smart note, 智能書本, 智能影音, 智能題庫, 智能筆記, 智能手稿, 我的題庫

Create report:
docs/r2/AI-SmartBook-R2-student-six-modules-inventory-20260623.md

Commit:
docs(r2): add student six modules inventory

Push:
origin docs/r2-student-six-modules-inventory

Final report in Traditional Chinese:
- 狀態
- 分支
- 盤點模組數
- done / partial / missing 統計
- 缺少 route
- 缺少 API
- 缺少 DB table
- 建議實作順序
- Commit SHA
- Push 結果
- 是否修改 source code：否
- 是否提交 .env/db/log/.claude：否
```

## 5.6 驗收標準

```text
1. 產出完整六大模組對照表。
2. 明確指出哪些功能只是入口/版面，哪些已有資料流。
3. 明確列出上游可參考檔案。
4. 不修改 source code。
5. 不提交本地機密或 runtime 檔案。
```

---

# 6. Agent C 任務 — Claude Sonnet 4.6 Medium / High

## 6.1 定位

```text
管理後台盤點與架構建議，並負責低風險 admin 功能分支設計。
```

## 6.2 目前狀態

Agent C 已完成：

```text
feat/r2-admin-notes-management
Commit：92665e70
後續 Codex 補充 commit：57b8d4df
```

下一步不建議立刻開新大型功能，而是先完成：

```text
1. 整理 admin notes 分支是否可 merge 回 feat/r2-integrate-imports-notes。
2. 明確列出與 integration branch 的差異。
3. 若無風險，再準備 PR / merge handoff。
```

## 6.3 建議分支

繼續使用：

```text
feat/r2-admin-notes-management
```

或建立文件分支：

```text
docs/r2-admin-notes-merge-readiness
```

## 6.4 Agent C Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Task:
Prepare merge-readiness review for feat/r2-admin-notes-management.

Workspace:
/home/b827262/project/AI-SmartBook-R2-agent-c-admin-architecture

Base branch:
feat/r2-integrate-imports-notes

Feature branch:
feat/r2-admin-notes-management

Context:
Claude implemented Admin Notes Management and pushed commit 92665e70.
Codex continued the same branch and pushed commit 57b8d4df.
Before merging this feature back into feat/r2-integrate-imports-notes, perform a merge-readiness review.

Scope:
Documentation-first. Do not merge unless explicitly instructed.

Review:
1. Compare feat/r2-integrate-imports-notes..feat/r2-admin-notes-management.
2. List changed files.
3. Confirm added routes:
   - /admin/notes
4. Confirm added APIs:
   - GET /api/admin/notes
   - GET /api/admin/books/:bookId/notes
   - DELETE /api/admin/books/:bookId/notes/:noteId
5. Confirm DB usage:
   - reuse smart_book_notes
   - no unnecessary new table
6. Confirm sidebar entry.
7. Confirm duplicate route cleanup from Codex session.
8. Confirm typecheck/build status.
9. Identify merge risks.
10. Provide go/no-go recommendation.

Create report:
docs/r2/AI-SmartBook-R2-admin-notes-management-merge-readiness-20260623.md

Commit:
docs(r2): add admin notes merge readiness review

Push:
origin feat/r2-admin-notes-management

Final report in Traditional Chinese:
- 狀態
- feature branch
- base branch
- changed files
- APIs added
- route added
- DB impact
- typecheck/build result
- merge risk
- go/no-go recommendation
- Commit SHA
- Push result
- 是否提交 .env/db/log/.claude：否
```

## 6.5 驗收標準

```text
1. 清楚判斷 feat/r2-admin-notes-management 是否可合回主整合分支。
2. 列出所有 changed files。
3. 確認沒有多餘 migration / DB table。
4. 確認無重複 route。
5. 提供 go/no-go 結論。
```

---

# 7. Agent D 任務 — AGY / Gemini 3.1 Pro High

## 7.1 定位

```text
UX、外觀、底圖、圖片素材、CSS、RWD、截圖驗收。
```

Agent D 不負責主功能實作，不改 DB，不改 API。重點是實機視覺、RWD、可用性、截圖與驗收報告。

## 7.2 工作目標

```text
1. 驗收 R2 admin sidebar 模組化後的 UX。
2. 驗收 Question Bank / Smart Solve / Admin Notes 頁面是否易用。
3. 驗收 Student /books、Reader、AI Notes Navigation 的流程。
4. 檢查 390px mobile RWD。
5. 檢查圖片、底圖、封面、fallback 狀態。
6. 產出截圖驗收報告。
```

## 7.3 建議分支

```text
docs/r2-ux-rwd-visual-acceptance
```

Base branch：

```text
feat/r2-integrate-imports-notes
```

若要驗收 Admin Notes：

```text
feat/r2-admin-notes-management
```

## 7.4 Agent D Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Task:
Run UX/RWD/visual acceptance for AI-SmartBook-R2.

Workspace:
/home/b827262/project/AI-SmartBook-R2-agent-d-ux-acceptance

Base branch:
feat/r2-integrate-imports-notes

Optional feature branch to inspect:
feat/r2-admin-notes-management

Scope:
UX / CSS / RWD / screenshots / visual acceptance only.
Do not modify DB or API.
Do not implement new backend features.

Pages to test:
Admin:
- /admin
- /admin/books
- /admin/books/new
- /admin/import/question-bank
- /admin/import/smart-solve
- /admin/notes if testing feat/r2-admin-notes-management

Student:
- /books
- book reader page for a real book
- AI notes panel
- AI notes navigation flow

Viewport sizes:
- desktop 1440px
- tablet 768px
- mobile 390px

Check:
1. Sidebar groups readable.
2. Disabled/planned menu items are not misleading.
3. Question Bank import help text is understandable.
4. Smart Solve book selector is understandable.
5. Admin Notes page is usable if present.
6. Student books grid works.
7. Reader does not show Vite overlay.
8. AI Notes navigation flow is discoverable.
9. No broken background image or cover image layout.
10. Mobile layout does not overflow.

Create report:
docs/r2/AI-SmartBook-R2-ux-rwd-visual-acceptance-20260623.md

If screenshots are created, store only safe lightweight screenshots under:
docs/validation/screenshots/r2-ux-20260623/

Do not commit large binary files without user approval.

Commit:
docs(r2): add UX RWD visual acceptance report

Push:
origin docs/r2-ux-rwd-visual-acceptance

Final report in Traditional Chinese:
- 狀態
- branch
- tested pages
- tested viewport sizes
- screenshot paths if any
- UX issues found
- CSS/RWD issues found
- blocker/failure list
- recommendation
- Commit SHA
- Push result
- 是否提交 .env/db/log/.claude：否
```

## 7.5 驗收標準

```text
1. 有清楚的 UX/RWD 驗收報告。
2. 有 desktop/tablet/mobile 結論。
3. 有針對後台與前台分開列出問題。
4. 不提交大型圖片或 runtime 檔案。
5. 若有 blocker，明確附頁面與重現步驟。
```

---

## 8. 四 Agent 執行順序建議

建議不要四個同時全部改 code。最佳順序如下：

```text
第一順位：Agent A
先驗證 build/typecheck 與 DB build error 是否已穩定。

第二順位：Agent C
針對 feat/r2-admin-notes-management 做 merge-readiness review。

第三順位：Agent D
在穩定分支上做 UX/RWD/visual acceptance。

第四順位：Agent B
做前台六大模組盤點，作為下一階段功能移植依據。
```

可並行的安全組合：

```text
Agent A + Agent B 可並行：
- A 改 build/typecheck 小修
- B 只寫 docs，不改 source

Agent C + Agent D 可並行但要注意分支：
- C 看 admin notes feature branch
- D 做 UX 驗收，若測 admin notes 必須明確指定同一 branch
```

不可並行的組合：

```text
Agent A 和 Agent C 不要同時修改 feat/r2-admin-notes-management source。
Agent C 沒完成 merge-readiness 前，不要讓 AGY/Agent D 把 admin notes 當正式已 merge 功能。
```

---

## 9. 後續整合節點

完成四 Agent 任務後，進入下一個 integration gate：

```text
Gate 1：Agent A build/typecheck 報告
Gate 2：Agent C admin notes merge-readiness go/no-go
Gate 3：Agent D UX/RWD acceptance
Gate 4：Agent B student six-module inventory
```

若 Gate 1、Gate 2、Gate 3 都通過，才建議：

```text
將 feat/r2-admin-notes-management 合回 feat/r2-integrate-imports-notes
```

合併後再由 AGY 做一次 E500 live acceptance。

---

## 10. 結論

目前 R2 已從「功能分支整合」進入「穩定化 + 模組盤點 + 低風險功能合併前審查」階段。

正式分工如下：

```text
Agent A / codex-5.3-Spark 128K：build/typecheck 穩定器
Agent B / GPT-5.4 Medium/High：前台六大模組盤點師
Agent C / Claude Sonnet 4.6 Medium/High：後台架構與 admin feature 審查師
Agent D / AGY Gemini 3.1 Pro High：UX/RWD/截圖驗收師
```

下一個最重要決策：

```text
feat/r2-admin-notes-management 是否可以合回 feat/r2-integrate-imports-notes。
```

請先完成 Agent A 與 Agent C 的報告，再進行 merge。