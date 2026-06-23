# AI-SmartBook-R2 Feature Task — PDF Screenshot Ask AI

Date: 2026-06-23

## 1. Goal

Add a new student Reader feature:

```text
PDF 截圖問 AI
```

The expected UX follows the user-provided screenshots:

1. Add an orange `截圖問 AI` button in the PDF Reader toolbar.
2. User clicks the button and enters PDF screenshot selection mode.
3. User drags a rectangle on the PDF page.
4. The selected area shows an orange border and corner handles.
5. User can confirm or cancel.
6. After confirmation, a modal opens with the captured image preview and prompt tools.

This is a frontend-first feature. Do not add DB tables or backend upload in the first version.

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
feat/r2-integrate-imports-notes
```

Create feature branch:

```text
feat/r2-pdf-screenshot-ask-ai
```

---

## 4. Required UX

### 4.1 Reader Toolbar

Add a button:

```text
截圖問 AI
```

Suggested placement:

```text
near existing Reader AI buttons such as 開問筆記 / 即問AI筆記 / 知識整理
```

### 4.2 Selection Mode

When active:

```text
1. PDF content area is dimmed.
2. User can drag-select a rectangle.
3. Selection rectangle uses orange border.
4. Four corner handles are visible.
5. Hint text appears:
   拖動四角調整範圍，可滾動 PDF 後再調整
6. Buttons appear:
   - OCR 辨識 / 截圖問 AI
   - 取消
```

### 4.3 Capture Result Modal

After confirm, show modal:

```text
Title: 截圖問 AI
```

Modal content:

```text
1. selected screenshot preview
2. short instruction block
3. prompt mode buttons
4. prompt text area
5. copy image button
6. copy prompt button
7. external AI platform shortcut buttons, if safe and already consistent with project UX
```

Important privacy rule:

```text
Do not automatically upload the screenshot anywhere.
All copy/open actions must be explicit user actions.
```

---

## 5. First Version Scope

Required in first version:

```text
1. Add 截圖問 AI button.
2. Add selection overlay.
3. Support drag-to-select on visible PDF page.
4. Capture selected area from rendered PDF canvas when possible.
5. Show preview modal.
6. Copy prompt text.
7. Copy image if browser supports image clipboard.
8. Provide clear fallback message if image clipboard is unsupported.
9. Keep existing reader features working.
```

Not required in first version:

```text
1. Real OCR backend.
2. Saving screenshot images to server.
3. Auto-uploading screenshots to any AI service.
4. Automatically creating question bank records.
5. New DB table or migration.
```

---

## 6. Prompt Templates

Add frontend prompt templates as constants.

### 6.1 解析 Prompt

```text
請辨識圖片中的文字內容，完整列出後再進行解析。
若是題目，請列出題目、關鍵概念、解題步驟、答案與常見錯誤。
若是觀念說明，請列出原文重點、白話解釋、重要名詞與記憶方式。
```

### 6.2 精簡

```text
請辨識圖片中的文字，並用簡潔條列方式整理重點。若有題目，請直接給答案與最短解析。
```

### 6.3 詳細

```text
請完整辨識圖片內容，保留原文結構，並進行詳細教學式解析，包含背景、公式、解題邏輯與易錯點。
```

### 6.4 選擇題 / 題庫格式

```text
請辨識圖片中的題目，並整理成 JSON array。每題包含 question、options、answer、explanation、source。
```

---

## 7. Suggested Files

Inspect first:

```text
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
apps/AI-Stu-R1/src/components/
apps/AI-Stu-R1/src/styles.css
```

Suggested new files:

```text
apps/AI-Stu-R1/src/components/PdfScreenshotAskAiModal.tsx
apps/AI-Stu-R1/src/components/PdfScreenshotSelectionOverlay.tsx
apps/AI-Stu-R1/src/utils/pdfScreenshot.ts
apps/AI-Stu-R1/src/utils/clipboard.ts
```

Keep implementation minimal if the project style prefers fewer files.

---

## 8. Technical Notes

Canvas capture should account for zoom:

```text
scaleX = canvas.width / canvasBoundingRect.width
scaleY = canvas.height / canvasBoundingRect.height
```

Then draw selected region to a temporary canvas and export as PNG blob/data URL.

If canvas cannot be found:

```text
Show a user-friendly error and do not crash.
```

---

## 9. Safety Rules

```text
1. Do not commit .env.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, or .claude.
4. Do not add DB migration.
5. Do not add backend upload in first version.
6. Do not auto-send screenshot data externally.
7. Do not break AI Notes Navigation.
8. Do not remove existing Reader controls.
```

---

## 10. Validation

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
```

Manual test:

```text
1. Open /books.
2. Open a real PDF book.
3. Confirm 截圖問 AI button appears.
4. Click 截圖問 AI.
5. Drag a PDF region.
6. Confirm orange selection box appears.
7. Confirm modal opens after confirm.
8. Confirm screenshot preview appears.
9. Copy prompt works.
10. Copy image works or fallback message appears.
11. Close modal and reader remains usable.
12. Existing AI Notes flow still works.
13. No Vite overlay appears.
```

---

## 11. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-implementation-report-20260623.md
```

Report must include:

```text
1. status
2. branch
3. changed files
4. implemented UI behavior
5. capture method
6. clipboard behavior and fallback
7. typecheck/build results
8. manual test results
9. known limitations
10. commit SHA
11. push result
12. git status --short
13. confirmation no .env/db/log/.claude committed
```

---

## 12. Commit and Push

Commit message:

```text
feat(r2): add PDF screenshot ask AI workflow
```

Push:

```text
origin feat/r2-pdf-screenshot-ask-ai
```

---

## 13. Suggested Agent Assignment

```text
Primary implementation: Claude Sonnet 4.6 Medium/High
Build/typecheck support: Codex-Spark 128K
UX/RWD/manual acceptance: AGY / Gemini 3.1 Pro High
```

---

## 14. Success Criteria

```text
1. 截圖問 AI button appears in Reader.
2. User can select PDF region.
3. Selected region preview appears in modal.
4. Prompt copy works.
5. Image copy works or fallback is clear.
6. No auto-upload occurs.
7. AI-Stu-R1 build passes.
8. Existing Reader and AI Notes flows still work.
```
