# Next Task - Fix Android Mobile Reader Controls

## Date
2026-06-18

## Target Project
AI-SmartBook-R1

## Main Code Repo
`b827262-cell/AI-SmartBook-R1`

## Target Branch
`feat/student-category-cover-reader-chat`

## Recommended Executor
GPT-5.3-Codex Medium first. Escalate to GPT-5.5 High if the root cause is architectural or unclear.

## Problem Summary
Android Chrome real-device / mobile viewport testing did not show the expected mobile reader controls.

Expected but missing:

1. Page jump input.
2. Current page / total page display.
3. Jump / go button.
4. Previous / next page buttons.
5. Left / right touch navigation zones or gestures.
6. Up / down touch behavior configuration if this feature is intended.
7. A visible mobile reader control panel.

## Test Environment

- URL: `http://10.0.3.68:5173/books/book_d1ccf939-47de-479b-98e3-e64a412c2a8c`
- Browser: Android Chrome
- Screen: `412 x 892`
- Viewport: about `411 x 784`
- Pixel ratio: `1.75`
- Eruda: `v3.4.3`

## Required Investigation

1. Confirm the branch currently running in the dev server is `feat/student-category-cover-reader-chat`.
2. Confirm the frontend app is `apps/AI-Stu-R1`.
3. Inspect the reader route `/books/:bookId`.
4. Inspect likely files:
   - `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`
   - `apps/AI-Stu-R1/src/components/*`
   - `apps/AI-Stu-R1/src/**/*.css`
   - `packages/book-core/src/*` only if page / outline data is involved.
5. Check whether the controls are:
   - not committed,
   - not pushed,
   - not mounted,
   - hidden by CSS,
   - desktop-only,
   - covered by z-index / header / safe area,
   - or dependent on stale LocalStorage state.

## Implementation Requirements

1. On mobile viewport width `<= 768px`, show a clear mobile reader control area.
2. Include:
   - current page display,
   - total page display if available,
   - numeric page input,
   - jump / go button,
   - previous page button,
   - next page button.
3. Page jump behavior:
   - User can type a page number.
   - Pressing Enter or tapping the jump button navigates to that page.
   - Clamp invalid values:
     - below `1` => page `1`,
     - above total pages => last page.
   - Do not crash if total pages are not loaded yet.
4. Touch behavior:
   - Left tap zone or left swipe should go to previous page.
   - Right tap zone or right swipe should go to next page.
   - Up / down gestures must not break normal PDF scrolling.
   - Avoid conflicts with text selection and PDF scroll.
5. CSS requirements:
   - Controls must be visible on Android Chrome.
   - Avoid being hidden behind the top header.
   - Avoid being hidden behind bottom safe area.
   - Use `safe-area-inset-bottom` when needed.
   - Use a z-index above the PDF canvas.
   - Do not recreate the previous PDF white-screen issue.
   - Do not collapse max-height to `0`.
6. Add debug-friendly attributes:
   - `data-testid="mobile-page-jump"`
   - `data-testid="mobile-page-input"`
   - `data-testid="mobile-prev-page"`
   - `data-testid="mobile-next-page"`
   - `data-testid="mobile-touch-zone-left"`
   - `data-testid="mobile-touch-zone-right"`

## Acceptance Criteria

1. Android Chrome viewport around `411 x 784` shows the mobile page jump controls.
2. User can jump to a typed page.
3. Previous and next controls work.
4. Left / right touch navigation works or is clearly available.
5. Controls are not covered by the header or Eruda overlay.
6. PDF still renders correctly.
7. No console runtime errors.
8. `pnpm build` passes.

## Required Verification

Run:

```bash
git status --short
pnpm build
```

If possible, provide a manual Android Chrome verification checklist.

## Required Markdown Backup After Fix

Create a Codex report under:

`md/AI-SmartBook-R1/202606/codex-reports/`

Suggested filename:

`2026-06-18-gpt53-codex-mobile-reader-controls-fix.md`

Final report must include:

- status,
- executor,
- executor model,
- AI-SmartBook-R1 commit SHA,
- Project-md-backup commit SHA,
- changed files,
- verification result,
- known risks,
- next recommended task,
- ChatGPT sync summary.

## ChatGPT Sync Summary
請 Codex 修正 Android Chrome 手機版 Reader 控制列。AGY 驗收已確認目前看不到頁碼輸入跳頁、上一頁/下一頁與觸控控制。修正後必須 push `AI-SmartBook-R1`，並在 `Project-md-backup/md/AI-SmartBook-R1/202606/codex-reports/` 建立回報 MD。
