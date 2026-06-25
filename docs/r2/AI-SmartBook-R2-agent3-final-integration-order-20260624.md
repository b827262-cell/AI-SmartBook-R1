# AI-SmartBook-R2 Agent 3 Final Integration Order

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
Base branch：`fix/r2-admin-settings-files-integration`  
Agent 3 工作分支：`fix/r2-smart-features-final-integration`  
任務定位：整合 Agent 1 / Agent 2 成果，補執行 knowledge100 與 Reader TOC fallback，完成最終整合驗收。

---

## 1. 觸發來源

本任務接續 Two-Agent Parallel Execution Order 與 Agent 1 完成回報。

### 1.1 上游指令文件

```text
docs/r2/AI-SmartBook-R2-two-agent-parallel-execution-order-20260624.md
```

原始目標 commit：

```text
07dbc09a2639775b6bc02f889efcee078a801c0b
```

process log commit：

```text
cb3c4686
```

### 1.2 Agent 1 完成狀態

Agent 1：Claude  
Branch：`fix/r2-smart-features-runtime-claude`  
任務定位：smart features runtime / 安全 / auth / UI glue  
狀態：已回報可合併，等待 Agent 3 整合。

Agent 1 已生成文件：

```text
docs/r2/AI-SmartBook-R2-agent1-claude-final-status-report-20260624.md
```

Agent 1 完成重點：

- 六項範圍完成狀態與 grep 數量驗證。
- 全端點 runtime probe 結果表。
- 提供 Agent 2 可銜接的四個接口：sync stub、list、stats、student。
- 確認未觸碰 Google provider / sentence-index / upsert core。
- 最終判定：可合併，等待 Agent 3 整合。

### 1.3 Agent 2 預期來源

Agent 2：GPT-5.4 / Codex  
Branch：`fix/r2-google-knowledge-generation`  
任務定位：Google API Key → 知識點生成核心 service。

Agent 2 預期報告：

```text
docs/r2/AI-SmartBook-R2-gpt54-google-knowledge-implementation-report-20260624.md
docs/r2/AI-SmartBook-R2-gpt54-google-knowledge-verification-report-20260624.md
```

Agent 3 開工前必須先確認 Agent 2 branch 已存在且 report 可讀。若不存在，請停止並回報 blocker。

---

## 2. Agent 3 任務總目標

Agent 3 只負責 final integration，不再重新分配 Agent 1 / Agent 2 的責任。

目標：

1. 建立 final integration branch。
2. 合併 Agent 1 Claude branch。
3. 合併 Agent 2 GPT-5.4 / Codex branch。
4. 解決衝突，保留兩邊正確責任範圍。
5. 執行 knowledge100 / Reader TOC fallback 任務。
6. 跑完整 typecheck、build、runtime probe、secret / env tracking check。
7. 產出 Agent 3 implementation report 與 verification report。
8. 最終判定是否可建立 PR 合併。

---

## 3. 建立整合分支

請 Agent 3 執行：

```bash
git fetch origin
git checkout fix/r2-admin-settings-files-integration
git pull origin fix/r2-admin-settings-files-integration

git checkout -b fix/r2-smart-features-final-integration
```

若分支已存在：

```bash
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
```

---

## 4. 合併順序

請依序合併，不要顛倒：

```bash
git merge --no-ff origin/fix/r2-smart-features-runtime-claude
```

確認 Agent 1 無衝突後，再合併 Agent 2：

```bash
git merge --no-ff origin/fix/r2-google-knowledge-generation
```

若 Agent 2 branch 尚未存在，或無法讀取 Agent 2 verification report，請停止並回報：

```text
blocker: Agent 2 branch or verification report missing
```

---

## 5. Conflict 解決原則

若發生 conflict，請依下列責任歸屬處理。

### 5.1 優先保留 Agent 1 Claude 內容

| 範圍 | 原則 |
|---|---|
| smart video runtime | 保留 Claude 實作 |
| NotesHelpPage localhost 修正 | 保留 Claude 實作 |
| auth guard | 保留 Claude 實作，Agent 2 route 需沿用 |
| URL validation / XSS guard | 保留 Claude 實作 |
| Q&A idempotency | 保留 Claude 實作 |
| smart features UI glue | 保留 Claude 實作 |
| knowledge runtime shell | 保留 Claude route / UI / stats 外殼 |

### 5.2 優先保留 Agent 2 GPT-5.4 / Codex 內容

