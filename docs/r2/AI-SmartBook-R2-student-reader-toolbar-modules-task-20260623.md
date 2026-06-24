# AI-SmartBook-R2 Task — Student Reader Toolbar and Module Tabs

Date: 2026-06-23

## 1. Purpose

Align the Student PDF Reader with the correct target UI shown by the user.

The Reader should focus on the PDF reading experience and add the four visible Reader actions:

```text
出問筆記
即問AI筆記
截圖問AI
遮答案
```

The top module tabs should also be simplified to match the real student learning flow:

```text
智能書本 → 智能筆記 → 智能手稿 → 我的題庫
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
feat/r2-integrate-imports-notes
```

Create branch:

```text
feat/r2-student-reader-toolbar-modules
```

---

## 4. Correct Reader Layout Direction

Use the user-confirmed Reader design as the target.

Required direction:

```text
1. PDF remains the main visual area.
2. Reader should not default to the old fixed three-column layout.
3. Chapter panel should be collapsible.
4. Notes / AI / handwriting should open on demand.
5. Toolbar actions should be visible and easy to use.
```

---

## 5. Required Reader Toolbar Actions

Add or align these four buttons in the PDF Reader toolbar.

### 5.1 出問筆記

Purpose:

```text
Create a question-oriented note from the current PDF context.
```

Expected first version behavior:

```text
1. Opens the existing question/note flow if already implemented.
2. Uses current bookId, pageNumber, and selected text if available.
3. Does not break existing notes navigation.
```

### 5.2 即問AI筆記

Purpose:

```text
Quickly ask AI or create an AI-assisted note from current PDF context.
```

Expected first version behavior:

```text
1. Opens existing AI note panel/modal/drawer.
2. Passes current bookId and pageNumber where possible.
3. Should be on-demand, not a permanently open right panel.
```

### 5.3 截圖問AI

Purpose:

```text
Start the PDF screenshot Ask AI selection workflow.
```

Expected behavior:

```text
1. Enters screenshot selection mode.
2. Allows selecting a PDF area.
3. Opens screenshot Ask AI modal after confirmation.
4. Must not auto-upload screenshot externally.
```

Reference docs:

```text
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-feature-task-20260623.md
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-two-agent-dispatch-20260623.md
```

### 5.4 遮答案

Purpose:

```text
Toggle answer masking while reading or practicing.
```

Expected first version behavior:

```text
1. Button appears in toolbar.
2. Toggle state is visible.
3. If answer masking logic already exists, connect to it.
4. If no reliable logic exists yet, implement safe visual toggle only and document limitation.
5. Do not damage PDF rendering.
```

---

## 6. Top Module Tabs

The target tabs should be:

```text
智能書本
智能筆記
智能手稿
我的題庫
```

### 6.1 Remove 智能影音

```text
智能影音 can be removed from the top Reader module tabs for now.
```

Reason:

```text
The current Reader flow should focus on reading, notes, handwriting, and question bank.
```

### 6.2 智能筆記

Purpose:

```text
Open/read/manage AI and text notes related to the current book.
```

Expected:

```text
Use current notes features and AI Notes Navigation where possible.
```

### 6.3 智能手稿

Purpose:

```text
Handwriting / pen drawing note experience.
```

Reference:

```text
Admin notes page has hand/pen drawing related behavior.
Use it as a reference only. Do not link the student Reader directly to /admin/notes.
```

Expected first version:

```text
1. Add the tab.
2. If handwriting UI is ready, open it.
3. If not fully ready, show a clear planned/placeholder panel.
4. Do not make it look fully functional if it is not.
```

### 6.4 我的題庫

Rename:

```text
智能練題 -> 我的題庫
```

Purpose:

```text
Combine Question Bank and Smart Solve candidate/practice flows.
```

Expected first version:

```text
1. Rename the top module tab to 我的題庫.
2. Connect to existing question bank / smart solve / practice routes if available.
3. If the combined page is not ready, route to a clear placeholder or existing best available page.
4. Do not leave broken links.
```

---

## 7. Suggested Code Areas

Inspect:

```text
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
apps/AI-Stu-R1/src/components/
apps/AI-Stu-R1/src/styles.css
apps/AI-Stu-R1/src/studentClient.ts
```

Also check current student routing for:

```text
智能影音
智能練題
智能筆記
智能手稿
我的題庫
```

---

## 8. Safety Rules

```text
1. Do not commit .env.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, or .claude.
4. Do not remove existing working Reader logic.
5. Do not hard-link student UI to admin-only routes.
6. Do not make unfinished modules look fully functional.
7. Do not break AI Notes Navigation.
8. Do not break PDF zoom/page jump.
9. Do not break screenshot Ask AI feature branches.
```

---

## 9. Validation

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
```

Manual tests:

```text
1. Open /books.
2. Open a real PDF book.
3. Confirm top tabs show 智能書本 / 智能筆記 / 智能手稿 / 我的題庫.
4. Confirm 智能影音 is not shown in Reader tabs.
5. Confirm 智能練題 is renamed to 我的題庫.
6. Confirm toolbar shows 出問筆記 / 即問AI筆記 / 截圖問AI / 遮答案.
7. Confirm chapter panel can collapse/expand.
8. Confirm PDF remains the main focus.
9. Confirm notes are on-demand, not permanently occupying the right side by default.
10. Confirm no broken links.
11. Confirm no Vite overlay.
12. Test desktop and mobile widths.
```

---

## 10. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-student-reader-toolbar-modules-report-20260623.md
```

Report must include:

```text
1. status
2. branch
3. changed files
4. toolbar actions implemented
5. module tabs changed
6. removed/renamed modules
7. handwriting tab behavior
8. 我的題庫 behavior
9. typecheck/build results
10. manual/RWD results
11. known limitations
12. commit SHA
13. push result
14. git status --short
15. confirmation no .env/db/log/.claude committed
```

---

## 11. Commit and Push

Commit message:

```text
feat(r2): align student reader toolbar and module tabs
```

Push:

```text
origin feat/r2-student-reader-toolbar-modules
```

---

## 12. Success Criteria

```text
1. Reader has the four toolbar actions: 出問筆記 / 即問AI筆記 / 截圖問AI / 遮答案.
2. Top Reader module tabs are simplified to 智能書本 / 智能筆記 / 智能手稿 / 我的題庫.
3. 智能影音 is removed from Reader tabs.
4. 智能練題 is renamed to 我的題庫.
5. 智能手稿 does not link directly to admin-only routes.
6. PDF remains the main focus.
7. Build/typecheck pass.
8. No .env/db/log/.claude committed.
```
