# AI-SmartBook-R2 Task — Student Reader Local Image Picker

Date: 2026-06-23

## Goal

The current Reader question helper dialog does not show a local image picker or image preview.

Add a visible local image area to the dialog.

Required UI:

```text
上傳圖片
圖片預覽
清除圖片
複製圖片
複製提示詞
```

## Branch

Base branch:

```text
feat/r2-student-reader-toolbar-modules
```

Create branch:

```text
fix/r2-student-reader-local-image-picker
```

## Files

Inspect and update:

```text
apps/AI-Stu-R1/src/components/ExternalAiAskModal.tsx
apps/AI-Stu-R1/src/lib/external-ai.ts
apps/AI-Stu-R1/src/styles.css
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
```

## Requirements

```text
1. Add a button labeled 上傳圖片.
2. Use a local file input with accept=image/*.
3. Show a preview after the user selects an image.
4. Allow clearing and replacing the image.
5. Enable 複製圖片 when an image exists.
6. Show a clear fallback message if image copy is not supported.
7. Keep 複製提示詞 working.
8. Keep Google AI URL as https://google.com/ai.
9. Do not add backend or DB changes.
10. Do not commit runtime or sensitive files.
```

## Validation

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

Manual test:

```text
1. Open /books.
2. Open a book reader.
3. Open the question helper dialog.
4. Confirm 上傳圖片 is visible.
5. Select an image.
6. Confirm preview appears.
7. Clear image.
8. Select another image.
9. Test 複製圖片.
10. Confirm no Vite overlay.
```

## Report

Create:

```text
docs/r2/AI-SmartBook-R2-student-reader-local-image-picker-report-20260623.md
```

Include:

```text
status
branch
changed files
UI behavior
typecheck/build results
manual test results
commit SHA
push result
git status --short
confirmation no .env/db/log/.claude/runtime files committed
```

## Commit

```text
fix(r2): add local image picker to reader helper dialog
```
