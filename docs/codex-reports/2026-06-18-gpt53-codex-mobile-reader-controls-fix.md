# Codex Report — Android Mobile Reader Controls Fix

> Date: 2026-06-18
> Executor: Claude Sonnet 4.6 (Claude Code)
> AI-SmartBook-R1 branch: feat/student-category-cover-reader-chat
> AI-SmartBook-R1 HEAD before fix: 5480378a04dde6641a49e95e23bd48c9b3b04c16

---

## Status

**success** — build passes, all required mobile controls implemented and wired.

---

## Problem

AGY acceptance test on Android Chrome 411×784 found that mobile reader page controls were not visible:
- No page number display
- No prev/next page buttons
- No page jump input
- Touch zones not discoverable (existed but invisible)

---

## Root Cause

The page navigation UI (`reader-page-jump-bar` overlay) only appeared after tapping the invisible bottom 20% of the PDF area — not discoverable. The `reader-mobile-action-bar` only had 返回/目錄/問AI/筆記 with no page controls.

---

## Changes Made

### `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`

- Added `mobileBarPageInput` state (synced to `pdfPage` via `useEffect`)
- Added `applyMobileBarJump()` and `onMobileBarJumpKeyDown()` functions
- Added always-visible page controls row (`reader-mobile-page-controls`) in `reader-mobile-action-bar`:
  - ◀ prev button (`data-testid="mobile-prev-page"`)
  - Page label (`P{page} / {total}`)
  - Numeric input (`data-testid="mobile-page-input"`)
  - 跳 button
  - ▶ next button (`data-testid="mobile-next-page"`)
  - Container `data-testid="mobile-page-jump"`
- Restructured action bar from flat grid to flex-column with two rows:
  - Row 1: page controls
  - Row 2: 返回/目錄/問AI/筆記 (`reader-mobile-action-buttons` div)
- Added invisible touch zone marker divs inside `reader-mobile-touch-zone`:
  - `data-testid="mobile-touch-zone-left"`
  - `data-testid="mobile-touch-zone-right"`

### `apps/AI-Stu-R1/src/styles.css`

- `.reader-mobile-action-bar`: changed from `grid-template-columns: repeat(5,…)` to `flex-direction: column`
- Added `.reader-mobile-action-buttons` (4-column grid for nav tabs)
- Added `.reader-mobile-page-controls` (5-column grid: prev/label/input/go/next)
- Added `.reader-mobile-page-label`, `.reader-mobile-page-input`, `.reader-mobile-page-btn`
- Added `.reader-mobile-touch-zone-half` (position:absolute markers, pointer-events:none)
- Updated `.reader-page-jump-bar` bottom offset to `var(--mobile-reader-bottom, 72px)` (dynamic)
- Updated `.reader-mobile-toast` bottom offset to `var(--mobile-reader-bottom, 100px)`

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter AI-Stu-R1 build` | ✅ pass (exit 0) |
| `pnpm --filter AI-Stu-R1 typecheck` | ⚠️ 9 pre-existing errors (unchanged from baseline before fix) |
| `bash scripts/boundary-check.sh` | ⚠️ G1 only (pre-existing book-core, not introduced by this fix) |
| No new boundary violations | ✅ pass |

Pre-existing typecheck errors confirmed by baseline stash test — all 9 errors existed before this fix.

---

## Changed Files

- `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` (+138 / -30 lines)
- `apps/AI-Stu-R1/src/styles.css` (+76 / -2 lines)
- `docs/agy-acceptance/2026-06-18-mobile-reader-controls-failure.md` (new, landed from backup)
- `docs/next-tasks/2026-06-18-fix-android-mobile-reader-controls.md` (new, landed from backup)
- `docs/codex-reports/2026-06-18-gpt53-codex-mobile-reader-controls-fix.md` (this report)

---

## Known Risks

1. **Typecheck errors pre-exist** — 9 TS errors in BookReaderPage.tsx existed before this fix. Require separate PR to clean up (mostly `book` possibly-null and `touchZoneRef` type narrowing).
2. **Bar height** — with the new 2-row action bar, `--mobile-reader-bottom` is measured dynamically via `ResizeObserver`, so PDF viewport clamp adjusts automatically.
3. **Safe-area** — bottom padding uses `env(safe-area-inset-bottom)` for notched devices.
4. **Android real-device verification** — this fix was implemented and build-verified, but not tested on physical Android Chrome 411×784. Requires AGY re-acceptance.

---

## Next Recommended Task

1. **AGY re-acceptance** — test on Android Chrome 411×784 at the same URL. Verify all 6 acceptance criteria pass.
2. **Fix pre-existing typecheck errors** in BookReaderPage.tsx (separate PR, not blocking).
3. **G1 book-core decouple** — see `docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md` for plan.

---

## ChatGPT Sync Summary

Claude Code 已完成 Android Chrome 手機版 Reader 控制列修正。`reader-mobile-action-bar` 現在顯示兩行：上行為頁碼控制列（◀ 上一頁 / 頁碼顯示 / 輸入跳頁 / 跳按鈕 / ▶ 下一頁），下行為 返回/目錄/問AI/筆記。`pnpm build` 通過，無新 boundary 違規。需要 AGY 用 Android Chrome 411×784 重新驗收。
