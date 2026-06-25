# AI-SmartBook-R2 Session Record — Student Reader Toolbar and Module Tabs Implementation

Date: 2026-06-23
Branch: `feat/r2-student-reader-toolbar-modules`
Base branch: `feat/r2-integrate-imports-notes`
Agent: Claude Sonnet 4.6

---

## 1. 任務來源

Task documents:

```
docs/r2/AI-SmartBook-R2-student-reader-toolbar-modules-task-20260623.md
docs/r2/AI-SmartBook-R2-student-reader-four-actions-clarification-20260623.md
```

澄清文件優先於 task 文件，最終工具列按鈕名稱以澄清文件為準：

| 舊標籤 | 正確標籤 |
|---|---|
| 出問筆記 | **貼圖筆記** |
| 即問AI筆記 | **貼回AI筆記** |
| 截圖問AI | **截圖問AI**（不變） |
| 遮答案 | **遮答案**（不變） |

---

## 2. 執行步驟記錄

### Step 1 — 切換基底分支並取得任務文件

```bash
git checkout feat/r2-integrate-imports-notes
git pull
```

Pull 後取得兩份新文件：
- `AI-SmartBook-R2-student-reader-four-actions-clarification-20260623.md`
- `AI-SmartBook-R2-student-reader-toolbar-modules-task-20260623.md`

---

### Step 2 — 建立 Feature Branch

```bash
git checkout -b feat/r2-student-reader-toolbar-modules
```

---

### Step 3 — 探索現有程式碼結構

探索範圍：

| 檔案 | 探索目的 |
|---|---|
| `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | 了解 Reader 主頁狀態管理與元件結構 |
| `apps/AI-Stu-R1/src/components/ReaderTabs.tsx` | 了解現有 Tab 定義 |
| `apps/AI-Stu-R1/src/components/PdfReaderToolbar.tsx` | 了解現有工具列按鈕 |
| `apps/AI-Stu-R1/src/components/TabPlaceholder.tsx` | 了解 placeholder tab 呈現方式 |
| `apps/AI-Stu-R1/src/components/StickyNoteModal.tsx` | 了解「貼圖筆記」現有實作 |
| `apps/AI-Stu-R1/src/components/ExternalAiAskModal.tsx` | 了解「截圖問AI」現有 modal |
| `apps/AI-Stu-R1/src/lib/external-ai.ts` | 了解外部 AI 平台定義 |
| `apps/AI-Stu-R1/src/styles.css` | 了解現有 CSS 架構 |
| `apps/AI-Stu-R1/src/components/ReaderViewport.tsx` | 確認是否為使用中元件（非主 Reader 路徑，不修改）|

#### 發現的現有元件

| 元件 | 狀態 |
|---|---|
| `StickyNoteModal` | 已實作 — 貼圖筆記畫板（session-only，截圖受 iframe 限制）|
| `ExternalAiAskModal` | 已實作 — 外部 AI 詢問（截圖問AI 可複用）|
| `TabPlaceholder` | 已實作 — 通用 placeholder |

#### 現有 Tab 定義（修改前）

```ts
export const READER_TABS: ReaderTab[] = [
  { key: "smart-book",       label: "智能書本" },
  { key: "smart-video",      label: "智能影音" },  // 要移除
  { key: "smart-quiz",       label: "智能練題" },  // 要改名
  { key: "smart-note",       label: "智能筆記" },
  { key: "smart-manuscript", label: "智能手稿" }
];
```

---

### Step 4 — 更新 `ReaderTabs.tsx`

**目標**：移除「智能影音」、將「智能練題」改名為「我的題庫」，調整順序。

**`ReaderTabKey` 型別修改**：

```ts
// 前
export type ReaderTabKey =
  | "smart-book"
  | "smart-video"   // 移除
  | "smart-quiz"    // 移除
  | "smart-note"
  | "smart-manuscript";

// 後
export type ReaderTabKey =
  | "smart-book"
  | "smart-note"
  | "smart-manuscript"
  | "my-question-bank";   // 新增