| 範圍 | 原則 |
|---|---|
| Google provider service | 保留 Agent 2 實作 |
| Gemini / Google timeout retry error mapping | 保留 Agent 2 實作 |
| sentence-index parser / chunking | 保留 Agent 2 實作 |
| knowledge generation prompt | 保留 Agent 2 實作 |
| JSON schema validation | 保留 Agent 2 實作 |
| smart_book_notes idempotent upsert | 保留 Agent 2 實作 |
| provider / status / stats / generate service | 保留 Agent 2 service，接到 Claude route shell |

### 5.3 最終整合原則

```text
Claude route / auth / UI shell + GPT-5.4 Google generation service
```

不要讓同一功能存在兩套路由、兩套 service 或兩套 upsert。若有重複實作，保留較完整且通過驗證的一套，另一套移除或改成 adapter。

---

## 6. 必須補執行的第三任務

Agent 3 合併完 Agent 1 / Agent 2 後，必須執行：

```text
docs/r2/AI-SmartBook-R2-knowledge100-reader-toc-fallback-codex-task-20260624.md
```

此任務不是作廢，也不是 Agent 1 / Agent 2 的完全重複。它是第三階段補強，包含：

1. 知識點支援 100 筆。
2. Reader TOC heading 偵測失敗時必須 fallback。
3. 一鍵完成 workflow 不得因 Reader TOC 無 heading 而 failed。

---

## 7. knowledge100 執行要求

### 7.1 UI / workflow 要求

一鍵完成流程需支援知識點數量：

```text
5 / 10 / 20 / 50 / 100
```

預設值：

```text
100
```

最大值：

```text
100
```

若無 UI 選項，也必須至少讓 workflow 使用預設 100，並在 report 中說明 UI 是否已接上。

### 7.2 後端要求

- 一鍵完成 workflow 建立知識點時需讀取數量設定。
- 若一次生成 100 筆容易超時，請分批執行，例如每批 20 筆。
- workflow 狀態需能表示進度，例如 20/100、40/100、100/100。
- 重跑時不可讓知識點重複暴增。
- 若採清除再重建策略，需只清 workflow 產生的舊知識點，不可誤刪人工內容。
- 若採 upsert 策略，需確認 second run created 不會再次大幅增加。

### 7.3 驗收條件

| 檢查 | 預期 |
|---|---|
| 第一次生成 | 可建立接近或等於指定數量知識點，最高 100 |
| 第二次重跑 | 不重複暴增 |
| 失敗處理 | 單批失敗不應讓整體資料不一致 |
| 進度狀態 | 可辨識目前進度或至少有 summary |
| 後台管理 | 可看到同步後知識點數量 |
| 前台學生端 | 可讀取 published 後知識點 |

---

## 8. Reader TOC fallback 執行要求

### 8.1 三層 fallback

第一層：正常偵測

- 起始頁由系統自動偵測。
- 終止頁使用 PDF 最後一頁。
- 若偵測到 chapter / section heading，正常產生 Reader TOC。

第二層：起始頁 fallback

- 若起始頁或 heading 偵測失敗，起始頁使用 1。
- 終止頁仍優先使用 PDF 最後一頁。

第三層：PDF 最後頁 fallback

- 若系統無法取得 PDF 最後頁，終止頁使用 500。
- 起始頁使用 1。

### 8.2 最低可用目錄

若仍無法從 JSON index 找出章節 heading，請建立最低可用目錄：

```text
章節：全書內容
頁碼：1 ～ PDF 最後一頁
```

若 PDF 最後頁不可得：

```text
章節：全書內容
頁碼：1 ～ 500
```

### 8.3 workflow 狀態

Reader TOC 狀態建議：

```text
success
fallback_success
failed
```

heading 偵測失敗不可讓整體 workflow failed。最多標示 partial / fallback used。

建議 UI 訊息：

```text
Reader TOC 已完成（fallback）：未偵測到章節標題，已建立全書內容目錄。
```

---

## 9. 必跑驗證

### 9.1 Typecheck / Build

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

若修改 packages，請補充相關 package typecheck。

