# AI-SmartBook-R2｜Claude 最終驗收審查與功能整合合併任務

Executor: Claude
Date: 2026-06-24
Branch: fix/r2-admin-settings-files-integration

## 1. 任務目的

目前 AI-SmartBook-R2 已在 `fix/r2-admin-settings-files-integration` 分支累積多個功能修正與實作。請 Claude 作為最後驗收審查者，統一檢查所有已完成與待完成項目，確認是否可以進入合併流程。

本任務不是單一功能開發，而是最終整合驗收：

1. 檢查目前分支所有功能是否一致。
2. 檢查 Codex GPT-5.4 實作是否完整。
3. 檢查 AGY 重啟服務後驗收結果是否足夠。
4. 檢查一鍵完成 workflow 是否符合最新使用者需求。
5. 檢查 Google AI Key、模型選擇、知識點 100 筆、Reader TOC fallback、ICO 4x4、前台同步等功能是否可以合併。
6. 若有問題，列出 blocker 與修正建議。
7. 若全部通過，產出可合併報告與合併建議。

## 2. 必須先同步分支

請先執行：

```bash
git fetch origin
git checkout fix/r2-admin-settings-files-integration
git pull origin fix/r2-admin-settings-files-integration
git branch --show-current
git log -1 --oneline
git status --short
```

請勿直接合併 master。請先完成驗收報告。

## 3. 重要安全規則

不可提交或外洩：

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

若看到 `pnpm-lock.yaml` 有未提交變更，請先查明原因：

```bash
git diff --stat -- pnpm-lock.yaml
git diff -- pnpm-lock.yaml | head -n 120
```

若只是本機安裝造成的不必要變更，請還原：

```bash
git restore pnpm-lock.yaml
```

只有在 package dependency 實際需要變更時，才可提交 lockfile，並在報告清楚說明。

## 4. 需整合審查的功能清單

### 4.1 Google AI 設定

請驗收：

- 後台 AI 設定頁存在。
- 支援使用者手動輸入 Google AI 設定。
- 支援儲存、清除、測試連線。
- 儲存後不需要重啟服務。
- 支援 server env fallback。
- AI 狀態來源顯示正確：後台設定 / 環境設定 / 未提供。
- API 不回傳完整 key，只能回傳狀態、來源、遮罩後內容與模型資訊。

### 4.2 綠燈模型下拉選單

綠燈時需啟用模型選單；紅燈時需 disabled。

生成模型需包含：

```text
Gemini 3.1 Flash Lite
Gemma 4 31B
Gemma 4 26B
Gemini 3.5 Flash
Gemini 3 Flash
Gemini 2.5 Flash
Gemini 2.5 Flash Lite
```

Embedding 模型需包含：

```text
Gemini Embedding 2
Gemini Embedding 1
```

請確認模型選擇會持久化，重新整理後仍保留。

### 4.3 一鍵完成 workflow

最新需求流程：

1. 使用者按下一鍵完成。
2. 系統建立後端 job / server-side workflow。
3. 先檢查是否已上傳 PDF。
4. 若無 PDF，提示請先上傳 PDF 並中止。
5. 若有 PDF，檢查 Google AI 設定。
6. 若無 AI Key，紅燈並中止 AI 流程。
7. 若 AI 狀態綠燈，使用選定模型。
8. 建立 Q&A。
9. 建立知識點。
10. 同步知識點到後台管理。
11. 同步前台 published / 上架。
12. 產生 Reader TOC。
13. 最後才建立章節。

請確認這是真實後端 workflow，不是前端假訊息。

### 4.4 一鍵完成 Job 狀態

需顯示每一步狀態：

```text
pending
running
success
failed
blocked
skipped
fallback_success
```

至少需有：

- 檢查 PDF
- 檢查 Google AI 設定
- 使用模型
- 建立 Q&A
- 建立知識點
- 同步後台
- 同步前台
- Reader TOC
- 最後建立章節

### 4.5 知識點 100 筆

最新需求：

- 知識點不應只產生 5 筆。
- 需支援產生 100 筆。
- 可提供 5 / 10 / 20 / 50 / 100 選項。
- 預設建議為 100。
- 若一次產生 100 筆會超時，需支援分批，例如 20 筆 x 5 批。
- 重跑一鍵完成時，應清除 workflow 產生的舊知識點，避免重複暴增。
- 建立後同步後台知識點管理。
- 建立後同步前台資料流。

### 4.6 Reader TOC 自動偵測與 fallback

最新需求：

- Reader TOC 起始頁由系統自動偵測。
- Reader TOC 終止頁直接使用 PDF 最後一頁。
- 正常流程不要求使用者手動輸入終止頁。
- 若偵測不到 heading，不可讓整個 workflow failed。

fallback 規則：

1. 正常偵測 heading。
2. 若 heading 偵測失敗，使用起始頁 1。
3. 終止頁優先使用 PDF 最後一頁。
4. 若 PDF 最後一頁不可得，使用預估末頁 500。
5. 若仍無法產生章節 heading，建立最低可用目錄：

