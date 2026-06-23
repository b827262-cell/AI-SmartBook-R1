# AI-SmartBook-R2 PDF 截圖問 AI — Agent 1 Core 結案報告

日期：2026-06-23  
執行者：Claude Sonnet 4.6（Agent 1）  
分支：`feat/r2-pdf-screenshot-ask-ai-core`

---

## 結案狀態

**success**

---

## 分支資訊

| 項目 | 值 |
|------|-----|
| 基礎分支 | `feat/r2-integrate-imports-notes` |
| 功能分支 | `feat/r2-pdf-screenshot-ask-ai-core` |
| 實作 Commit | `869cd16e` |
| Push 結果 | 見末節 |

---

## 任務背景

依據 `docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-two-agent-dispatch-20260623.md` Section 3（Agent 1 職責）執行：

1. PDF Reader 新增「截圖問 AI」按鈕
2. 框選模式（橘色矩形 + 四角控制點）
3. 截取 PDF canvas 區域並回傳 PNG data URL
4. 顯示截圖預覽 modal shell（不含外部 AI 按鈕，由 Agent 2 填入）

---

## 實作摘要

### 新建檔案（2 個）

#### `apps/AI-Stu-R1/src/components/ScreenshotSelectionOverlay.tsx`

全螢幕 `position: fixed` overlay：

- `active` prop 控制顯示/隱藏
- `crosshair` cursor，滑鼠按下拖曳形成矩形
- 矩形以橘色（`#f97316`）框線顯示 + 4 個白色角落控制點（`tl / tr / bl / br`）
- `mouseup` 觸發 `onCapture(DOMRect)`，傳入 client 座標
- 選取範圍 < 10px 視為誤點，不觸發 capture
- 按 `Escape` 呼叫 `onCancel()`
- 提示文字：「拖曳選取要截圖的區域　Esc 取消」/ 「放開滑鼠完成截圖」

#### `apps/AI-Stu-R1/src/components/ScreenshotPreviewModal.tsx`

截圖預覽 modal shell：

- 接受 `imageDataUrl: string | null` 與 `onClose`
- 顯示截圖圖片（`<img>`），寬度 100%，有圓角框線
- 空的 `.screenshot-preview-actions` 區域：含 `{/* Agent 2: AI provider buttons go here */}` 佔位 comment
- 點擊 backdrop 關閉，點擊 modal 本體不關閉

---

### 修改檔案（4 個）

#### `apps/AI-Stu-R1/src/components/ProtectedPdfViewer.tsx`

改為 `forwardRef` 模式，暴露 `ProtectedPdfViewerHandle`：

```typescript
export interface ProtectedPdfViewerHandle {
  captureRegion(clientRect: DOMRect): string | null;
}
```

`captureRegion` 實作：
1. 取得 `canvasRef.current.getBoundingClientRect()` 計算 canvas 在畫面上的位置
2. 以 `canvas.width / cr.width` 換算 client 座標 → canvas pixel 座標
3. Clamp 到 canvas 邊界
4. 建立暫時 `<canvas>` 並 `drawImage` 截取
5. 回傳 `tmp.toDataURL("image/png")`

#### `apps/AI-Stu-R1/src/components/PdfReaderToolbar.tsx`

新增 props：

```typescript
screenshotMode: boolean;
onToggleScreenshot: () => void;
```

新增按鈕（位於「文字選取」與「智能筆記」按鈕之間）：

```tsx
<button
  type="button"
  className={`tool-btn ${screenshotMode ? "active" : ""}`}
  onClick={onToggleScreenshot}
  title="截圖問 AI：拖曳框選 PDF 區域並截圖"
  disabled={!hasPdf}
>
  📷 {screenshotMode ? "結束截圖" : "截圖問 AI"}
</button>
```

#### `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`

新增 imports：
```typescript
import { ProtectedPdfViewer, type ProtectedPdfViewerHandle } from "../components/ProtectedPdfViewer";
import { ScreenshotSelectionOverlay } from "../components/ScreenshotSelectionOverlay";
import { ScreenshotPreviewModal } from "../components/ScreenshotPreviewModal";
```