### 9.2 Git / env / secret 檢查

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
grep -R "localhost" apps packages --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git || true
```

確認：

- `.env` 不得被追蹤。
- 實際 secret 不得出現在 GitHub、Markdown、log、API response、前端 bundle。
- localhost 若仍存在，需逐項說明是否為 dev-only 合理保留。

### 9.3 Runtime probes

依實際 route 調整並記錄原始輸出摘要：

```bash
curl -i http://127.0.0.1:4300/api/admin/settings/ai-provider
curl -i http://127.0.0.1:4300/api/admin/smart-videos
curl -i http://127.0.0.1:4300/api/admin/knowledge-points
curl -i http://127.0.0.1:4300/api/student/books
```

Knowledge generation probe：

```bash
curl -s -X POST http://127.0.0.1:4300/api/admin/books/<bookId>/knowledge/generate | head -c 2000
```

若實際 route 不同，請以專案 route 為準並在 report 中列出。

### 9.4 Idempotency probe

同一 bookId 重跑兩次：

```text
第一次：created 可大於 0
第二次：created 不應再次大幅增加，應以 updated / skipped 為主，或清除 workflow 舊資料後穩定重建
```

### 9.5 Reader TOC fallback probe

至少驗證：

1. 正常 heading 可產生章節式 TOC。
2. 找不到 heading 時 fallback 到 1 ～ PDF 最後一頁。
3. 無法取得 PDF 最後頁時 fallback 到 1 ～ 500。
4. fallback 狀態不讓 workflow failed。
5. 前台 Reader 可讀取 fallback 目錄。

---

## 10. Agent 3 不可提交

不得提交：

```text
.env
任何實際 API key
DB / sqlite / dump
logs
.claude/
apps/AI-adm-D1/data/
runtime upload data
test archive
temporary browser test folder
```

---

## 11. Agent 3 必須產出文件

Agent 3 完成後請新增：

```text
docs/r2/AI-SmartBook-R2-agent3-final-integration-implementation-report-20260624.md
docs/r2/AI-SmartBook-R2-agent3-final-integration-verification-report-20260624.md
```

建議再補一份 session log：

```text
docs/r2/AI-SmartBook-R2-agent3-final-integration-session-report-20260624.md
```

---

## 12. Agent 3 最終回報格式

請用繁體中文輸出：

```md
## Agent 3 Final Integration Report

### Status
- success:
- failure:
- blocker:
- permission-halt:

### Git
- repository:
- base branch:
- integration branch:
- merged branches:
- current commit SHA:
- changed files:

### Merge Result
- Claude branch:
- GPT-5.4 branch:
- conflicts:
- conflict resolution summary:

### Implemented Scope
- Agent 1 smart runtime integrated:
- Agent 2 Google knowledge generation integrated:
- knowledge100:
- Reader TOC fallback:
- one-click workflow status:

### Verification
- AI-adm-D1 typecheck:
- AI-adm-D1 build:
- AI-Stu-R1 typecheck:
- AI-Stu-R1 build:
- provider probe:
- smart video probe:
- knowledge points probe:
- knowledge generation 100:
- idempotency probe:
- Reader TOC fallback 1 to PDF last page:
- Reader TOC fallback 1 to 500:
- frontend Reader fallback TOC:
- env tracking:
- secret check:

### Remaining Risks
- risk 1:
- risk 2:

### Final Decision
- can merge / cannot merge:
- reason:
```

---

## 13. Suggested Commit Message

若全部完成：

```bash
git commit -m "fix(r2): integrate smart runtime and knowledge generation"
```

若只完成整合但 knowledge100 / Reader TOC fallback 尚未完成：

```bash
git commit -m "chore(r2): integrate smart feature branches for verification"
```

若發現 blocker，請不要硬合併，改產出 blocker report。

---

## 14. PR 建議

Agent 3 成功後才建立 PR。

PR title：

```text
fix(r2): integrate smart features runtime and Google knowledge generation
```

PR body 至少包含：

```md
## Summary

- Integrated Agent 1 Claude smart features runtime branch.
- Integrated Agent 2 GPT-5.4 / Codex Google knowledge generation branch.
- Added knowledge point count support up to 100.
- Added Reader TOC fallback for missing heading detection.
- Ensured one-click workflow does not fail on Reader TOC fallback.

## Verification

- AI-adm-D1 typecheck / build
- AI-Stu-R1 typecheck / build
- Runtime API probes
- Knowledge generation 100 probe
- Idempotency probe
- Reader TOC fallback probe
- env tracking / secret check

## Final Decision

Ready for AGY / Claude final verification.
```

---

## 15. 結論

Agent 3 現在可以啟動，但必須先確認 Agent 1 與 Agent 2 分支都已存在且 report 可讀。Agent 3 的工作不是重新開發 Agent 1 / Agent 2，而是整合、解衝突、補 knowledge100 與 Reader TOC fallback，最後產出 final integration verification report。
