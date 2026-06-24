# AI-SmartBook-R2｜Agent 2 Reader AI Panel Layout Report

> Branch: `fix/r2-reader-ai-panel-layout`  
> Base: `fix/r2-smart-features-final-integration`  
> Commit: `ad02c21`  
> Date: 2026-06-24  
> Executor: Claude Sonnet 4.6

---

## Agent Report

### Status
- **success:** 兩個排版問題全數修正
- **failure:** 無
- **blocker:** 無
- **permission-halt:** 無

---

### Git
- **branch:** `fix/r2-reader-ai-panel-layout`
- **commit SHA:** `ad02c21`
- **changed files:**
  - `apps/AI-Stu-R1/src/components/PasteBackNotePanel.tsx` — 新增 `inPanel` prop，支援右側面板模式
  - `apps/AI-Stu-R1/src/components/ExternalAiAskModal.tsx` — 新增 `inPanel` prop，支援右側面板模式
  - `apps/AI-Stu-R1/src/components/PdfCropOverlay.tsx` — 新增（PDF 區截圖框選 overlay）
  - `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` — 修改 paste-back / screenshot-ask 觸發邏輯，新增 rightPanel 型別擴充
  - `apps/AI-Stu-R1/src/styles.css` — 新增 pdf-crop overlay CSS、panel content CSS、reader-pdf-col position:relative

---

### Implemented Scope

#### 問題根因
- `PasteBackNotePanel` 使用 `position: fixed; inset: 0; z-index: 1000` backdrop，全畫面覆蓋 PDF
- `ExternalAiAskModal` 使用 `position: fixed; inset: 0; z-index: 60` backdrop，同樣全畫面覆蓋
- 截圖問AI 點擊後直接跳 modal，沒有 PDF 區框選步驟

#### 修正方案

**1. PasteBackNotePanel → 右側面板（Desktop）**

新增 `inPanel?: boolean` prop：
- `inPanel=false`（預設）：保持現有 `paste-back-backdrop` 全畫面 modal（用於 mobile）
- `inPanel=true`：只渲染 `paste-back-panel-content` 內容，無 backdrop wrapper

`BookReaderPage` 變更：
- Desktop：點「貼回AI筆記」→ `setRightPanel("paste-back")`
- 新增 `rightPanel === "paste-back"` 渲染 block（`reader-notes-col reader-paste-back-col`，inPanel=true）
- Mobile：保持 `setShowPasteBack(true)`（現有 modal 行為）

**2. ExternalAiAskModal → 右側面板（Desktop）**

相同 `inPanel` 模式：
- `inPanel=false`：現有 `external-ai-backdrop` 全畫面 modal（mobile / 直接呼叫）
- `inPanel=true`：`external-ai-panel-content` 無 backdrop

**3. PdfCropOverlay（新增）**

功能：
- `position: absolute; inset: 0; z-index: 25` → 只覆蓋 `.reader-pdf-col`（因為新增了 `position: relative` 到 `.reader-pdf-col`）
- 暗色半透明背景（`rgba(0,0,0,0.48)`）
- 拖曳選取橘色矩形（`border: 2.5px solid #f97316`，`rgba(249,115,22,0.12)` 背景）
- 頂部工具列：「拖曳選取截圖區域」/ 「整頁截圖」/ 「截圖選取區」/ 「取消」
- `canvas.toDataURL()` 嘗試從 `.pdf-canvas-frame canvas` 擷取；失敗時 onConfirm(undefined)
- ESC 鍵取消

截圖流程：
```
點「截圖問AI」
  → setShowCropOverlay(true)   ← 新增：先進入 PDF 框選模式
  → PdfCropOverlay 渲染在 reader-pdf-col 內
  → 右側 AI 面板不被覆蓋（overlay 只在 PDF 列）
  → 使用者拖曳選區或點「整頁截圖」
  → handleCropConfirm(dataUrl?)
    → Desktop: setRightPanel("screenshot-ask")
    → Mobile:  setShowScreenshotAsk(true)（現有 modal）
```

**4. rightPanel 型別擴充**

