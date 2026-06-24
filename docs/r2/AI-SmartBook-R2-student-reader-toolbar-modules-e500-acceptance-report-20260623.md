# E500 Acceptance Report — Student Reader Toolbar and Module Tabs

Date: 2026-06-23

## 狀態
- 完成。
- 於 `feat/r2-student-reader-toolbar-modules` 分支完成 E500 驗收文件與結果紀錄。
- 未進行 GUI 自動化點擊截圖，但完成 API + 前端元件程式碼可視證據驗證。

## 分支 / commit
- 分支：`feat/r2-student-reader-toolbar-modules`
- 目前提交：`1439f986`（`docs(r2): add session record for student reader toolbar and module tabs`）

## typecheck / build 結果
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck`：成功（exit 0）。
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build`：成功（exit 0）。
- 已出現 chunk 過大警告（前端既有警示），不影響建置成功。

## 四個按鈕驗收結果
- **貼圖筆記**：
  - `Reader` toolbar 顯示 `📌 貼圖筆記`。
  - 按下時會觸發 `setShowStickyNote(true)`，並顯示 `StickyNoteModal`。
- **貼回AI筆記**：
  - `PdfReaderToolbar` 顯示 `🤖 貼回AI筆記`。
  - 按下時會觸發 `setShowPasteBack(true)`，顯示 `PasteBackNotePanel`。
- **截圖問AI**：
  - `PdfReaderToolbar` 顯示 `📷 截圖問AI`。
  - 按下時會觸發 `setShowScreenshotAsk(true)`，顯示 `ExternalAiAskModal`。
- **遮答案**：
  - `PdfReaderToolbar` 顯示 `🙈 遮答案`/`🙈 結束遮答案` 並綁定 `maskMode`。
  - 會同步渲染 `AnswerMaskLayer`。

## Tab 驗收結果
- `ReaderTabs` 定義為四個 tab（由 dev server 提供的實際 TSX 源碼確認）：
  1. 智能書本
  2. 智能筆記
  3. 智能手稿
  4. 我的題庫
- 檔案中未發現 `智能影音`。
- `智能練題` 未出現在 tab 清單中，已替換成 `我的題庫`。

## 遮答案驗收結果
- `AnswerMaskLayer` 已掛載在 reader PDF 區域：
  - 拖曳可在頁面上產生遮罩。
  - 遮罩樣式為白色區塊（`.answer-mask-block`）。
  - 有遮罩清除控制（`清除此頁遮罩`）。
- `遮答案` 會切換 `maskMode`，並在同頁維持可見遮罩與畫面提示。

## 截圖問AI驗收結果
- 進入 `ExternalAiAskModal` 後支援：
  - 外部提示模板切換（整理重點 / 逐步解析 / 延伸提問 / 出題與解析）。
  - 一鍵複製提示詞。
  - 一鍵複製截圖（有截圖資料時）。
  - 按鈕包括 `Google`、`ChatGPT`、`Claude`、`Gemini`。
  - 文案標註不自動上傳，提示詞／影像不放網址。

## 貼回AI筆記驗收結果
- `PasteBackNotePanel` 提供供外部 AI 互動後貼入文字並保存為筆記。
- 提供 Google、ChatGPT、Claude、Gemini、Perplexity、Grok、Copilot、Meta AI、Google 搜尋、其他 8 個 provider 連結。
- 支援 `AI 解答筆記` 儲存，已走 `studentClient.createNote`。

## 貼圖筆記驗收結果
- `StickyNoteModal` 已可在 `貼圖筆記` 觸發後開啟。
- 提供頁面/章節 context 與文字草稿記錄。
- 目前限制：此版本無內建可繪圖貼紙 canvas（保留規劃字句：受保護 PDF 限制無法直接截圖），僅提供文字草稿模式。

## API 驗收（功能面補充）
- `GET /books`：`200`。
- `GET /api/student/books`：`200`。
- `GET /api/student/books/book_0fa830c0-60b2-40bd-b6b0-d0d12d00e509`：`200`，回應含 `pdfFileId`。
- `POST /api/student/books/book_0fa830c0-60b2-40bd-b6b0-d0d12d00e509/session`：回傳 `sessionId`。
- `GET /api/student/books/book_0fa830c0-60b2-40bd-b6b0-d0d12d00e509/files/file_4c57bcc3-1ad2-4be3-9bfe-2bae8d78fbc1/pdf-view`：`200`、`Content-Type: application/pdf`。
- PDF 回應前 5 bytes 為 `%PDF-`，確認可讀取 PDF 內容。

## 截圖或問題說明
- 未偵測到該次執行期間可見的 Vite overlay 或 API 失敗錯誤。
- 已完成 API、頁面載入、按鈕/tab 程式碼連動之可視證據驗收；
  但目前未以真實 GUI 瀏覽器完成逐步點擊截圖驗證（會再補齊視覺手工核對）。

## git status --short
- 目前工作樹仍有先前環境檔產物：
  - `?? .claude/`
  - `?? apps/AI-adm-D1/data/`
- 本任務新增報告檔案：
  - `docs/r2/AI-SmartBook-R2-student-reader-toolbar-modules-e500-acceptance-report-20260623.md`

## 是否提交 .env/db/log/.claude
- 否
