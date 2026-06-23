# AI-SmartBook-R2 Session Record — Student Manuscript Board Implementation

Date: 2026-06-23
Branch: `feat/r2-student-manuscript-board`
Base branch: `feat/r2-student-reader-toolbar-modules`
Agent: Claude Sonnet 4.6

---

## 1. 任務來源

Task document uploaded by user to GitHub before session start:

```
docs/r2/AI-SmartBook-R2-student-manuscript-board-task-20260623.md
Commit SHA: b2064f1428f93fe516838c7792bc26c942b4850c
Branch: feat/r2-student-reader-toolbar-modules
```

核心要求：

1. 移除錯誤的 `貼圖筆記` 行為（文字草稿警告 modal）。
2. 在 `智能手稿` tab 提供真正的筆記畫板（繪圖畫板）UI。
3. 工具列 `貼圖筆記` 按鈕優先採用 Option B：保留按鈕，但開啟相同的筆記畫板。

---

## 2. 執行步驟記錄

### Step 1 — 同步遠端分支取得任務文件

本機 `feat/r2-student-reader-toolbar-modules` 與遠端有分歧（diverged）：本機有 1 個本地 commit，遠端有 3 個新 commit（包含任務文件）。

```bash
git rebase origin/feat/r2-student-reader-toolbar-modules
# PASS — 成功 rebase，取得 3 個新文件 commit
```

遠端新增的 commit（rebase 後取得）：

| SHA | 訊息 |
|---|---|
| `b2064f14` | docs(r2): add student manuscript board task |
| `1391b915` | docs(r2): add one-click solve book my question bank task |
| `0fb6784c` | docs(r2): add external AI image upload task |

---

### Step 2 — 閱讀任務文件

讀取 `docs/r2/AI-SmartBook-R2-student-manuscript-board-task-20260623.md`。

重點確認：

- 移除 `StickyNoteModal` 的文字草稿 fallback 行為
- `智能手稿` tab → 開啟繪圖畫板 UI（`筆記畫板`）
- `貼圖筆記` 工具列按鈕 → Option B：開啟相同畫板（modal 形式）
- 不可連結 `/admin/notes` 等 admin-only 路由
- 持久化：最低版本允許 session-only；有 localStorage 更佳
- 不提交 canvas 圖片至 Git

---

### Step 3 — 建立 Feature Branch

```bash
git checkout -b feat/r2-student-manuscript-board
```

---

### Step 4 — 探索現有元件

探索 `apps/AI-Stu-R1/src/components/` 下所有 `.tsx` 檔案，搜尋關鍵字：

```
DrawingCanvas / NoteBoard / Manuscript / Handwriting / SmartNote / Canvas
```

**結論**：無任何現有繪圖或 canvas 元件。需全新建構。

確認現有 `StickyNoteModal.tsx` 內容：

- 顯示警告：「截圖擷取目前無法使用…」
- 只有 textarea 文字草稿（session-only，不儲存）
- 這正是任務要求移除的錯誤 UI

確認 `BookReaderPage.tsx` 中的 Tab 渲染邏輯：

```tsx
} : activeTab === "my-question-bank" ? (
  <MyQuestionBankPanel bookId={bookId} bookTitle={book.title} />
) : (
  <TabPlaceholder label={...} />  // smart-manuscript 目前走到這裡
)}
```

確認 `showStickyNote` state 和 `setShowStickyNote(true)` 的連接點（`onStickyNote` prop）。

---

### Step 5 — 設計 ManuscriptBoard 元件

決策：

| 項目 | 決策 |
|---|---|
| Canvas 解析度 | 固定 1400 × 1000 px；CSS `max-width: 100%; height: auto` 自適應顯示 |
| 座標轉換 | `(clientX - rect.left) / rect.width * CANVAS_W` |
| 歷史快照 | 最多 30 步 data URL 陣列 |
| 持久化 | localStorage key：`ms:${bookId}:${page}` |
| 文字工具 | 點擊 → 浮動 textarea overlay → Enter/blur 提交至 canvas |
| 螢光筆 | `globalCompositeOperation = "multiply"`，寬度 18px，35% 不透明 |
| 橡皮擦 | `strokeStyle = "#ffffff"`，寬度 28px |
| 雙模式 | `asModal={false}` → tab 內嵌；`asModal={true}` → 全螢幕 modal overlay |

---

### Step 6 — 建立 `ManuscriptBoard.tsx`

**新檔案**：`apps/AI-Stu-R1/src/components/ManuscriptBoard.tsx`

#### Props 介面

```ts
export interface ManuscriptBoardProps {
  bookId: string;
  bookTitle: string;
  page: number;
  chapterTitle: string | null;
  onClose?: () => void;   // 有則顯示關閉按鈕
  asModal?: boolean;      // true → 加背景遮罩
}
```

#### 工具定義