```ts
// Before
"ai" | "notes" | null
// After
"ai" | "notes" | "paste-back" | "screenshot-ask" | null
```

`rightPanel !== null` 判斷自動涵蓋新型別，PaneSplitter 顯示正確。

---

### Layout 保證

| 情境 | 行為 |
|---|---|
| Desktop 點「貼回AI筆記」| PDF 保留在左，右側開啟貼回AI面板 |
| Desktop 點「截圖問AI」| PDF 區出現暗色遮罩 + 橘色框選，右側 AI 面板不受影響 |
| 截圖確認後（Desktop）| 右側切換為 screenshot-ask 面板，顯示截圖預覽與提示詞 |
| Mobile 點「貼回AI筆記」| 現有 fixed modal 行為（不變） |
| Mobile 點「截圖問AI」| 先框選 PDF，確認後用 fixed modal（screenshotAsk 現有行為）|
| 取消截圖框選 | `setShowCropOverlay(false)` → overlay 移除，排版恢復正常 |
| 關閉右側面板 | `setRightPanel(null)` → 面板消失，PDF 自動填滿剩餘空間 |

---

### Verification

| 項目 | 結果 |
|---|---|
| AI-Stu-R1 typecheck | ✅ 0 errors |
| AI-Stu-R1 build | ✅ 成功（chunk size warning，非錯誤） |
| PasteBackNotePanel inPanel prop 編譯 | ✅ 通過 |
| ExternalAiAskModal inPanel prop 編譯 | ✅ 通過 |
| PdfCropOverlay 新元件編譯 | ✅ 通過 |
| rightPanel 型別擴充 | ✅ 通過（4 種 string literal） |
| env tracking | ✅ clean |
| secret scan | ✅ clean |

> **Browser 手動驗收**：本 session 無法啟動有 PDF 的學生端做人工截圖驗收（需要書本資料與完整環境）。整合後請在 AGY 環境執行：
> 1. 開啟書本 Reader → 點「貼回AI筆記」→ 確認右側面板開啟，PDF 仍可滾動
> 2. 點「截圖問AI」→ 確認 PDF 區出現暗色遮罩，右側 AI 面板不被蓋住
> 3. 拖曳橘色選框 → 點「截圖選取區」→ 右側面板顯示截圖預覽
> 4. 點「取消」→ 排版恢復正常

---

### Agent 2 邊界說明

未觸碰：
- 後台 reader feature settings schema/API (`/api/admin/settings/reader-features`) — Agent 1 / Agent B 負責
- 浮水印最後頁擷取 — Agent 1 負責
- PDF 筆工具繪圖引擎 — Agent 3 負責
- Google knowledge generation service — 未修改

---

### Remaining Risks
- **risk 1:** `canvas.toDataURL()` 可能因瀏覽器安全策略或 DRM PDF 而拋出 SecurityError；catch 後 `onConfirm(undefined)` — ExternalAiAskModal 在 `screenshotImage=undefined` 時正常運作（只是無預覽圖）
- **risk 2:** `position: relative` 新增到 `.reader-pdf-col` — 需確認不影響現有 `AnswerMaskLayer`（該 overlay 也是 `position: absolute` 在 `.reader-mobile-touch-zone` 內，不受影響）
- **risk 3:** Mobile 路徑截圖框選後使用 fixed modal（`setShowScreenshotAsk(true)`） — mobile 下 fixed overlay 是合理的，但若需要 mobile 也不蓋右側，需額外處理
- **risk 4:** 若 Agent 3 修改 PDF canvas container 結構（如換用 shadow DOM），`document.querySelector('.pdf-canvas-frame canvas')` 可能失效

---

### Final Decision
- **ready for integration**
- **reason:** typecheck / build 0 error，所有排版邏輯已在 client-side 正確隔離。`PdfCropOverlay` 渲染在 `reader-pdf-col` 內，不覆蓋右側 AI 面板；`PasteBackNotePanel` 桌面模式為右側面板，不再阻擋 PDF 區。Agent B / Agent C / Agent 3 的接口均未破壞。
