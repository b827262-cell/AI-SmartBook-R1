# AI-SmartBook-R2 Task — Replace 貼圖筆記 With 智能手稿筆記畫板

Date: 2026-06-23

## 1. Purpose

The current `貼圖筆記` behavior is wrong.

Observed wrong UI:

```text
貼圖筆記 opens a modal that says screenshot capture is unavailable and only allows a text draft.
```

User requirement:

```text
Delete/remove this old 貼圖筆記 modal behavior.
Use the real 筆記畫板 UI instead.
Expose the handwriting/drawing board as the Student Reader module: 智能手稿.
```

The correct target is the note-board UI shown in the user screenshot:

```text
筆記畫板 — 第 1 頁
pen / highlighter / eraser / text / image / colors / undo / redo / page controls
```

---

## 2. Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

Final report must include:

```text
建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

---

## 3. Workspace and Branch

Workspace:

```text
/home/b827262/project/AI-SmartBook-R2
```

Base branch:

```text
feat/r2-student-reader-toolbar-modules
```

Create branch:

```text
feat/r2-student-manuscript-board
```

---

## 4. Required UI Change

### 4.1 Remove wrong 貼圖筆記 modal

Remove or disable the current behavior where `貼圖筆記` opens a text-only fallback modal with this kind of warning:

```text
截圖擷取目前無法使用...
以下可先建立文字筆記草稿。
```

This is not the target UX.

### 4.2 Use 筆記畫板 as 智能手稿

The `智能手稿` tab should open the note-board / drawing-board experience.

Target capabilities:

```text
1. Display 筆記畫板 title with current page number.
2. Support pen drawing.
3. Support highlighter.
4. Support eraser.
5. Support text tool.
6. Support image tool if existing implementation is available.
7. Support color palette.
8. Support undo / redo if available.
9. Support page / canvas controls.
10. Close returns to PDF Reader.
```

First version may reuse existing drawing-board component if present.

Do not build an unrelated new canvas if there is already a working note-board component.

---

## 5. Toolbar and Module Behavior

### 5.1 Reader toolbar

The old toolbar button `貼圖筆記` should not open the wrong fallback modal.

Acceptable options:

```text
Option A: remove 貼圖筆記 button from toolbar and rely on 智能手稿 tab.
Option B: keep 貼圖筆記 button but make it open the same 筆記畫板 as 智能手稿.
```

Preferred:

```text
Option B, if it does not duplicate code.
```

### 5.2 智能手稿 tab

The top module tab:

```text
智能手稿
```

must open the drawing-board UI in the student frontend.

It must not link to admin-only routes such as:

```text
/admin/notes
```

---

## 6. Data and Persistence

Minimum first version:

```text
1. The drawing board should be tied to current bookId and pageNumber.
2. If existing save API exists, use it.
3. If persistence is not ready, keep local temporary state and clearly document limitation.
```

Preferred version:

```text
1. Save handwriting board data per book/page.
2. Reload existing manuscript when reopening the same book/page.
3. Do not store canvas images in Git.
4. Do not commit runtime files.
```

---

## 7. Suggested Files

Inspect:

```text
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
apps/AI-Stu-R1/src/components/
apps/AI-Stu-R1/src/styles.css
apps/AI-Stu-R1/src/studentClient.ts
```

Search for existing drawing board or canvas components:

```text
DrawingCanvas
NoteBoard
Manuscript
Handwriting
SmartNote
Canvas
```

Also inspect admin notes only as reference:

```text
/admin/notes
```

Do not import admin-only route directly into student UI.

---

## 8. Safety Rules

```text
1. Do not commit .env.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, .claude, or runtime files.
4. Do not expose admin-only routes to students.
5. Do not break PDF reader page jump / zoom.
6. Do not break 截圖問AI.
7. Do not break 貼回AI筆記.
8. Do not break 遮答案.
```

---

## 9. Validation

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

Manual tests:

```text
1. Open /books.
2. Open a real PDF book.
3. Confirm 智能手稿 tab exists.
4. Click 智能手稿.
5. Confirm 筆記畫板 opens.
6. Confirm pen/highlighter/eraser/color tools are visible.
7. Draw on the board.
8. Close board and return to PDF Reader.
9. Confirm old warning modal no longer appears.
10. If toolbar still has 貼圖筆記, confirm it opens the same 筆記畫板, not the warning modal.
11. Confirm no admin-only URL is opened.
12. Confirm no Vite overlay.
```

---

## 10. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-student-manuscript-board-report-20260623.md
```

Report must include:

```text
1. status
2. branch
3. changed files
4. removed old 貼圖筆記 behavior
5. 智能手稿 behavior
6. drawing-board component used
7. persistence status
8. typecheck/build results
9. manual test results
10. known limitations
11. commit SHA
12. push result
13. git status --short
14. confirmation no .env/db/log/.claude/runtime files committed
```

---

## 11. Commit and Push

Commit message:

```text
feat(r2): replace sticky note fallback with student manuscript board
```

Push:

```text
origin feat/r2-student-manuscript-board
```

---

## 12. Success Criteria

```text
1. The old 貼圖筆記 warning modal no longer appears.
2. 智能手稿 opens the note-board / drawing-board UI.
3. Student can draw/write on the board.
4. The board is tied to current book/page at least in UI state.
5. No admin-only routes are exposed.
6. AI-Stu-R1 typecheck/build pass.
7. No .env/db/log/.claude/runtime files committed.
```
