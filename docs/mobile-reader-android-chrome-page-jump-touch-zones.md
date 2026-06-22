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
| :---- | :---- |
| Left 30% | Previous page |
| Right 30% | Next page |
| Top 20% | Toggle reader controls |
| Bottom 20% | Show page jump bar |
| Center | Toggle reader controls |

NOTE: These zones overlap in the four corners. The authoritative, non-ambiguous resolution is defined in **C1 (Touch-Zone Resolution Order)** under `## Constraints (Do NOT violate)`. C1 overrides this table.

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

## Constraints (Do NOT violate)

These constraints override any looser wording above. If an earlier section conflicts with this one, this section wins.

### C1. Touch-Zone Resolution Order (overrides the Section 4 table)

The Section 4 zones overlap in the four corners. Resolve every qualifying tap with this deterministic order. Evaluate top to bottom; first match wins; stop.

1. If `event.target` matches the Section 4 ignore-list (`button, input, textarea, select, a, [role="button"], .text-selection-toolbar, .mobile-page-jump-bar, .reader-note-panel`) -> do nothing.
2. If text is currently selected, OR pointer travel from pointerdown to pointerup is > 12px -> treat as scroll/select, do nothing.
3. Compute normalized coordinates against the wrapper rect, using `window.visualViewport` width/height when available: `nx = (clientX - rect.left) / rect.width`; `ny = (clientY - rect.top) / rect.height`.
4. First match wins:
   - `ny >= 0.80` -> show page jump bar.
   - `ny <= 0.20` -> toggle reader controls.
   - `nx <= 0.30` -> previous page, only reached when `0.20 < ny < 0.80`.
   - `nx >= 0.70` -> next page, only reached when `0.20 < ny < 0.80`.
   - else center -> toggle reader controls.

Result: top/bottom bands win in the corners; left/right page-turn applies only to the middle vertical band (`0.20-0.80`). No tap can resolve to two actions.

### C2. position: fixed ancestor purity (known mobile-reader regression class)

The page jump bar and all toasts use `position: fixed` and depend on the visual viewport. Any `transform`, `filter`, `perspective`, or `will-change: transform` on an ancestor turns `fixed` into containing-block-relative positioning and reintroduces the verified Android Chrome viewport bug.

- Do NOT add `transform` / `filter` / `perspective` / `will-change: transform` to any ancestor of the PDF scroll container, the page jump bar, or the toast layer, including for animations.
- If an entrance animation is needed, animate `opacity` / `bottom` only on a leaf element that has no `position: fixed` descendants.

### C3. Do NOT touch the existing fixed PDF scroll container

The PDF scroll container is already pinned with `position: fixed` + `top` / `bottom` anchoring, NOT `height: 100vh`. This is the verified fix for Android Chrome initial PDF visibility. Touching it reintroduces the address-bar reflow bug.

- The new `min-height: 100vh; min-height: 100dvh;` rules apply ONLY to the page-jump-bar positioning context / reader layout shell. Do NOT apply `min-height`, `height: 100vh`, or `100dvh` to the PDF scroll container or any of its ancestors.
- Do NOT change the PDF scroll container's `position` / `top` / `bottom` / `overflow` rules.
- Keyboard-safe offset for the jump bar = `env(safe-area-inset-bottom, 0px) + var(--reader-keyboard-bottom, 0px)`, driven by VisualViewport, never by altering the PDF container.

### C4. Touch-zone listener must not break native scroll

- Do NOT call `preventDefault()` on `pointermove` / `touchmove` inside the PDF scroll container.
- Do NOT use `setPointerCapture` on the scroll container.
- Keep `touch-action: pan-y;` on the touch-zone wrapper; the zone decision happens only on `pointerup`.

### C5. Stacking order

- Page jump bar: above the PDF, below any open TOC / AI / Notes bottom sheet and the text-selection toolbar.
- Touch-zone wrapper: below all interactive reader UI; it must never overlay or block sheets, toolbars, inputs, or buttons.

### Acceptance additions (objective gates)

- [ ] Each of the four corners produces exactly ONE action, matching C1.
- [ ] No ancestor of jump bar / toast / PDF container has `transform` / `filter` / `will-change` (grep the changed files).
- [ ] PDF scroll container CSS is unchanged; `git diff` shows no change to its `position` / `top` / `bottom` / `overflow` rules.
- [ ] `pnpm build` / `pnpm typecheck` passing is NOT acceptance; an S25 Ultra manual pass of C1-C5 is required before final acceptance.

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

All implementation MUST satisfy `## Constraints (Do NOT violate)` (C1-C5).

Validation:

- Run available checks such as `pnpm build` and `pnpm typecheck`.
- If full checks are too heavy, run the most targeted available check and report the blocker.
- Manual Android Chrome / Samsung S25 Ultra verification is required before final acceptance.

Git workflow:

1. Confirm branch: `git branch --show-current`.
2. Check worktree: `git status --short`.
3. Inspect diff: `git diff --stat` and `git diff --name-only`.
4. Stage only relevant files.
5. Commit: `feat(reader): add mobile page jump touch navigation`.
6. Push: `git push origin feat/student-category-cover-reader-chat`.

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
- [ ] Four-corner taps each resolve to exactly one action (C1).
- [ ] PDF scroll container CSS unchanged in `git diff` (C3).
- [ ] No transform/filter/will-change on fixed-element ancestors (C2).

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
