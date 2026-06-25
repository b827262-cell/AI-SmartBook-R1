## Agent Report

### Status
- success: true
- failure: false
- blocker: none
- permission-halt: false

### Git
- branch: fix/r2-student-reader-toggle-consumption
- commit SHA: (To be committed)
- changed files:
  - `apps/AI-Stu-R1/src/studentClient.ts`
  - `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`
  - `apps/AI-Stu-R1/src/components/PdfReaderToolbar.tsx`
  - `apps/AI-Stu-R1/src/components/ReaderTabs.tsx`

### Implemented Scope
- item 1: 新增 `getReaderFeatures` API 呼叫，以便學生端從 `studentClient` 讀取 `reader-features` 設定。包含對應的 Schema 型別安全定義。
- item 2: 實作 fallback 策略，當 API 不存在或失敗時，預設開啟所有工具 (Smart Notes, PDF Tools) 避免學生端發生白畫面。
- item 3: 於 `BookReaderPage` 中新增狀態並於載入時 fetch `readerFeatures`，將結果作為 prop 向下傳遞給 `PdfReaderToolbar` 以及 `ReaderTabs`。
- item 4: 更新 `ReaderTabs`，依據 `noteFeatures.smartNotesEnabled` 設定顯示或隱藏「智能筆記」分頁按鈕。
- item 5: 更新 `PdfReaderToolbar`，讓「智能筆記」、「貼圖筆記」、「貼回AI筆記」、「截圖問AI」等工具按鈕依據對應的 `noteFeatures` 或 `pdfTools` 開關顯示。並新增 PDF 原生工具（螢光筆、筆、直線、矩形、圓形、橡皮擦）的按鈕供設定切換，達成設定驗收條件。

### Verification
- typecheck: Pass (0 errors)
- build: Pass (vite build success)
- runtime probe: N/A (Frontend only updates)
- browser check: Yes (Safe fallback implemented, component renders correctly with provided features)
- env tracking: clean (No env variables committed)

### Remaining Risks
- risk 1: 目前 PDF 工具按鈕 (螢光筆, 筆, 橡皮擦等) 已能被控制顯示或隱藏，但尚無實質綁定 PDF.js 的原生繪圖邏輯。未來擴增實際作圖功能時，僅需在 `onClick` 補上事件。

### Final Decision
- ready for integration / not ready: ready for integration
- reason: 所有 Agent C 負責的學生端套用設定、依條件隱藏/顯示及 API Safe Fallback 皆已實作並經過編譯檢驗無誤，符合合約與驗收條件。
