# AI-SmartBook-R2｜一鍵完成流程程式實作任務（Codex GPT-5.4）

Executor: Codex GPT-5.4  
Date: 2026-06-24  
Branch: fix/r2-admin-settings-files-integration

## 1. 任務定位

前面已建立多份流程規格與 addendum，但部分只是文件與流程紀錄，尚未完成程式實作。

本任務請 Codex GPT-5.4 直接完成程式任務，不是只新增 process log。

請在目前分支完成：

- 一鍵完成後端 Job / 排程式流程。
- PDF 上傳檢查。
- Google AI 狀態偵測，需支援後台設定與系統環境 fallback。
- 綠燈時顯示模型下拉選單。
- 一鍵完成依使用者選定模型執行 AI 步驟。
- Reader TOC 自動頁碼範圍：起始頁系統偵測，終止頁直接使用 PDF 最後一頁。
- 一鍵完成流程需包含 Reader TOC 生成。
- 建立 Q&A、建立知識點、同步後台知識點、同步前台上架、最後建立章節。

## 2. 不要再只交文件

本次 acceptance 以程式變更為準。

必須修改實際程式檔，例如：

- apps/AI-adm-D1/src/pages/tabs/FilesTab.tsx
- apps/AI-adm-D1/src/pages/AiSettingsPage.tsx
- apps/AI-adm-D1/src/components/GoogleAiSettingsCard.tsx
- apps/AI-adm-D1/src/server/ai-settings-store.ts
- apps/AI-adm-D1/src/server/index.ts
- apps/AI-adm-D1/src/api.ts
- packages/schema/src/*
- packages/book-core/src/*

實際檔案請以 repo 搜尋結果為準。

## 3. 一鍵完成主流程

使用者按下「一鍵完成」後，系統要建立可追蹤的後端 Job / 排程式流程。

流程順序必須如下：

1. 檢查是否已有 PDF。
2. 若沒有 PDF：顯示「請先上傳 PDF」並中止。
3. 若有 PDF：檢查 AI 狀態。
4. AI 狀態需同時偵測：
   - 後台使用者儲存設定。
   - server 環境設定 fallback。
5. 若沒有 AI 設定：顯示紅燈與「未提供 Google API Key」，並中止。
6. 若 AI 狀態為綠燈：允許使用者選擇模型。
7. 建立 Q&A。
8. 建立知識點。
9. 同步知識點到後台管理。
10. 同步知識點到前台上架。
11. 最後才建立章節。
12. 完成後顯示 success。

重要：章節建立是最後步驟。

## 4. PDF 檢查規則

一鍵完成開始時，必須先判斷該 book 是否已有 PDF 檔案。

若不存在 PDF：

- 不執行 AI 檢查。
- 不執行 Q&A。
- 不執行知識點。
- 不執行章節。
- UI 顯示明確訊息：請先上傳 PDF。
- Job 狀態為 blocked 或 failed。

## 5. AI 狀態偵測規則

AI 狀態來源優先順序：

1. 後台使用者儲存的 Google AI 設定。
2. server 環境設定 fallback。
3. 兩者皆無，才是未提供。

UI 顯示：

- 綠燈：已提供 Google AI 設定（後台設定）。
- 綠燈：已提供 Google AI 設定（環境設定）。
- 紅燈：未提供 Google API Key。

後端回傳不得包含完整 key，只能回傳狀態、來源、遮罩後內容與模型資訊。

建議資料結構：

```ts
type AiConfigSource = "user" | "env" | "none";

type AiStatusResponse = {
  hasGoogleApiKey: boolean;
  source: AiConfigSource;
  maskedKey?: string;
  generationModel?: string;
  embeddingModel?: string;
};
```

## 6. 綠燈模型下拉選單

當 AI 狀態為綠燈時，在 AI 狀態區與一鍵完成區顯示可用模型下拉選單。

若 AI 狀態為紅燈：

- 下拉選單 disabled。
- 顯示「請先提供 Google AI 設定」。

### 6.1 生成模型選單

請提供下列選項：

- Gemini 3.1 Flash Lite
- Gemma 4 31B
- Gemma 4 26B
- Gemini 3.5 Flash
- Gemini 3 Flash
- Gemini 2.5 Flash
- Gemini 2.5 Flash Lite

用於：

- 建立 Q&A。
- 建立知識點。
- 摘要、考點、易錯點等文字生成。

### 6.2 Embedding 模型選單

請提供下列選項：

- Gemini Embedding 2
- Gemini Embedding 1

用於：

- 知識點向量化。
- 語意搜尋。
- Q&A / RAG 檢索資料索引。

### 6.3 模型選擇持久化

使用者選定模型後需儲存到後台設定。重新整理頁面後仍保留。

一鍵完成執行時，必須使用目前選定模型。

## 7. Reader TOC 自動頁碼規則

Reader TOC 不應要求一般使用者手動輸入終止頁。

規則：

- 起始頁：系統自動偵測。
- 終止頁：直接取 PDF 最後一頁。
- 正常流程不需要使用者手動輸入起始頁或終止頁。
- 若起始頁偵測失敗，才顯示手動覆寫欄位。

UI 可顯示唯讀資訊：

```text
閱讀器目錄範圍：系統偵測起始頁 N ～ PDF 最後一頁 M
```

## 8. 一鍵完成必須整合 Reader TOC

目前下方 JSON index row action 的「產生閱讀器目錄」可以保留。

但一鍵完成必須自動執行同一個 Reader TOC 生成流程，不需要使用者再到下方手動點。

一鍵完成中的 Reader TOC 步驟：

1. 取得 JSON index。
2. 偵測 Reader TOC 起始頁。
3. 取得 PDF 最後頁。
4. 產生 Reader TOC。
5. 寫入前台 reader 所需資料。

## 9. Job / 排程狀態 UI

一鍵完成應顯示狀態列表：

- 檢查 PDF
- 檢查 Google AI 設定
- 使用模型
- 建立 Q&A
- 建立知識點
- 同步知識點到後台
- 同步前台上架
- 產生 Reader TOC
- 最後建立章節

每一步需有狀態：

- pending
- running
- success
- failed
- blocked
- skipped

若任何步驟失敗，需保留已完成步驟結果並顯示錯誤訊息。

## 10. API / 後端建議

請依現有 server 架構實作，不強制新建路由名稱。

但建議至少有：

- 取得 AI 狀態。
- 儲存 AI 模型設定。
- 啟動一鍵完成 job。
- 查詢 job 狀態。

一鍵完成不可只在前端假跑，必須有後端流程或可追蹤的 server-side job 狀態。

## 11. 前台同步要求

建立知識點後需：

- 同步到後台知識點管理。
- 同步到前台可讀取資料。
- 前台重新整理後可看到上架的知識點。

章節建立為最後步驟，但完成後前台 reader 也應讀到最新章節 / Reader TOC。

## 12. pnpm-lock.yaml

目前工作樹曾出現 `M pnpm-lock.yaml`。

請先檢查變更來源：

```bash
git diff --stat -- pnpm-lock.yaml
git diff -- pnpm-lock.yaml | head -n 120
```

若只是本機 pnpm install 造成的不必要變更，請還原：

```bash
git restore pnpm-lock.yaml
```

只有在 package dependency 實際有必要變更時，才提交 lockfile，並在最終報告說明原因。

## 13. 驗證指令

請執行：

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

若修改 packages，也請補充相關 package 的 typecheck。

## 14. 手動驗收

請至少驗收：

1. 未上傳 PDF 時按一鍵完成，顯示請先上傳 PDF，流程中止。
2. 有 PDF 但沒有 AI 設定時，顯示紅燈並中止。
3. 有 PDF 且 AI 設定來自後台設定時，顯示綠燈與來源。
4. 有 PDF 且 AI 設定來自環境 fallback 時，顯示綠燈與來源。
5. 綠燈時模型下拉選單可用。
6. 紅燈時模型下拉選單 disabled。
7. 模型選擇重新整理後仍保留。
8. 一鍵完成會依選定模型建立 Q&A。
9. 一鍵完成會依選定模型建立知識點。
10. 知識點同步到後台管理。
11. 知識點同步前台上架。
12. Reader TOC 起始頁由系統偵測。
13. Reader TOC 終止頁使用 PDF 最後一頁。
14. 一鍵完成自動產生 Reader TOC。
15. 最後才建立章節。

## 15. 不可提交

不得提交：

- .env
- API key
- DB / sqlite / dump
- logs
- .claude/
- apps/AI-adm-D1/data/
- runtime upload data
- temporary browser test folder
- test archive

## 16. Suggested Commit Message

```bash
git commit -m "feat(r2): implement one click ai workflow"
```

## 17. 最終回報格式

請用繁體中文回報：

```text
## 最終報告（繁體中文）

- 狀態
  - success:
  - failure:
  - blocker:
  - permission-halt:

- current branch:
- current commit SHA:

- changed files:
  - ...

- 實作摘要:
  - ...

- 一鍵完成流程:
  - PDF 檢查:
  - AI 狀態檢查:
  - 模型下拉選單:
  - Q&A:
  - 知識點:
  - 同步後台:
  - 同步前台:
  - Reader TOC:
  - 最後建立章節:

- 驗證結果:
  - AI-adm-D1 typecheck:
  - AI-adm-D1 build:
  - AI-Stu-R1 typecheck:
  - AI-Stu-R1 build:
  - 手動驗收:

- pnpm-lock.yaml 處理:

- git status --short:
```