新增 state 與 ref：
```typescript
const [screenshotMode, setScreenshotMode] = useState(false);
const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
const pdfViewerRef = useRef<ProtectedPdfViewerHandle>(null);
```

傳入 `PdfReaderToolbar`：
```tsx
screenshotMode={screenshotMode}
onToggleScreenshot={() => {
  setScreenshotMode((v) => !v);
  setScreenshotImage(null);
}}
```

傳入 `ProtectedPdfViewer`：
```tsx
ref={pdfViewerRef}
```

Overlay 與 Modal（位於 `</section>` 之後）：
```tsx
<ScreenshotSelectionOverlay
  active={screenshotMode}
  onCapture={(clientRect) => {
    const dataUrl = pdfViewerRef.current?.captureRegion(clientRect) ?? null;
    setScreenshotMode(false);
    setScreenshotImage(dataUrl);
  }}
  onCancel={() => setScreenshotMode(false)}
/>

{screenshotImage && (
  <ScreenshotPreviewModal
    imageDataUrl={screenshotImage}
    onClose={() => setScreenshotImage(null)}
  />
)}
```

#### `apps/AI-Stu-R1/src/styles.css`

新增兩組 CSS 規則（末尾）：

| 類別 | 說明 |
|------|------|
| `.screenshot-overlay` | `position: fixed; inset: 0; z-index: 70; cursor: crosshair` |
| `.screenshot-overlay-hint` | 半透明提示文字 |
| `.screenshot-selection-box` | `position: fixed; border: 2px solid #f97316` |
| `.screenshot-handle.tl/tr/bl/br` | 四角白色控制點 |
| `.screenshot-preview-backdrop` | `z-index: 80; fixed; semi-transparent` |
| `.screenshot-preview-modal` | `max-width: 720px; border-radius: 14px` |
| `.screenshot-preview-image` | 100% width, border-radius 8px |
| `.screenshot-preview-actions` | flex 容器，Agent 2 填入按鈕 |

---

## Worktree 技術說明

- 本 session 進行 merge 更新（`git merge origin/feat/r2-integrate-imports-notes`）以納入統合分支最新 docs commits
- TypeCheck：透過 symlink 連結 main workspace 的 `apps/AI-Stu-R1/node_modules` 到 worktree，使用 pnpm store 的 `tsc@6.0.3` 執行，**PASS**（0 errors）
- Build：在 main workspace 執行 `pnpm --filter AI-Stu-R1 build`，**PASS**（425 ms）

---

## 安全性確認

| 項目 | 狀態 |
|------|------|
| `.env` 已提交 | **否（正確）** |
| SQLite `.db` 已提交 | **否（正確）** |
| logs / uploads / backups 已提交 | **否（正確）** |
| `.claude` 本地狀態已提交 | **否（正確）** |
| 新增 DB table | **否（正確）** |
| 截圖自動上傳 | **否（正確）** |
| prompt/image 放入 URL | **否（正確）** |
| 修改 external-ai.ts / ExternalAiAskModal.tsx | **否（正確，留給 Agent 2）** |

---

## Agent 2 接手說明

Agent 2 可從本分支（`feat/r2-pdf-screenshot-ask-ai-core`）建立 `feat/r2-pdf-screenshot-ask-ai-buttons` 分支，並：

1. 在 `ScreenshotPreviewModal.tsx` 的 `.screenshot-preview-actions` 中加入外部 AI 按鈕
2. 使用已有的 `ExternalAiAskModal.tsx` 或重用 `external-ai.ts` 的 `openExternalAi` / `copyPrompt` / `copyImage` helper
3. 傳入 `screenshotImage` 作為 `screenshotImage?: string` prop 給 AI modal

---

## Commit 記錄

| Commit SHA | 訊息 |
|-----------|------|
| `869cd16e` | feat(r2): add PDF screenshot selection workflow (Agent 1 core) |
| 本 commit | docs(r2): add PDF screenshot ask AI core termination report |