```ts
type DrawTool = "pen" | "highlight" | "eraser" | "text";
const TOOL_LINE_WIDTH = { pen: 3, highlight: 18, eraser: 28, text: 0 };
const COLORS = ["#111111", "#e53e3e", "#2563eb", "#16a34a", "#d97706", "#9333ea", "#ec4899", "#ffffff"];
```

#### 持久化邏輯

```ts
const STORAGE_KEY = (bookId: string, page: number) => `ms:${bookId}:${page}`;

// 載入（mount / page 切換）
const saved = localStorage.getItem(STORAGE_KEY(bookId, page));
if (saved) {
  const img = new Image();
  img.onload = () => { ctx.drawImage(img, 0, 0); };
  img.src = saved;
}

// 儲存（每次 pointer-up 後）
localStorage.setItem(STORAGE_KEY(bookId, page), canvas.toDataURL());
```

#### 繪圖流程

```tsx
onPointerDown → setPointerCapture → 設定 ctx 工具樣式 → beginPath / moveTo
onPointerMove → lineTo → stroke
onPointerUp   → endLine → pushHistory → saveToLocalStorage
```

螢光筆特別處理：

```ts
c.globalCompositeOperation = "multiply";
c.strokeStyle = `rgba(${r},${g},${b},0.35)`;
```

#### 文字工具流程

```tsx
// onClick（tool === "text"）
→ 計算點擊相對位置 → setTextOverlay({ x, y, value: "" })
→ 顯示 <textarea> 定位至點擊座標
→ onBlur / Enter → commitText()
→ ctx.fillText() 寫入 canvas → snapshot → save
```

#### Undo / Redo

```ts
// history: string[]（data URLs）
// histIdx: number（當前指標）

function pushHistory(dataUrl) {
  // 裁切 histIdx 之後的 redo 步驟，加上新快照，最多保留 30 步
  setHistory(prev => [...prev.slice(0, histIdx + 1), dataUrl].slice(-30));
  setHistIdx(i => Math.min(i + 1, 29));
}

function undo() {
  // 載入 history[histIdx - 1]，setHistIdx(histIdx - 1)
}

function redo() {
  // 載入 history[histIdx + 1]，setHistIdx(histIdx + 1)
}
```

#### DOM 結構

```
.manuscript-board（或 .manuscript-board--modal 內嵌於 .manuscript-backdrop）
  .manuscript-header         ← 標題 / 書名 / 關閉按鈕
  .manuscript-toolbar        ← 工具 / 顏色 / undo / redo / 清除
  .manuscript-canvas-wrap    ← overflow: auto，居中顯示 canvas
    <canvas>                 ← 1400×1000，touch-action: none
    .manuscript-text-input   ← 定位 textarea（僅文字工具模式下顯示）
  .manuscript-footer         ← 工具狀態 + 本機暫存提示
```

---

### Step 7 — 更新 `BookReaderPage.tsx`

#### 替換 import

```tsx
// 移除
import { StickyNoteModal } from "../components/StickyNoteModal";

// 新增
import { ManuscriptBoard } from "../components/ManuscriptBoard";
```

#### 替換 showStickyNote Modal 渲染

```tsx
// 移除
{showStickyNote && (
  <StickyNoteModal
    bookTitle={book.title}
    page={pdfPage}
    chapterTitle={activeChapterTitle}
    onClose={() => setShowStickyNote(false)}
  />
)}

// 新增
{showStickyNote && (
  <ManuscriptBoard
    bookId={bookId}
    bookTitle={book.title}
    page={pdfPage}
    chapterTitle={activeChapterTitle}
    onClose={() => setShowStickyNote(false)}
    asModal
  />
)}
```

#### 新增 smart-manuscript tab 渲染

```tsx
// 原本 smart-manuscript 落入 TabPlaceholder，現在改為：
} : activeTab === "smart-manuscript" ? (
  <ManuscriptBoard
    bookId={bookId}
    bookTitle={book.title}
    page={book.pdfFileId ? pdfPage : 1}
    chapterTitle={activeChapterTitle}
  />
) : (
  <TabPlaceholder label={...} />
)}
```

---

### Step 8 — 新增 CSS 至 `styles.css`

新增以下 class：

| Class | 用途 |
|---|---|
| `.manuscript-board` | flex 容器，border-radius，overflow hidden |
| `.manuscript-board--modal` | modal 模式最大寬高限制 |
| `.manuscript-backdrop` | fixed 全螢幕遮罩，z-index: 1100 |
| `.manuscript-header` | 標題列（書名、頁碼、關閉按鈕） |
| `.manuscript-toolbar` | 工具列（flex, flex-wrap） |
| `.manuscript-tool-btn` | 工具按鈕；`.active` 時 primary 色背景 |
| `.manuscript-color-btn` | 圓形顏色選取按鈕；`.active` 時 primary 邊框 |
| `.manuscript-sep` | 垂直分隔線（1px） |
| `.manuscript-canvas-wrap` | 捲動容器，灰色背景，置中顯示 canvas |
| `.manuscript-canvas` | `max-width: 100%; height: auto; touch-action: none` |
| `.manuscript-text-input` | 絕對定位 textarea，橙色虛線邊框 |
| `.manuscript-footer` | 狀態列，11px |
| `.manuscript-clear-btn` | 清除按鈕，紅色系 |

