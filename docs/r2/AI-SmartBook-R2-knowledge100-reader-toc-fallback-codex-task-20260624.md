# AI-SmartBook-R2｜知識點 100 筆與 Reader TOC fallback 修正任務

Executor: Codex
Date: 2026-06-24
Branch: fix/r2-admin-settings-files-integration

## 1. 實測背景

AGY / 使用者實測一鍵完成流程後，畫面顯示：

- Google AI Key 已提供，AI 狀態為綠燈。
- 一鍵完成可跑到 Q&A、知識點、同步 published。
- 知識點目前只建立 5 筆。
- Reader TOC 步驟亮紅點。
- Reader TOC 錯誤訊息為：No chapter/section heading lines were detected in the selected page range.

本任務請 Codex 修正兩項：

1. 知識點產生數量支援 100 筆。
2. Reader TOC 偵測不到 heading 時，不要讓 workflow 卡死，需提供 fallback。

## 2. 知識點數量需求

目前 workflow 只建立 5 筆知識點。請改為可產生 100 筆。

### 2.1 建議 UI

在一鍵完成區加入可設定數量：

```text
知識點產生數量：100
```

可用選項建議：

```text
5 / 10 / 20 / 50 / 100
```

預設值請設為：

```text
100
```

### 2.2 後端規則

- 一鍵完成 workflow 執行建立知識點時，需讀取使用者選擇的數量。
- 最大值限制為 100，避免無限生成。
- 若模型一次產生 100 筆容易超時，請分批執行，例如每批 20 筆，總共 5 批。
- 需做基本去重，避免同一概念重複寫入。
- workflow 狀態需顯示進度，例如：20 / 100、40 / 100、100 / 100。

### 2.3 寫入規則

- 既有可重跑覆寫規則保留。
- 重跑時先清掉 workflow 產生的舊知識點，再寫入新知識點。
- 寫入後同步後台知識點管理。
- 寫入後同步前台 published / student 可讀取資料流。

## 3. Reader TOC 紅點原因

目前紅點主因：

```text
No chapter/section heading lines were detected in the selected page range.
```

代表在選定頁碼範圍內找不到章節 heading，不應直接讓整體 workflow 失敗。

## 4. Reader TOC fallback 規則

請將 Reader TOC 改成三層 fallback：

### 4.1 第一層：正常偵測

- 起始頁由系統自動偵測。
- 終止頁使用 PDF 最後一頁。
- 若成功偵測到 chapter / section heading，正常產生 Reader TOC。

### 4.2 第二層：起始頁 fallback

若起始頁或 heading 偵測失敗：

- 起始頁使用 1。
- 終止頁仍優先使用 PDF 最後一頁。

UI 顯示：

```text
Reader TOC fallback：未偵測到章節標題，已使用首頁 1 ～ PDF 最後一頁建立目錄。
```

### 4.3 第三層：PDF 最後頁 fallback

若系統無法讀到 PDF 最後頁：

- 終止頁使用預估值 500。
- 起始頁使用 1。

UI 顯示：

```text
Reader TOC fallback：無法取得 PDF 總頁數，已使用首頁 1 ～ 預估末頁 500。
```

### 4.4 最低可用目錄

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

重點：Reader TOC 不應因 heading 偵測失敗而讓整體 workflow failed。最多標示 partial / fallback used。

## 5. 一鍵完成流程調整

一鍵完成流程中的 Reader TOC 步驟應改為：

1. 嘗試自動偵測 Reader TOC 起始頁。
2. 嘗試取得 PDF 最後一頁。
3. 若取得成功，範圍為 detectedStartPage ～ pdfLastPage。
4. 若偵測不到起始頁，起始頁 fallback 為 1。
5. 若取得不到 PDF 最後一頁，終止頁 fallback 為 500。
6. 嘗試產生章節式 Reader TOC。
7. 若沒有 heading，建立最低可用目錄：全書內容。
8. workflow 狀態顯示 success 或 fallback success，不要顯示紅點 failed。

## 6. Workflow 狀態建議

Reader TOC 狀態可以新增：

```text
success
fallback_success
failed
```

若使用 fallback，顯示黃色或提示文字，不要顯示紅燈。

建議訊息：

```text
Reader TOC 已完成（fallback）：未偵測到章節標題，已建立全書內容目錄。
```

## 7. 驗收案例

請至少驗收：

1. 一鍵完成建立知識點 100 筆。
2. 若模型分批，狀態可看到進度。
3. 重跑一鍵完成後，舊 workflow 知識點會被覆寫，不會重複暴增。
4. Reader TOC 正常偵測成功時，使用章節 heading 建立目錄。
5. Reader TOC 找不到 heading 時，fallback 到 1 ～ PDF 最後一頁。
6. 若 PDF 最後頁無法取得，fallback 到 1 ～ 500。
7. fallback 狀態不讓整體 workflow failed。
8. 前台 Reader 可讀到 fallback 目錄。
9. 後台 / 前台 published 狀態維持正常。

## 8. 建議檢查檔案

請先搜尋實際實作位置：

```bash
grep -R "one-click-workflow" -n apps packages | head -n 50
grep -R "No chapter/section heading" -n apps packages | head -n 50
grep -R "knowledge" -n apps/AI-adm-D1/src packages | head -n 80
grep -R "Reader TOC" -n apps packages | head -n 80
```

可能相關：

```text
apps/AI-adm-D1/src/server/index.ts
apps/AI-adm-D1/src/pages/tabs/FilesTab.tsx
apps/AI-adm-D1/src/api.ts
packages/book-core/src/reader-outline.ts
packages/db/src/repositories/smartBookNote.repo.ts
packages/schema/src/aiJob.schema.ts
```

## 9. 驗證指令

請執行：

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

若修改 packages，請補充相關 package typecheck。

## 10. 不可提交

不得提交：

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

## 11. Suggested Commit Message

```bash
git commit -m "fix(r2): expand knowledge points and fallback reader toc"
```

## 12. 最終回報格式

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
  - 知識點數量已支援 100 筆
  - Reader TOC 已加入 fallback
  - heading 偵測失敗不再讓整體 workflow failed

- 驗證結果:
  - AI-adm-D1 typecheck:
  - AI-adm-D1 build:
  - AI-Stu-R1 typecheck:
  - AI-Stu-R1 build:
  - 知識點 100 筆:
  - Reader TOC fallback 1 ～ PDF 最後頁:
  - Reader TOC fallback 1 ～ 500:
  - 前台 Reader:

- git status --short:
```
