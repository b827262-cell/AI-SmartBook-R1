# AI-SmartBook-R2 Task — External AI Modal Image Upload

Date: 2026-06-23

## 1. Purpose

Update the Student Reader `外部 AI 問答（不自動上傳）` modal so that it provides an explicit image upload option.

Current issue:

```text
The modal shows prompt templates and external AI buttons, but the screenshot/image is not clearly available for the user to upload, preview, replace, or copy.
```

Required change:

```text
Add a user-controlled image upload area inside the external AI modal.
```

This must support two image sources:

```text
1. PDF screenshot image produced by 截圖問AI selection flow.
2. User-selected local image file through an upload input.
```

Important privacy rule:

```text
Do not automatically upload images to external AI platforms.
Do not send image data to any third-party URL.
The user must explicitly choose/copy/upload/paste the image manually.
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

Branch:

```text
feat/r2-student-reader-toolbar-modules
```

Recommended implementation branch if not editing directly:

```text
fix/r2-external-ai-image-upload
```

---

## 4. Target UI

In the modal titled:

```text
外部 AI 問答（不自動上傳）
```

Add an image upload section above or below the prompt textarea.

Suggested layout:

```text
圖片來源
[使用目前截圖] [上傳圖片] [清除圖片]

Image preview area:
- If an image exists, show preview thumbnail / larger preview.
- If no image exists, show empty state text:
  尚未選擇圖片，可使用「截圖問AI」框選 PDF，或按「上傳圖片」選擇本機圖片。

Actions:
[複製圖片] [複製提示詞]
```

The button label should be:

```text
上傳圖片
```

Use a hidden file input:

```text
accept="image/*"
```

---

## 5. Functional Requirements

### 5.1 Upload local image

Required:

```text
1. User clicks 上傳圖片.
2. Browser opens file picker.
3. Accept image files only.
4. Load selected image as Blob/File and preview URL.
5. Store the selected image in React state.
6. Do not upload it to server.
7. Do not upload it to external AI.
```

### 5.2 Use screenshot image

If the modal is opened from `截圖問AI` and a screenshot image already exists:

```text
1. Show screenshot preview automatically.
2. Mark image source as 截圖.
3. Allow user to replace it with uploaded image.
4. Allow user to clear it.
```

### 5.3 Copy image

Required:

```text
1. If image clipboard is supported, 複製圖片 copies the selected image Blob to clipboard.
2. If unsupported, show fallback:
   此瀏覽器不支援直接複製圖片，請使用「上傳圖片」後到 AI 平台手動選取檔案，或使用系統截圖工具。
```

### 5.4 External AI buttons

When user clicks Google AI / ChatGPT / Claude / Gemini:

```text
1. Open only the provider homeUrl in a new tab.
2. Do not append prompt text to URL.
3. Do not append image data to URL.
4. Do not auto-upload image.
```

The instruction text should say:

```text
請先複製提示詞，並使用「複製圖片」或在 AI 平台中手動上傳圖片。
本系統不會自動上傳圖片。
```

---

## 6. Suggested Files

Inspect and update:

```text
apps/AI-Stu-R1/src/components/ExternalAiAskModal.tsx
apps/AI-Stu-R1/src/lib/external-ai.ts
apps/AI-Stu-R1/src/styles.css
```

Potential helper if needed:

```text
apps/AI-Stu-R1/src/lib/image-upload.ts
```

Do not modify backend unless explicitly required.

---

## 7. State Design Suggestion

Inside `ExternalAiAskModal.tsx`, use state similar to:

```ts
type UploadedAiImage = {
  source: "screenshot" | "upload";
  name?: string;
  blob: Blob;
  previewUrl: string;
};

const [selectedImage, setSelectedImage] = useState<UploadedAiImage | null>(null);
```

For file input:

```ts
function handleImageFileChange(file: File | null) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setNotice("請選擇圖片檔案。");
    return;
  }
  const previewUrl = URL.createObjectURL(file);
  setSelectedImage({ source: "upload", name: file.name, blob: file, previewUrl });
}
```

Remember to revoke old object URLs when replaced or modal unmounts.

---

## 8. Accessibility and UX

Required:

```text
1. Upload control must be keyboard accessible.
2. Preview image must have alt text.
3. Clear image button must be available.
4. Error/success notice should be visible.
5. ESC or close button should still close modal.
```

---

## 9. Validation

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

Manual test:

```text
1. Open /books.
2. Open a real PDF book.
3. Click 截圖問AI.
4. Open 外部 AI 問答 modal.
5. Verify image upload section appears.
6. Click 上傳圖片 and select a PNG/JPG.
7. Verify image preview appears.
8. Click 清除圖片; preview disappears.
9. Upload again.
10. Click 複製圖片; verify success or clear fallback message.
11. Click 複製提示詞.
12. Click Google AI; verify it opens https://google.com/ai.
13. Confirm no prompt/image data is appended to URL.
14. Confirm modal still works if no image is uploaded.
```

---

## 10. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-external-ai-image-upload-report-20260623.md
```

Report must include:

```text
1. status
2. branch
3. changed files
4. image upload behavior
5. screenshot image behavior
6. copy image behavior
7. external AI privacy behavior
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
feat(r2): add image upload to external AI modal
```

Push:

```text
origin feat/r2-student-reader-toolbar-modules
```

or if using a hotfix branch:

```text
origin fix/r2-external-ai-image-upload
```

---

## 12. Success Criteria

```text
1. External AI modal shows 上傳圖片.
2. User can select a local image file.
3. Selected image preview is visible.
4. User can clear/replace image.
5. User can copy image or receives a clear fallback message.
6. Google AI link remains https://google.com/ai.
7. No image or prompt is automatically uploaded or appended to external URLs.
8. AI-Stu-R1 typecheck/build pass.
9. No .env/db/log/.claude/runtime files committed.
```
