# AI-SmartBook-R2｜Agent 3 整合智能功能與 Google 知識生成任務

Executor: Agent 3
Date: 2026-06-24
Base branch: fix/r2-admin-settings-files-integration

## 1. 任務背景

Claude 最終驗收審查回報：

- 不建議目前直接合併到 master。
- 驗收分支 `fix/r2-admin-settings-files-integration` 仍缺少多數新功能的實際整合。
- 相關功能分散在兩個尚未整合的 agent 分支：
  - `fix/r2-smart-features-runtime-claude`
  - `fix/r2-google-knowledge-generation`

因此請 Agent 3 先做整合分支，把兩個 agent 分支的功能合入目前驗收分支，再進行完整 typecheck / build / runtime 驗收。

## 2. 重要原則

本任務不是直接合併 master。

請建立新的整合分支，避免污染目前驗收分支：

```text
fix/r2-agent3-smart-features-google-knowledge-integration
```

整合完成後，請產出報告，不要擅自 merge master。

## 3. 來源分支

### 3.1 基底分支

```text
fix/r2-admin-settings-files-integration
```

此分支目前包含：

- 一鍵完成 workflow 雛形 / 已有實作。
- Google AI 設定 env fallback。
- AI model dropdown addendum / 實作基礎。
- Reader TOC 自動偵測與最後頁 addendum。
- ICO 4x4 設定。
- Claude 最終驗收審查報告。

### 3.2 需整合分支 A

```text
fix/r2-smart-features-runtime-claude
```

預期功能：

- 智能影音。
- 知識點 shell。
- auth guard。
- NotesHelpPage。
- Q&A 冪等處理。

### 3.3 需整合分支 B

```text
fix/r2-google-knowledge-generation
```

預期功能：

- Google 知識生成 service。
- Google AI 知識點生成邏輯。
- 與一鍵完成 workflow 的知識點建立步驟整合。

## 4. 建議執行步驟

請先同步所有分支：

```bash
git fetch origin
git checkout fix/r2-admin-settings-files-integration
git pull origin fix/r2-admin-settings-files-integration
```

建立 Agent 3 整合分支：

```bash
git checkout -b fix/r2-agent3-smart-features-google-knowledge-integration
```

先合入 Agent 1：

```bash
git merge origin/fix/r2-smart-features-runtime-claude
```

解決衝突、跑基本 typecheck。

再合入 Agent 2：

```bash
git merge origin/fix/r2-google-knowledge-generation
```

解決衝突、再跑完整驗證。

若任一分支不存在，請停止並回報 blocker，不要猜測替代分支。

## 5. 衝突處理原則

### 5.1 不可覆蓋目前一鍵完成 workflow

目前 `fix/r2-admin-settings-files-integration` 已包含一鍵完成 workflow 與 server-side job。若合併衝突出現在以下檔案，請保留並整合兩邊邏輯，不要簡單覆蓋：

```text
apps/AI-adm-D1/src/server/index.ts
apps/AI-adm-D1/src/pages/tabs/FilesTab.tsx
apps/AI-adm-D1/src/api.ts
apps/AI-adm-D1/src/server/ai-settings-store.ts
packages/schema/src/aiJob.schema.ts
packages/db/src/repositories/aiJob.repo.ts
packages/db/src/repositories/qaLog.repo.ts
packages/db/src/repositories/smartBookNote.repo.ts
```

### 5.2 一鍵完成最終流程必須保留

整合後一鍵完成流程必須符合：

1. 先檢查 PDF。
2. 無 PDF：提示請先上傳 PDF 並中止。
3. 有 PDF：檢查 Google AI Key。
4. AI Key 來源支援後台設定與 env fallback。
5. 無 AI Key：紅燈並中止 AI 步驟。
6. 有 AI Key：綠燈並啟用模型選擇。
7. 建立 Q&A。
8. 建立知識點。
9. 同步知識點到後台。
10. 同步知識點到前台 published / student data flow。
11. Reader TOC 起始頁系統偵測。
12. Reader TOC 終止頁使用 PDF 最後一頁。
13. 若偵測不到 heading，使用 fallback，不得讓整體 workflow failed。
14. 最後才建立章節。

