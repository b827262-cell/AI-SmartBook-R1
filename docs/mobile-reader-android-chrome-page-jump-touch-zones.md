# Android Chrome Mobile Reader UX Spec

Date: 2026-06-18
Repo: `AI-SmartBook-R1`
Branch: `feat/student-category-cover-reader-chat`

## Goal

Implement Android Chrome mobile reader improvements for direct page jump, touch-zone navigation, keyboard-safe layout, and first/last page feedback.

This document is a Codex / AGY handoff. Implementation notes and commit messages should be in English. Final termination report should be in Traditional Chinese.

## Target Area

Likely primary file:

`apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`

Related mobile CSS may be in the same component or existing reader stylesheet.

Preserve current working behavior:

- Android Chrome PDF visibility snapshot remains stable.
- PDF vertical scroll remains usable.
- Text selection remains usable.
- Copy / note / ask-AI floating toolbar remains usable.
- Smart note panel remains usable.
- TOC remains usable.
- Desktop reader layout remains unchanged.

## Required Features

### 1. Mobile Page Jump Bar

Add a mobile-only bottom fixed page jump bar:

`＜ 第 [pageInput] / totalPages 頁 跳頁 ＞`

Requirements:

- Previous page button.
- Next page button.
- Numeric input for direct page jump.
- Jump button.
- Enter key commits page jump and blurs input.
- Clamp page number to `1 ~ totalPages`.
- Use Android numeric keyboard: `inputMode="numeric"`, `pattern="[0-9]*"`.
- Input font size must be at least `16px` to prevent Android Chrome auto zoom.

### 2. Android Chrome Keyboard-Safe Layout

Do not rely only on `100vh` or `bottom: 12px`.

Use:

- `min-height: 100vh;`
- `min-height: 100dvh;`
- `env(safe-area-inset-bottom, 0px)`
- `VisualViewport API`
- CSS vars:
  - `--reader-keyboard-bottom`
  - `--reader-visual-height`

The page jump bar bottom position should include:

`env(safe-area-inset-bottom, 0px) + var(--reader-keyboard-bottom, 0px)`

Listen to and clean up:

- `window.resize`
- `orientationchange`
- `visualViewport.resize`
- `visualViewport.scroll`

### 3. Tap Background to Blur Input

When a page input is focused and the user taps the PDF background:

- Blur the active input.
- Close the Android keyboard.
- Do not also trigger previous/next page navigation on the same tap.

Ignore this behavior when tapping inside `.mobile-page-jump-bar`.

### 4. Touch-Zone Navigation

Use pointer events, not full-screen overlay buttons.

Touch zones:

| Area | Behavior |
|---|---|
| Left 30% | Previous page |
| Right 30% | Next page |
| Top 20% | Toggle reader controls |
| Bottom 20% | Show page jump bar |
| Center | Toggle reader controls |

Ignore touch-zone behavior when target is inside:

- `button`
- `input`
- `textarea`
- `select`
- `a`
- `[role="button"]`
- `.text-selection-toolbar`
- `.mobile-page-jump-bar`
- `.reader-note-panel`

Also ignore touch zones when:

- selected text exists
- pointer movement is more than `12px`

Use `window.visualViewport` width/height when available.

Recommended wrapper CSS:

`touch-action: pan-y;`

### 5. First / Last Page Feedback

If current page is 1 and user triggers previous page:

- show toast: `已經是第一頁`
- optional short vibration: `navigator.vibrate?.(12)`

If current page is totalPages and user triggers next page:

- show toast: `已經是最後一頁`
- optional short vibration: `navigator.vibrate?.(12)`

Toast must not block interaction:

`pointer-events: none;`

## Optional Dev-Only Simulator

Create a dev-only simulator only if it fits the repo structure. Do not add it to production navigation.

Simulator should verify:

1. Left 30% tap decreases page.
2. Right 30% tap increases page.
3. Top 20% tap toggles controls.
4. Bottom 20% tap shows page jump bar.
5. Center tap toggles controls.
6. Input `0` clamps to `1`.
7. Input over total pages clamps to `totalPages`.
8. First page plus left tap shows `已經是第一頁`.
9. Last page plus right tap shows `已經是最後一頁`.
10. Input focus plus PDF background tap blurs input and does not flip page.

## Codex Task

Task: Implement Android Chrome mobile Reader UX with page-number jump, touch-zone navigation, keyboard-safe layout, background blur, and first/last page feedback.

Repository: `AI-SmartBook-R1`
Branch: `feat/student-category-cover-reader-chat`

Implementation scope:

1. Modify mobile reader only.
2. Add mobile page jump bar.
3. Add numeric page input and page clamping.
4. Add VisualViewport keyboard-safe CSS variables.
5. Add background tap blur logic.
6. Add pointer-event touch-zone navigation.
7. Add first/last page toast feedback.
8. Preserve Android Chrome PDF snapshot visibility.
9. Preserve desktop layout.

Validation:

- Run available checks such as `pnpm build` and `pnpm typecheck`.
- If full checks are too heavy, run the most targeted available check and report the blocker.
- Manual Android Chrome / Samsung S25 Ultra verification is required before final acceptance.

Git workflow:

1. Confirm branch: `git branch --show-current`
2. Check worktree: `git status --short`
3. Inspect diff: `git diff --stat` and `git diff --name-only`
4. Stage only relevant files.
5. Commit: `feat(reader): add mobile page jump touch navigation`
6. Push: `git push origin feat/student-category-cover-reader-chat`

Termination report must include:

- status: success / failure / blocker / permission-halt
- branch
- commit SHA
- files changed
- checks run and results
- push result
- remaining Android Chrome manual test items

## Acceptance Checklist

- [ ] Android Chrome can input page number and jump.
- [ ] Android numeric keyboard opens.
- [ ] Page jump bar stays above virtual keyboard.
- [ ] Tapping PDF background while input is focused closes keyboard and does not flip page.
- [ ] Left 30% tap moves to previous page.
- [ ] Right 30% tap moves to next page.
- [ ] Top 20% tap toggles controls.
- [ ] Bottom 20% tap shows page jump bar.
- [ ] Center tap toggles controls.
- [ ] First page plus previous action shows `已經是第一頁`.
- [ ] Last page plus next action shows `已經是最後一頁`.
- [ ] Vertical PDF scroll still works.
- [ ] Text selection still works.
- [ ] Copy / note / ask-AI toolbar still works.
- [ ] Smart note side panel still works.
- [ ] TOC still works.
- [ ] Desktop layout unchanged.

## Recommended Order

1. Add page-jump state and jump helper.
2. Add mobile-only bottom page-jump bar.
3. Add VisualViewport CSS variable hook.
4. Add background tap blur behavior.
5. Add pointer-based touch zones.
6. Add first/last page feedback.
7. Run checks.
8. Manual Android Chrome verification.
9. Commit and push.