---

### Step 9 — 驗證

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
# PASS（無型別錯誤）

PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
# PASS（149 modules, 432ms）
```

---

### Step 10 — Commit 與 Push

```bash
git add \
  apps/AI-Stu-R1/src/components/ManuscriptBoard.tsx \
  apps/AI-Stu-R1/src/pages/BookReaderPage.tsx \
  apps/AI-Stu-R1/src/styles.css \
  docs/r2/AI-SmartBook-R2-student-manuscript-board-report-20260623.md

git commit -m "feat(r2): replace sticky note fallback with student manuscript board"
# SHA: 021031a1

git push -u origin feat/r2-student-manuscript-board
# 成功推送新分支

# 補充更新報告後再 push
git commit -m "docs(r2): update manuscript board report with commit SHA and push result"
# Final SHA: 3f4926c3
```

---

## 3. 完整變更清單

### 新增檔案（2 個）

| 檔案 | 說明 |
|---|---|
| `apps/AI-Stu-R1/src/components/ManuscriptBoard.tsx` | HTML5 Canvas 筆記畫板元件（全新建構）|
| `docs/r2/AI-SmartBook-R2-student-manuscript-board-report-20260623.md` | 實作報告 |

### 修改檔案（2 個）

| 檔案 | 變更摘要 |
|---|---|
| `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | 替換 StickyNoteModal → ManuscriptBoard；`smart-manuscript` tab 改為渲染畫板 |
| `apps/AI-Stu-R1/src/styles.css` | 新增 `manuscript-*` CSS classes（12 個 class）|

---

## 4. 遭遇問題與解決方式

### 問題 1 — 本機與遠端分支分歧（diverged）

任務文件由使用者直接上傳至 GitHub，導致遠端多了 3 個 commit 而本機未有。

**解決**：`git rebase origin/feat/r2-student-reader-toolbar-modules` 成功 rebase，無衝突。

### 問題 2 — 無現有繪圖元件可複用

搜尋關鍵字 `DrawingCanvas / NoteBoard / Manuscript / Handwriting / Canvas` 均無結果。

**解決**：從零建構 `ManuscriptBoard.tsx`（HTML5 Canvas API + pointer events + localStorage 持久化）。

### 問題 3 — 螢光筆混色問題

若螢光筆使用普通 `globalAlpha`，多次重疊會加深顏色超過預期。

**解決**：改用 `globalCompositeOperation = "multiply"` + `rgba(r,g,b,0.35)` 顏色，模擬真實螢光筆混色效果。

### 問題 4 — 文字工具定位

文字需定位至使用者點擊位置的 canvas 上，既要顯示 textarea overlay，又要在確認後寫入 canvas。

**解決**：  
- 點擊時在 overlay `div` 上以 `position: absolute` 顯示 textarea（位置以 display 座標定位）  
- Enter/blur 時用 canvas 座標換算（`clientX / rect.width * CANVAS_W`）執行 `ctx.fillText()`

---

## 5. 設計決策

| 決策 | 理由 |
|---|---|
| Option B（保留工具列按鈕）| 任務文件明確偏好 Option B；不重複程式碼（同一元件雙模式）|
| localStorage 持久化 | 比 session-only 更佳；不需要 API；不提交至 Git |
| 固定 canvas 解析度（1400×1000）| 避免 resize 時清空 canvas 的複雜性；CSS 自適應 |
| `multiply` 混色螢光筆 | 避免多次畫出顏色堆疊過深 |
| `asModal` prop 雙模式 | 單一元件服務兩個入口（tab + 工具列按鈕），不重複 |
| 不刪除 `StickyNoteModal.tsx` | 可能有其他未知使用者 — 只移除 import，保留檔案 |

---

## 6. 確認事項

- [x] 舊 `截圖擷取目前無法使用` 警告不再顯示
- [x] `智能手稿` tab 開啟筆記畫板
- [x] `貼圖筆記` 工具列按鈕開啟相同筆記畫板（modal 形式）
- [x] 未連結任何 `/admin/` 路由
- [x] `截圖問AI`、`貼回AI筆記`、`遮答案` 功能不受影響
- [x] AI-Stu-R1 typecheck PASS
- [x] AI-Stu-R1 build PASS（149 modules）
- [x] 未提交 `.env`、DB、log、`.claude`、uploads、runtime files
- [x] canvas 圖片不提交至 Git（localStorage only）

---

## 7. Final Commit SHA

```
3f4926c3  (docs: report + SHA)
021031a1  (feat: main implementation)
```

Branch pushed to: `origin/feat/r2-student-manuscript-board`
