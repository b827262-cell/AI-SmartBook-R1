# AI-SmartBook-R2｜AGY 重啟服務後驗收任務

Executor: AGY
Date: 2026-06-24
Branch: fix/r2-admin-settings-files-integration

## 1. 任務目的

Codex GPT-5.4 已完成一鍵完成 workflow 程式實作。請 AGY 在整合分支上重啟本機服務，並做實機驗收。

本任務不是開發新功能，而是：

1. 更新到最新分支。
2. 重啟 API、後台、學生前台服務。
3. 驗收一鍵完成流程、Google AI 狀態、模型下拉選單、Reader TOC、Q&A、知識點與前台同步。
4. 產出繁體中文驗收報告。

## 2. 目標分支

```text
fix/r2-admin-settings-files-integration
```

請先確認目前在正確分支：

```bash
git fetch origin
git checkout fix/r2-admin-settings-files-integration
git pull origin fix/r2-admin-settings-files-integration
git branch --show-current
git log -1 --oneline
git status --short
```

## 3. 重啟前注意事項

請勿中斷正在執行中的 Codex 任務。

請勿提交下列項目：

```text
.env
API key
DB / sqlite / dump
logs
.claude/
apps/AI-adm-D1/data/
runtime upload data
test archive
temporary browser test folder
```

若工作樹仍有 `M pnpm-lock.yaml`，請先檢查來源：

```bash
git diff --stat -- pnpm-lock.yaml
git diff -- pnpm-lock.yaml | head -n 120
```

若只是本機安裝造成的不必要變更，請還原：

```bash
git restore pnpm-lock.yaml
```

只有在相依套件真的需要變更時，才提交 lockfile，並在報告說明。

## 4. 重啟服務

請依目前專案實際啟動方式重啟三個服務：

```text
API server：AI-adm-D1 server / API
後台 Vite：AI-adm-D1 admin frontend
學生前台 Vite：AI-Stu-R1 student frontend
```

建議目標：

```text
API：127.0.0.1:4300
後台：127.0.0.1:5173
學生前台：127.0.0.1:5174
```

可先查看 scripts：

```bash
cat apps/AI-adm-D1/package.json
cat apps/AI-Stu-R1/package.json
```

啟動時請沿用專案既有 scripts 與環境變數設定。

## 5. 必跑驗證

請執行：

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

若已在 Codex 實作階段跑過，AGY 仍需重新確認最新分支狀態。

## 6. API 驗收

請確認以下 API 可用：

```text
POST /api/admin/books/:bookId/one-click-workflow
GET  /api/admin/books/:bookId/one-click-workflow
```

並確認 AI 設定 API 不回傳完整 Google API key，只能回傳狀態、來源、遮罩後內容與模型資訊。

AI 設定來源判斷應符合：

```text
1. 後台使用者儲存設定優先
2. 若沒有後台設定，讀取 server environment fallback
3. 兩者皆無才顯示未提供
```

## 7. 後台頁面驗收

### 7.1 AI 設定頁

路徑：

```text
/admin/settings/ai
```

需驗收：

- Google AI 設定欄位存在。
- 可顯示來源：後台設定 / 環境設定 / 未提供。
- 綠燈時可選模型。
- 紅燈時模型選單 disabled。
- 生成模型與 embedding 模型分開。
- 模型選擇儲存後重新整理仍保留。

生成模型選項需包含：

```text
Gemini 3.1 Flash Lite
Gemma 4 31B
Gemma 4 26B
Gemini 3.5 Flash
Gemini 3 Flash
Gemini 2.5 Flash
Gemini 2.5 Flash Lite
```

Embedding 模型選項需包含：

```text
Gemini Embedding 2
Gemini Embedding 1
```

### 7.2 檔案 / PDF 頁

路徑：

```text
/admin/books/<bookId>/files
```

需驗收：

- 有 PDF 時，一鍵完成可啟動 workflow。
- 無 PDF 時，一鍵完成提示請先上傳 PDF 並中止。
- AI 狀態紅燈時，一鍵完成不得執行 AI 步驟。
- AI 狀態綠燈時，可使用選定模型。
- workflow 顯示每一步狀態。
- Q&A 可重跑覆寫。
- 知識點可重跑覆寫。
- Reader TOC 起始頁由系統偵測。
- Reader TOC 終止頁使用 PDF 最後一頁。
- 一鍵完成會自動產生 Reader TOC。
- 最後才建立章節。

### 7.3 介面設定頁

路徑：

```text
/admin/appearance
```

需驗收：

- D. ICO / 圖片設定為 4x4 宮格。
- 顯示 a.png 到 h.png。
- 顯示 1.png、2.png、4.png、6.png。
- 第 13 到 16 格為預留欄位。

## 8. 學生前台驗收

路徑：

```text
/books
/books/<bookId>
```

需驗收：

- 書籍狀態同步為 published 後，學生端可讀取。
- 前台可看到一鍵完成後產生的 Q&A / 知識點資料流。
- Reader 章節 / Reader TOC 可讀取最新結果。
- 若有設定 6.png、g.png、h.png、a.png 到 f.png，重新整理後前台 icon 正常顯示。

## 9. 一鍵完成流程驗收順序

AGY 請至少測以下案例：

1. 未上傳 PDF：按一鍵完成，應提示請先上傳 PDF，流程中止。
2. 有 PDF，但無 AI 設定：紅燈，流程中止。
3. 有 PDF，AI 設定來自環境設定：綠燈，可執行。
4. 有 PDF，AI 設定來自後台設定：綠燈，可執行。
5. 綠燈時切換模型，執行一鍵完成，確認 workflow 使用選定模型。
6. 完整流程成功後確認：Q&A、知識點、前台同步、Reader TOC、章節建立。

## 10. 最終報告格式

請建立驗收報告 MD，建議路徑：

```text
docs/r2/AI-SmartBook-R2-agy-restart-services-acceptance-report-20260624.md
```

報告需使用繁體中文，格式如下：

```text
# AI-SmartBook-R2 AGY 重啟服務後驗收報告

- 狀態
  - success:
  - failure:
  - blocker:
  - permission-halt:

- current branch:
- current commit SHA:

- 重啟服務
  - API:
  - 後台 Vite:
  - 學生前台 Vite:

- 驗證結果
  - AI-adm-D1 typecheck:
  - AI-adm-D1 build:
  - AI-Stu-R1 typecheck:
  - AI-Stu-R1 build:

- 後台驗收
  - AI 設定頁:
  - 檔案 / PDF 頁:
  - 一鍵完成 workflow:
  - ICO 4x4:

- 前台驗收
  - /books:
  - /books/<bookId>:
  - Reader TOC:
  - Q&A / 知識點:

- AI 設定來源驗收
  - 後台設定:
  - 環境設定 fallback:
  - 未提供狀態:
  - 是否未回傳完整 key:

- 一鍵完成流程驗收
  - PDF 檢查:
  - AI Key 檢查:
  - 模型選擇:
  - 建立 Q&A:
  - 建立知識點:
  - 同步後台:
  - 同步前台:
  - Reader TOC:
  - 最後建立章節:

- pnpm-lock.yaml 處理:
- git status --short:
```

## 11. Commit 建議

若只有新增驗收報告：

```bash
git add docs/r2/AI-SmartBook-R2-agy-restart-services-acceptance-report-20260624.md
git commit -m "docs(r2): add agy restart acceptance report"
git push origin fix/r2-admin-settings-files-integration
```

若驗收中發現 bug，請不要直接合併 master，先回報 failure 與 blocker。
