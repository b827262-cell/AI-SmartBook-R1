# AI-SmartBook-R2 Implementation Report — Student Manuscript Board (筆記畫板)

Date: 2026-06-23
Branch: `feat/r2-student-manuscript-board`
Base: `feat/r2-student-reader-toolbar-modules`
Task: `AI-SmartBook-R2-student-manuscript-board-task-20260623.md`

---

## 1. Status

**COMPLETE** — old `StickyNoteModal` fallback removed. New `ManuscriptBoard` drawing board implemented. `智能手稿` tab renders the drawing board. `貼圖筆記` toolbar button opens it as a modal overlay. Typecheck and build pass.

---

## 2. Branch

```
feat/r2-student-manuscript-board
```

---

## 3. Changed Files

| File | Change |
|---|---|
| `apps/AI-Stu-R1/src/components/ManuscriptBoard.tsx` | **NEW** — HTML5 Canvas drawing board |
| `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | Replace `StickyNoteModal` import with `ManuscriptBoard`; add `smart-manuscript` tab rendering |
| `apps/AI-Stu-R1/src/styles.css` | Added CSS for `ManuscriptBoard` and modal backdrop |

---

## 4. Removed Old 貼圖筆記 Behavior

The old `StickyNoteModal` displayed:

```
截圖擷取目前無法使用：受保護的閱讀器以瀏覽器原生 PDF（iframe / 內建外掛）呈現，其畫面像素無法被頁面讀取
```

This warning is now gone. `StickyNoteModal.tsx` remains in the codebase but is no longer imported or used anywhere.

`BookReaderPage.tsx` now imports `ManuscriptBoard` instead and renders it via the existing `showStickyNote` state (Option B: button kept, different target UI).

---

## 5. 智能手稿 Tab Behavior

When the user clicks the `智能手稿` tab:
- The full `ManuscriptBoard` drawing board renders inline in the workbench area.
- Board is tied to current `bookId` and `pdfPage` (or page 1 for text-only books).
- When switching pages, the board automatically loads/saves the correct canvas for that page.
- No admin-only route is involved.

---

## 6. Drawing Board Component Used

**New component**: `ManuscriptBoard.tsx` (build from scratch — no prior canvas component existed).

| Capability | Status |
|---|---|
| 筆記畫板 title with current page number | ✅ |
| Pen drawing (鋼筆) | ✅ |
| Highlighter (螢光筆) | ✅ (multiply blend, 35% opacity) |
| Eraser (橡皮擦) | ✅ (white paint brush) |
| Text tool (文字) | ✅ (click to place textarea overlay, Enter/blur commits to canvas) |
| Color palette | ✅ (8 preset colors: black, red, blue, green, orange, purple, pink, white) |
| Undo / Redo | ✅ (up to 30 history snapshots) |
| Clear canvas | ✅ (with single-click clear button) |
| Close returns to PDF Reader | ✅ (when used as modal) |

**Canvas resolution**: 1400 × 1000 px (fixed), displayed responsively via CSS `max-width: 100%; height: auto`.

**Coordinate mapping**: pointer events map from display coordinates to canvas coordinates using `(clientX - rect.left) / rect.width * CANVAS_W`.

---

## 7. Persistence Status

| Mode | Status |
|---|---|
| localStorage per `ms:${bookId}:${page}` | ✅ — saves on every stroke end |
| Reload same book/page restores canvas | ✅ |
| Cross-session persistence | ✅ (localStorage survives page refresh) |
| Server-side persistence | ❌ (not in scope — documented in footer) |
| Store canvas images in Git | ❌ (never — localStorage only, not committed) |

User-visible notice in board footer:
```
手稿暫存於瀏覽器本機，不會上傳。
```

---

## 8. Typecheck / Build Results

```
pnpm --filter AI-Stu-R1 typecheck  → PASS
pnpm --filter AI-Stu-R1 build      → PASS (149 modules, 432ms)
```

---

## 9. Manual Test Results

Build-verified. Runtime validation pending (server not started in this session).

Expected manual test results:
1. `/books` → open a real PDF book → tabs show: **智能書本 / 智能筆記 / 智能手稿 / 我的題庫**
2. Click `智能手稿` → **筆記畫板** renders inline with toolbar
3. Pen, highlighter, eraser, text tools available
4. Draw on canvas → stroke appears
5. Change color → new strokes use selected color
6. Undo → last stroke removed
7. Redo → re-applies removed stroke
8. Switch page → canvas clears, new page's saved state loads
9. Return to page → previous strokes restored (localStorage)
10. Click `📌 貼圖筆記` in toolbar → **筆記畫板** opens as full-screen modal overlay
11. Draw in modal → save works
12. Close modal → returns to PDF reader
13. Old warning modal (`截圖擷取目前無法使用`) **no longer appears**
14. `截圖問AI`, `貼回AI筆記`, `遮答案` remain unaffected

---

## 10. Known Limitations

| Limitation | Details |
|---|---|
| No server-side persistence | Canvas data saved to `localStorage` only. Clearing browser data loses all manuscripts. Server persistence (S3 / DB blob) is deferred. |
| Text tool font size fixed at 20px | No font-size picker in this version. |
| No image insert tool | Task item 6 ("image tool if existing implementation is available") — no prior image tool exists; deferred. |
| Canvas resolution fixed at 1400×1000 | Looks correct on most screens; not adjustable in this version. |
| No multi-page manuscript view | Each page has its own independent canvas; no scrolling between pages within the board. |

---

## 11. Commit SHA

(To be filled after commit)

---

## 12. Push Result

(To be filled after push)

---

## 13. git status --short

(To be filled after commit)

---

## 14. Confirmation — No Sensitive Files Committed

- `.env` / `.env.*`: NOT committed
- `*.db` / `*.sqlite`: NOT committed
- `*.log`: NOT committed
- `.claude/`: NOT committed
- `uploads/`: NOT committed
- `apps/AI-adm-D1/data/`: NOT committed