```

**`READER_TABS` 陣列修改**：

```ts
export const READER_TABS: ReaderTab[] = [
  { key: "smart-book",        label: "智能書本" },
  { key: "smart-note",        label: "智能筆記" },
  { key: "smart-manuscript",  label: "智能手稿" },
  { key: "my-question-bank",  label: "我的題庫" }
];
```

---

### Step 5 — 更新 `PdfReaderToolbar.tsx`

**目標**：新增 4 個行動按鈕及對應 props。

**新增 props**：

```ts
onStickyNote: () => void;       // 貼圖筆記
onPasteBackNote: () => void;    // 貼回AI筆記
onScreenshotAsk: () => void;    // 截圖問AI
maskMode: boolean;              // 遮答案模式狀態
onToggleMask: () => void;       // 切換遮答案模式
```

**新增按鈕 JSX**（在智能筆記按鈕後、spacer 前）：

```tsx
<span className="tool-divider" aria-hidden="true" />

<button ... onClick={onStickyNote}>📌 貼圖筆記</button>
<button ... onClick={onPasteBackNote}>🤖 貼回AI筆記</button>
<button ... onClick={onScreenshotAsk}>📷 截圖問AI</button>
<button ... onClick={onToggleMask}>🙈 {maskMode ? "結束遮答案" : "遮答案"}</button>
```

---

### Step 6 — 建立 `AnswerMaskLayer.tsx`（遮答案）

**新元件**：`apps/AI-Stu-R1/src/components/AnswerMaskLayer.tsx`

**功能**：
- 在 PDF 上層疊一個可拖曳的繪圖覆蓋層
- 使用百分比座標（相對於容器寬高）儲存遮罩位置
- 每頁獨立管理遮罩（`Record<number, MaskRect[]>`）
- 遮罩為白色方塊，覆蓋在 PDF 內容上方

**核心介面**：

```ts
export interface MaskRect {
  id: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}
```

**核心邏輯**：

```tsx
// 拖曳開始 — 記錄起始百分比座標
function onPointerDown(e) {
  e.currentTarget.setPointerCapture(e.pointerId);
  const pos = getRelativePos(e);  // (clientX - rect.left) / rect.width
  setDrawing({ startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y });
}

// 拖曳結束 — 若面積夠大（> 2% × 1%）則新增遮罩
function onPointerUp(e) {
  const x = Math.min(drawing.startX, drawing.curX);
  const y = Math.min(drawing.startY, drawing.curY);
  const w = Math.abs(drawing.curX - drawing.startX);
  const h = Math.abs(drawing.curY - drawing.startY);
  if (w > 0.02 && h > 0.01) {
    onAddMask(page, { id: `mask-p${page}-...`, xPct: x, yPct: y, wPct: w, hPct: h });
  }
  setDrawing(null);
}
```

**DOM 結構**：

```
<reader-mobile-touch-zone>            ← position: relative
  <ProtectedPdfViewer />              ← PDF 本體
  <div.answer-mask-block />           ← 白色遮罩塊（pointer-events: none, z-index: 30）
  <div.answer-mask-overlay>           ← 繪圖偵測層（cursor: crosshair, z-index: 40）
    <div.answer-mask-drawing />       ← 繪圖中的橙色虛線框
  </div>
  <div.answer-mask-controls>          ← 提示文字 + 清除按鈕（z-index: 50）
</reader-mobile-touch-zone>
```

---

### Step 7 — 建立 `PasteBackNotePanel.tsx`（貼回AI筆記）

**新元件**：`apps/AI-Stu-R1/src/components/PasteBackNotePanel.tsx`

**功能**：
- Modal 面板，讓使用者從外部 AI 平台取得回答後貼回
- 提供 9 個 AI 平台快速開啟按鈕（不自動傳送任何資料）
- 提供筆記標題欄位（預填章節/頁碼資訊）
- 提供大型 textarea（「將 AI 回答貼入這裡…」）
- 儲存為筆記（呼叫 `studentClient.createNote`）

**AI 平台列表**：

```ts
const PASTE_BACK_PROVIDERS = [
  { name: "ChatGPT",    url: "https://chatgpt.com/" },
  { name: "Claude",     url: "https://claude.ai/new" },
  { name: "Gemini",     url: "https://gemini.google.com/app" },
  { name: "Perplexity", url: "https://www.perplexity.ai/" },
  { name: "Grok",       url: "https://grok.x.ai/" },
  { name: "Copilot",    url: "https://copilot.microsoft.com/" },
  { name: "Meta AI",    url: "https://www.meta.ai/" },
  { name: "Google 搜尋", url: "https://www.google.com/" },
  { name: "其他",       url: "" }
];
```

與 `ExternalAiAskModal` 的差異：
- `ExternalAiAskModal` — 複製提示詞 + 開啟 AI（截圖問AI 使用）
- `PasteBackNotePanel` — 開啟 AI 平台後，貼回答案並儲存（貼回AI筆記 使用）

---

### Step 8 — 更新 `BookReaderPage.tsx`

#### 新增 imports

```ts
import { StickyNoteModal } from "../components/StickyNoteModal";
import { ExternalAiAskModal } from "../components/ExternalAiAskModal";
import { PasteBackNotePanel } from "../components/PasteBackNotePanel";
import { AnswerMaskLayer, type MaskRect } from "../components/AnswerMaskLayer";
```

#### 新增狀態

```ts
const [showStickyNote, setShowStickyNote] = useState(false);
const [showPasteBack, setShowPasteBack] = useState(false);
const [showScreenshotAsk, setShowScreenshotAsk] = useState(false);
const [maskMode, setMaskMode] = useState(false);
const [masks, setMasks] = useState<Record<number, MaskRect[]>>({});
```

#### 新增 handler 函式

```ts
function handleAddMask(page: number, rect: MaskRect) {
  setMasks((prev) => ({ ...prev, [page]: [...(prev[page] ?? []), rect] }));
}

