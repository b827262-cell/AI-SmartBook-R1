# AI-SmartBook-R2 Runtime Guard / Stale-server 檢核（2026-06-23）

## Student Reader TypeCheck 回歸修正

- 檢查並調整 `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` 的 runtime guards：
  - `VisualViewport` nullable 處理（避免在某些 mobile/webview 環境下為 null）。
  - `outerLayoutRef.current` 轉換前先做存在性檢查。
  - `book` 在觸控事件 handler 中改用 `book?.pdfFileId`，避免未取得書籍資料時仍觸發事件邏輯。
  - 將 `touchZoneRef` 明確綁定為 `HTMLDivElement`，符合 `div` ref 型別期望。
  - 修正 pointer type 判斷順序，避免 `"mouse"` 與實際篩選為 `"touch" | "pen"` 的型別不一致。

## Build/Typecheck 環境備註

- 目前環境下 `pnpm` 需要 `PNPM_HOME=/tmp/pnpm` 才能正常啟動資料庫檔案（原本會拋出 `unable to open database file`），
  但 `CI/runner` 若本機預設可用則可省略此環境變數。
- 修正後再跑指定校驗命令前，建議保留同樣命令環境以避免誤報。
