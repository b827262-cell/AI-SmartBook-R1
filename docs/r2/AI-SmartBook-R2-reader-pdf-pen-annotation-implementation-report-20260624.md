# AI-SmartBook-R2｜Reader PDF 筆工具實作回報（筆直接書寫）

日期：2026-06-24  
Branch：`fix/r2-reader-pdf-pen-annotation`  
Repository：`AI-SmartBook-R2`

## 任務目標

完成「PDF 筆工具可直接書寫」能力，並補齊筆刷粗細（細 / 中 / 粗）與顏色切換，確保與 PDF 頁面座標對齊。

## 執行過程

1. 檢視三方需求與既有 Reader 版面結構。
2. 在 `PdfReaderToolbar` 加入筆工具切換按鈕與設定列（3 檔粗細、5 顏色）。
3. 在 `BookReaderPage` 建立/維護筆工具狀態（`penMode`、`penWidth`、`penColor`），並與選取模式互斥。
4. 在 `ProtectedPdfViewer` 新增:
   - 筆跡暫存（`penStrokeMapRef`），支援跨頁保留。
   - `canvas` overlay 與 `pointer` 事件。
   - 事件到 PDF 畫面比例座標轉換。
   - 畫線重繪邏輯，頁碼/縮放/容器尺寸改變時重繪。
   - 指針繪圖使用 segment 方式繪製，避免整筆重刷造成偏移/積疊。
5. 補充 CSS：`pdf-pen-overlay`（繪圖層）、`pdf-pen-settings`、`pdf-pen-color-btn` 等。

## 變更檔案

- `apps/AI-Stu-R1/src/components/PdfReaderToolbar.tsx`
- `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`
- `apps/AI-Stu-R1/src/components/ProtectedPdfViewer.tsx`
- `apps/AI-Stu-R1/src/styles.css`

## 驗證/注意

- 未執行完整 `typecheck` / `build`（依目前流程未要求）。
- Android fallback（`pdf.js` snapshot）與 `pen overlay` 已納入同一 `pdf-page-stack` 分層。
- 若後續要做最終驗收，建議在實機測試：
  - 筆工具開/關切換。
  - 在同頁持續滑動多段筆跡。
  - 於不同頁、不同縮放時座標是否穩定。
  - 頁面切換後返回同頁筆跡保留。