function handleClearPageMasks(page: number) {
  setMasks((prev) => { const next = { ...prev }; delete next[page]; return next; });
}

async function handlePasteBackSave(title: string, content: string) {
  await studentClient.createNote(bookId, {
    type: "ai_answer",
    title: title.slice(0, 80),
    content,
    chapterId: safeActiveChapter,
    pageNumber: book.pdfFileId ? pdfPage : null
  });
  setNotesRefreshKey((k) => k + 1);
}
```

#### 更新 PdfReaderToolbar 呼叫

```tsx
<PdfReaderToolbar
  ...（原有 props）...
  onStickyNote={() => setShowStickyNote(true)}
  onPasteBackNote={() => setShowPasteBack(true)}
  onScreenshotAsk={() => setShowScreenshotAsk(true)}
  maskMode={maskMode}
  onToggleMask={() => setMaskMode((v) => !v)}
/>
```

#### 新增 AnswerMaskLayer（在 PDF 區域內）

```tsx
{(maskMode || Object.values(masks).some((arr) => arr.length > 0)) && (
  <AnswerMaskLayer
    page={pdfPage}
    masks={masks}
    onAddMask={handleAddMask}
    onClearPageMasks={handleClearPageMasks}
  />
)}
```

僅在 `maskMode` 為 true 或已有遮罩時才掛載此層，節省效能。

#### 新增 Modal 渲染（outer layout 末尾）

```tsx
{showStickyNote && (
  <StickyNoteModal bookTitle={book.title} page={pdfPage} chapterTitle={activeChapterTitle}
    onClose={() => setShowStickyNote(false)} />
)}

{showScreenshotAsk && (
  <ExternalAiAskModal isOpen={showScreenshotAsk} bookTitle={book.title}
    pageLabel={book.pdfFileId ? `P${pdfPage}` : undefined}
    selectedText={selectedText || undefined}
    onClose={() => setShowScreenshotAsk(false)} />
)}

{showPasteBack && (
  <PasteBackNotePanel bookTitle={book.title}
    pageLabel={book.pdfFileId ? `P${pdfPage}` : null}
    chapterTitle={activeChapterTitle}
    onSave={handlePasteBackSave}
    onClose={() => setShowPasteBack(false)} />
)}
```

---

### Step 9 — 更新 `styles.css`

新增以下 CSS：

| 類別 | 用途 |
|---|---|
| `.tool-divider` | 工具列分隔線（1px 高 20px 的垂直線） |
| `.reader-action-btn` | 4 個行動按鈕的 white-space: nowrap |
| `.answer-mask-block` | 白色遮罩方塊（position: absolute, z-index: 30） |
| `.answer-mask-overlay` | 繪圖偵測層（crosshair cursor, z-index: 40） |
| `.answer-mask-drawing` | 繪圖中的橙色虛線框 |
| `.answer-mask-controls` | 提示 + 清除按鈕（z-index: 50, 半透明背景） |
| `.paste-back-backdrop` | Modal 遮罩（position: fixed, 半透明） |
| `.paste-back-modal` | Modal 主體（max-width: 560px, 圓角卡片） |
| `.paste-back-provider-btn` | AI 平台快速開啟按鈕 |
| `.paste-back-textarea` | AI 回答貼入區域（resize: vertical, min-height: 140px） |
| `.btn-secondary` | 次要按鈕樣式 |

---

### Step 10 — 修復預先存在的 TypeScript 錯誤

**檔案**：`apps/AI-Stu-R1/src/lib/external-ai.ts`

**錯誤**：`TS2358: The left-hand side of an 'instanceof' expression must be of type 'any', an object type or a type parameter.`

**原因**：`isBlobLikeImage(value: Blob | string | null | undefined)` 中，TypeScript 在 `value instanceof Blob` 短路求值後，將 `value` 窄化為 `string | null | undefined`，這些型別不是物件型別，因此 `instanceof File` 產生錯誤。

**修復**：

```ts
// 修復前
function isBlobLikeImage(value: Blob | string | null | undefined): value is Blob {
  return Boolean(value instanceof Blob || value instanceof File);
}

