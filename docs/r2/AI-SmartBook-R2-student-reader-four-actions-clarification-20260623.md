# AI-SmartBook-R2 Student Reader — Four PDF Actions Clarification

Date: 2026-06-23

## 1. Purpose

This clarification supersedes the previous ambiguous Reader toolbar wording.

The user clarified that the four PDF Reader actions are not only button labels. They represent four different study workflows:

```text
1. 貼圖筆記（筆記畫板）
2. 貼回AI筆記
3. 截圖問AI
4. 遮答案
```

The old labels should be corrected as follows:

```text
出問筆記   -> 貼圖筆記（筆記畫板）
即問AI筆記 -> 貼回AI筆記
截圖問AI   -> 截圖問AI
遮答案     -> 遮答案
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

## 3. Correct Toolbar Actions

The Reader toolbar should contain these four actions:

```text
貼圖筆記
貼回AI筆記
截圖問AI
遮答案
```

These actions must be placed near the PDF zoom/page toolbar, matching the user screenshots.

---

## 4. Action 1 — 貼圖筆記（筆記畫板）

### 4.1 Previous name

```text
出問筆記
```

### 4.2 Correct name

```text
貼圖筆記
```

### 4.3 Meaning

This opens a note board / canvas workflow.

The user screenshot shows:

```text
1. A large note board overlay.
2. Current PDF context: 筆記畫板 — 第 1 頁.
3. Drawing / handwriting tools.
4. Pen, highlighter, eraser, text, image, more tools.
5. Color palette.
6. Undo / redo.
7. Page or canvas management.
```

### 4.4 Expected behavior

```text
1. Clicking 貼圖筆記 opens the note board overlay.
2. The board is tied to the current book and page.
3. User can write, draw, type, or paste image notes.
4. The board should not permanently shrink the PDF reader by default.
5. Closing the board returns to the PDF reader.
```

### 4.5 First version acceptable scope

```text
1. Open existing drawing/note-board UI if already implemented.
2. Preserve current bookId and pageNumber context.
3. If persistence is not ready, clearly mark limitation in the report.
```

---

## 5. Action 2 — 貼回AI筆記

### 5.1 Previous name

```text
即問AI筆記
```

### 5.2 Correct name

```text
貼回AI筆記
```

### 5.3 Meaning

This workflow is for text copied from the PDF and sent manually to AI platforms. After receiving an AI answer, the user can paste the answer back into the note area.

The user screenshot shows:

```text
1. A side/drawer/modal note area titled 貼回筆記.
2. Provider tabs/buttons: Google 搜尋, ChatGPT, Claude, Perplexity, Grok, Gemini, Copilot, Meta AI, 其他.
3. A note title field.
4. A large textarea: 將 AI 回答貼入這裡...
5. A button or mode for auto/helper behavior.
```

### 5.4 Expected behavior

```text
1. User uses mouse to copy/select text from the PDF.
2. User clicks 貼回AI筆記.
3. The system opens a note panel with AI provider shortcuts.
4. User manually opens an AI platform, asks the question, and copies the AI answer.
5. User pastes AI answer back into the note textarea.
6. The note is saved or staged with current book/page context if save flow exists.
```

### 5.5 Privacy rule

```text
Do not auto-send selected PDF text to external AI services.
Do not put selected text into external URLs.
Only open external tools after explicit user action.
```

---

## 6. Action 3 — 截圖問AI

### 6.1 Correct name

```text
截圖問AI
```

### 6.2 Meaning

This is for selecting an image region from the PDF and asking external AI tools manually.

The user screenshot shows:

```text
1. PDF becomes dimmed.
2. User selects a region with an orange/red rectangle.
3. Selection has corner handles.
4. Confirm/cancel buttons appear.
5. A 貼回筆記 panel is visible on the right side for later answer paste-back.
```

### 6.3 Expected behavior

```text
1. User clicks 截圖問AI.
2. User drags/selects a PDF region.
3. User confirms the screenshot area.
4. The selected image can be copied or previewed.
5. User manually opens an AI platform and pastes the image/prompt.
6. User can paste the AI answer back into 貼回AI筆記.
```

### 6.4 Privacy rule

```text
No automatic screenshot upload.
No automatic API call to third-party AI.
No screenshot data in URL query string.
```

---

## 7. Action 4 — 遮答案

### 7.1 Correct name

```text
遮答案
```

### 7.2 Meaning

This is not just a toggle. It is an answer masking tool.

The user clarified:

```text
使用圈圖時生成一個白板，可以將答案蓋起來。
```

The screenshots show:

```text
1. User clicks 遮答案.
2. The PDF is dimmed or enters mask mode.
3. User draws/selects a rectangular area over the answer region.
4. After confirmation, a white block/whiteboard mask covers that answer area.
5. The answer is hidden while the rest of PDF remains readable.
```

### 7.3 Expected behavior

```text
1. User clicks 遮答案.
2. User selects or draws a rectangle on the PDF.
3. The selected area becomes a white mask block.
4. The mask should sit above the PDF content.
5. User can clear one mask or clear all masks.
6. The mask is tied to current page.
```

### 7.4 First version acceptable scope

```text
1. Local in-memory masks per page are acceptable.
2. Persistence can be deferred if documented.
3. Must provide a clear way to remove/clear masks.
```

### 7.5 Visual expectation

```text
The mask should look like a clean white rectangle, not a red selection box after confirmation.
```

---

## 8. Reader Module Tabs Clarification

Top module tabs should reflect the student learning flow:

```text
智能書本
智能筆記
智能手稿
我的題庫
```

### 8.1 Remove

```text
智能影音
```

### 8.2 Rename

```text
智能練題 -> 我的題庫
```

### 8.3 智能手稿

This should represent handwriting/drawing behavior similar to the note-board or pen workflow, but it must not link student Reader directly to admin-only `/admin/notes`.

### 8.4 我的題庫

This should combine or route toward:

```text
1. 題庫功能
2. 智慧題解 / Smart Solve 題庫功能
3. 後續可收納由 截圖問AI / 貼回AI筆記 產生的題目
```

---

## 9. Implementation Guidance

This clarification should be applied to:

```text
docs/r2/AI-SmartBook-R2-student-reader-toolbar-modules-task-20260623.md
```

Any implementation branch should treat this file as the more precise behavior definition.

Recommended branch:

```text
feat/r2-student-reader-toolbar-modules
```

Required button labels:

```text
貼圖筆記
貼回AI筆記
截圖問AI
遮答案
```

Do not implement the old labels as final UI.

---

## 10. Validation

Manual validation must check:

```text
1. Toolbar labels are correct.
2. 貼圖筆記 opens note board / canvas behavior.
3. 貼回AI筆記 opens paste-back note panel for AI answers.
4. 截圖問AI allows PDF screenshot region selection.
5. 遮答案 creates a white masking block over selected answer area.
6. Clear/remove mask action exists.
7. PDF remains readable and is not permanently squeezed by side panels.
8. External AI actions remain manual and privacy-safe.
9. No admin-only route is exposed to student UI.
```

---

## 11. Success Criteria

```text
1. The four toolbar actions match the clarified names and meanings.
2. 遮答案 creates a white cover block after region selection.
3. 貼回AI筆記 is for manually pasting AI answers back into notes.
4. 截圖問AI is for screenshot-based AI asking.
5. 貼圖筆記 is the note-board / drawing canvas flow.
6. Module tabs are simplified to 智能書本 / 智能筆記 / 智能手稿 / 我的題庫.
7. 智能影音 is removed from Reader tabs.
8. 智能練題 is renamed to 我的題庫.
9. No .env/db/log/.claude committed.
```
