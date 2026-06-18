# Codex Mobile Reader Touch Zones Report

- Date: 2026-06-18
- Branch: `feat/student-category-cover-reader-chat`
- Author: Codex

## Scope

Implemented `mobile-reader-android-chrome-page-jump-touch-zones.md` requirements for `apps/AI-Stu-R1` reader behavior.

## Summary

- Added mobile touch gesture zone logic in `BookReaderPage.tsx`:
  - Left/right edge tap: previous/next page.
  - Top area tap: toggle mobile action bar visibility.
  - Center area tap: show page-jump control bar.
- Added mobile page-jump UI with direct input + Enter/“jump” button.
- Added mobile edge/bounds feedback:
  - First/last page toast.
  - Invalid page input toast.
  - `navigator.vibrate(20)` vibration on edge/boundary notices.
- Added global tap-to-dismiss behavior for page-jump bar.
- Added visual viewport / keyboard-safe offsets for mobile overlays via CSS variables.
- Added mobile toast + page-jump bar styling and mobile touch-zone wrapper styles.
- Kept desktop/tablet reader behavior unchanged.

## Changed files

- `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`
- `apps/AI-Stu-R1/src/styles.css`

## Detailed changes

### `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`

- Introduced mobile reader state/refs:
  - `mobileNotice`, `mobilePageInput`, `showMobileControls`, `showPageJumpBar`
  - `pageJumpInputRef`, `touchZoneRef`, `touchStartRef`, `mobileNoticeTimerRef`
- Added constants for touch threshold and mobile notice duration.
- Added `visualViewport` effect to update:
  - `--reader-keyboard-bottom`
  - `--reader-visual-height`
- Added mobile gesture handlers:
  - `onPdfTouchZonePointerDown`
  - `onPdfTouchZonePointerUp`
  - `onPdfTouchZonePointerCancel`
- Added page jump helpers:
  - `applyMobilePageJump`
  - `onMobilePageJumpKeyDown`
- Added mobile notice helper:
  - `setMobileNoticeMessage`
- Added control toggles:
  - `toggleMobileControls`
  - `toggleMobilePageJumpBar`
- Added toast + page-jump overlay rendering in PDF column.
- Page navigation callbacks now surface mobile boundary messages when reaching first/last page.

### `apps/AI-Stu-R1/src/styles.css`

- Added CSS variables for mobile soft keyboard offset:
  - `--reader-keyboard-bottom`
  - `--reader-visual-height`
- Updated mobile fixed PDF/snapshot bounds to include keyboard offset.
- Added styles for:
  - `.reader-mobile-touch-zone`
  - `.reader-page-jump-bar`
  - `.reader-page-jump-input`
  - `.reader-page-jump-btn`
  - `.reader-page-jump-label`
  - `.reader-mobile-toast`
  - `.reader-mobile-action-bar.is-hidden`

## Notes

- No repo-wide validation commands were executed for this task.
- Changes are limited to reader mobile interaction behavior and styling.