### 5.3 知識點 100 筆需求

整合後需支援：

- 知識點產生數量可選：5 / 10 / 20 / 50 / 100。
- 預設 100。
- 可分批產生，例如 20 x 5。
- 重跑時清除 workflow 產生的舊知識點，避免重複暴增。

### 5.4 Google 知識生成 service

請將 `fix/r2-google-knowledge-generation` 的 Google 知識生成 service 接到：

- 一鍵完成 workflow 的建立知識點步驟。
- 後台知識點管理資料流。
- 前台 published / student 可讀取資料流。

若該 service 與現有 AI provider / model dropdown 衝突，請以目前後台選定模型為準，並保留 env fallback。

### 5.5 智能影音與知識點 shell

請將 `fix/r2-smart-features-runtime-claude` 的智能影音與知識點 shell 接回：

- 後台管理入口。
- 學生端對應 tab / panel。
- 既有 auth guard。
- NotesHelpPage。

不要破壞目前 Reader、AI 筆記、PDF 工具列、ICO 4x4。

## 6. 安全規則

不得提交：

```text
.env
API key / token
DB / sqlite / dump
logs
.claude/
apps/AI-adm-D1/data/
runtime upload data
test archive
temporary browser test folder
```

若 `pnpm-lock.yaml` 有變更，請說明是否為必要 dependency 變更。若只是本機 install 導致，請還原。

## 7. 必跑驗證

請至少執行：

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

若 packages 有變更，請補跑相關 package typecheck。

## 8. Runtime 驗收項目

### 8.1 後台頁面

請驗收：

```text
/admin/settings/ai
/admin/books/<bookId>/files
/admin/appearance
```

需確認：

- AI 設定頁可顯示 key 來源。
- 綠燈時模型下拉選單可用。
- 紅燈時模型下拉 disabled。
- 檔案頁一鍵完成是真實 workflow。
- Reader TOC fallback 不再紅燈 failed。
- 知識點可產生 100 筆。
- ICO 4x4 仍正常。

### 8.2 學生端

請驗收：

```text
/books
/books/<bookId>
```

需確認：

- published 書籍可讀取。
- Reader TOC 可讀取最新資料。
- Q&A / 知識點可在前台資料流讀取。
- 智能影音入口存在且不破壞既有 tabs。
- AI 筆記 / PDF 工具列仍正常。

## 9. 產出報告

請建立報告：

```text
docs/r2/AI-SmartBook-R2-agent3-smart-features-google-knowledge-integration-report-20260624.md
```

## 10. 最終回報格式

請用繁體中文回報：

```text
# AI-SmartBook-R2 Agent 3 智能功能與 Google 知識生成整合報告

- 狀態
  - success:
  - failure:
  - blocker:
  - permission-halt:

- current branch:
- current commit SHA:

- merge sources:
  - fix/r2-smart-features-runtime-claude:
  - fix/r2-google-knowledge-generation:

- changed files:
  - ...

- 整合摘要:
  - 智能影音:
  - 知識點 shell:
  - Google 知識生成 service:
  - 一鍵完成 workflow:
  - Reader TOC fallback:
  - 知識點 100 筆:
  - Published / 前台同步:

- 衝突處理摘要:
  - ...

- 驗證結果:
  - AI-adm-D1 typecheck:
  - AI-adm-D1 build:
  - AI-Stu-R1 typecheck:
  - AI-Stu-R1 build:
  - runtime 後台驗收:
  - runtime 前台驗收:

- 安全檢查:
  - 是否提交 .env:
  - 是否提交 API key:
  - 是否提交 runtime data:
  - API 是否回傳完整 key:

- pnpm-lock.yaml 處理:

- git status --short:
```

## 11. 合併限制

Agent 3 不得自行 merge 到 master。

若整合與驗收通過，請只回報可進入 Claude final review / AGY acceptance。是否合併 master 需等待使用者明確授權。