```text
章節：全書內容
頁碼：1 ～ PDF 最後一頁
```

若 PDF 最後一頁不可得：

```text
章節：全書內容
頁碼：1 ～ 500
```

Reader TOC 使用 fallback 時，狀態應為 fallback_success 或 partial success，不應顯示紅燈 failed。

### 4.7 Q&A 與知識點重跑覆寫

請驗收：

- Q&A 可重跑覆寫。
- 知識點可重跑覆寫。
- 不應每次重跑都重複新增造成資料暴增。
- 舊 workflow 產生的資料需可安全替換。

### 4.8 Published / 前台同步

請驗收：

- 一鍵完成後書籍狀態可同步為 published。
- 學生前台可讀取該書。
- 前台 Reader 可讀取最新 contents / notes / outline / Reader TOC。
- 前台可看到 Q&A / 知識點資料流。

### 4.9 ICO / 圖片設定 4x4

請驗收：

- 後台 `D. ICO / 圖片設定` 使用 4x4 宮格。
- 顯示 a.png 到 h.png。
- 顯示 1.png、2.png、4.png、6.png。
- 第 13 到 16 格為預留欄位。
- 6.png 對應 studentHeaderBrandLogoUrl。
- g.png 對應分類圖示。
- h.png 對應 studentHeaderHomeButtonIconUrl。
- h.png 匯入時設定 studentHeaderHomeButtonIconMode=image。
- a.png 到 f.png 對應閱讀器工具列 icon。

## 5. 必跑驗證指令

請至少執行：

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

若 packages 有變更，請補充相關 package typecheck。

## 6. 建議 API 驗收

請驗收：

```text
POST /api/admin/books/:bookId/one-click-workflow
GET  /api/admin/books/:bookId/one-click-workflow
```

並驗收 AI 設定 API：

- 有後台設定時來源為 user/admin。
- 無後台設定但有 env 時來源為 env。
- 都沒有時來源為 none。
- 不回傳完整 key。

## 7. 建議頁面驗收

請驗收：

```text
/admin/settings/ai
/admin/books/<bookId>/files
/admin/appearance
/books
/books/<bookId>
```

## 8. Claude 最終判斷標準

### 可以合併的條件

只有符合以下條件，才建議合併：

- typecheck / build 全部通過。
- API 不洩漏 key。
- `.env` / runtime data 未提交。
- 一鍵完成 workflow 不是前端假訊息。
- PDF 檢查、AI Key 檢查、模型選擇、Q&A、知識點、Reader TOC、最後建立章節流程正確。
- Reader TOC fallback 不再讓流程紅燈 failed。
- 知識點 100 筆或對應選項已完成。
- 前台 published / Reader 可讀取最新資料。
- git status 乾淨，或只剩明確排除的本機 runtime 檔案。

### 不可合併的情況

若有以下任一項，請標記 blocker：

- Google API key 被寫進 Git。
- API 回傳完整 key。
- 一鍵完成只是前端假流程。
- 沒 PDF 仍繼續跑 workflow。
- 沒 AI Key 仍跑 AI 步驟。
- Reader TOC heading 偵測失敗造成整體 failed。
- 知識點仍只有固定 5 筆，無 100 筆或數量設定。
- 前台無法讀取 published 資料。
- build/typecheck 失敗。

## 9. 最終報告檔

請 Claude 建立：

```text
docs/r2/AI-SmartBook-R2-claude-final-acceptance-merge-review-report-20260624.md
```

## 10. 最終報告格式

請用繁體中文回報：

```text
# AI-SmartBook-R2 Claude 最終驗收審查與合併建議報告

- 狀態
  - success:
  - failure:
  - blocker:
  - permission-halt:

- current branch:
- current commit SHA:

- 審查範圍:
  - Google AI 設定:
  - 模型下拉選單:
  - 一鍵完成 workflow:
  - 知識點 100 筆:
  - Reader TOC fallback:
  - Q&A / 知識點重跑覆寫:
  - Published / 前台同步:
  - ICO 4x4:

- 驗證結果:
  - AI-adm-D1 typecheck:
  - AI-adm-D1 build:
  - AI-Stu-R1 typecheck:
  - AI-Stu-R1 build:
  - API 驗收:
  - 後台頁面驗收:
  - 前台頁面驗收:

- 安全檢查:
  - 是否提交 .env:
  - 是否提交 API key:
  - API 是否回傳完整 key:
  - runtime data 是否誤提交:

- 合併建議:
  - 是否建議合併到 master:
  - 若不建議，需列出 blocker:

- changed files summary:
  - ...

- pnpm-lock.yaml 處理:

- git status --short:
```

## 11. 若全部通過

若 Claude 判定可合併，請只輸出合併建議，不要擅自 merge，除非使用者明確授權。

建議合併前指令：

```bash
git checkout master
git pull origin master
git merge --no-ff fix/r2-admin-settings-files-integration
git status --short
```

若合併有衝突，請停止並回報。