// 修復後
function isBlobLikeImage(value: Blob | string | null | undefined): value is Blob {
  return value != null && (value instanceof Blob || (value as unknown) instanceof File);
}
```

---

### Step 11 — 驗證

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
# 第一次失敗：TS2358（external-ai.ts）→ 修復後 PASS

PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
# PASS（148 modules, 426ms）

PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
# PASS（147 modules, 249ms）
```

---

### Step 12 — 建立實作報告

**新檔案**：`docs/r2/AI-SmartBook-R2-student-reader-toolbar-modules-report-20260623.md`

---

### Step 13 — Commit 與 Push

```bash
git add [所有相關檔案，不含 .claude/ / data/]
git commit -m "feat(r2): align student reader toolbar and module tabs"
git push -u origin feat/r2-student-reader-toolbar-modules
```

Commit SHA: `664fe27184ef5bb8283dd028f01d08ae55d9cf6a`

補充更新報告後再 push：

```bash
git commit -m "docs(r2): update student reader toolbar report with commit SHA and push result"
git push
```

Final SHA: `a08eb668`

---

## 3. 完整變更清單

### 新增檔案（3 個）

| 檔案 | 說明 |
|---|---|
| `apps/AI-Stu-R1/src/components/AnswerMaskLayer.tsx` | 遮答案繪圖覆蓋層元件 |
| `apps/AI-Stu-R1/src/components/PasteBackNotePanel.tsx` | 貼回AI筆記 Modal 面板 |
| `docs/r2/AI-SmartBook-R2-student-reader-toolbar-modules-report-20260623.md` | 實作報告 |

### 修改檔案（5 個）

| 檔案 | 變更摘要 |
|---|---|
| `apps/AI-Stu-R1/src/components/ReaderTabs.tsx` | 移除 smart-video，smart-quiz → my-question-bank，重新排序 |
| `apps/AI-Stu-R1/src/components/PdfReaderToolbar.tsx` | 新增 5 個 props + 4 個行動按鈕 |
| `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | 新增 imports、states、handlers、modal 渲染、AnswerMaskLayer |
| `apps/AI-Stu-R1/src/lib/external-ai.ts` | 修復 TS2358 型別錯誤 |
| `apps/AI-Stu-R1/src/styles.css` | 新增工具列分隔線、遮答案層、貼回筆記 Modal CSS |

---

## 4. 遭遇問題與解決方式

| 問題 | 解決方式 |
|---|---|
| 任務文件標籤名稱與澄清文件不一致 | 澄清文件優先：使用「貼圖筆記」「貼回AI筆記」，不使用舊標籤 |
| `TS2358` — `instanceof File` 型別錯誤（預先存在的錯誤，非本次引入）| 加入 `value != null` 前置檢查 + `(value as unknown) instanceof File` 強制轉型 |
| `ReaderTabKey` 型別需同步更新 | 同步移除 `smart-video`、`smart-quiz`，新增 `my-question-bank` |

---

## 5. 確認事項

- [x] 未提交 `.env` / `.env.*`
- [x] 未提交 `*.db` / `*.sqlite`
- [x] 未提交 `*.log`
- [x] 未提交 `.claude/`
- [x] 未提交 `uploads/`
- [x] 未提交 `apps/AI-adm-D1/data/`（runtime generated-json）
- [x] AI-Stu-R1 typecheck 通過
- [x] AI-Stu-R1 build 通過
- [x] AI-adm-D1 build 通過
- [x] 學生 UI 未連結任何 `/admin/` 路由
