# Reader Mobile Hotfix 2026-06-18

## Scope

This hotfix addresses the blocker reported on commit `c1a6666` for the mobile reader flow.

## Changes

### C1 touch-zone resolution

- Switched touch resolution to normalized `nx` / `ny`.
- Applied the required first-match order:
  - `ny >= 0.80` opens the page jump bar.
  - `ny <= 0.20` toggles mobile controls.
  - `nx <= 0.30` goes to the previous page.
  - `nx >= 0.70` goes to the next page.
  - Otherwise it toggles mobile controls.
- Left and right page turns now only apply when `0.20 < ny < 0.80`.
- Each corner now resolves to exactly one action.

### C3 PDF container safety

- Restored the mobile PDF container bottom offset to `var(--mobile-reader-bottom, 64px)`.
- Kept the keyboard offset out of the fixed PDF container.
- Left PDF container position, top, bottom, and overflow behavior unchanged.
- Kept keyboard offset only on the page jump bar and toast.

### Android Chrome page input

- Added `type="text"`.
- Added `pattern="[0-9]*"`.
- Kept `inputMode="numeric"`.
- Sanitized `onChange` with `replace(/\D/g, "")`.
- Raised the input font size to `16px`.

### Background tap blur

- If focus is on an input, textarea, or contentEditable element and the tap target is outside `.reader-page-jump-bar`, the handler now blurs the active element.
- The touch start state is cleared immediately.
- The same tap no longer flips page or opens controls.

### C4 scroll safety

- Added `.reader-mobile-touch-zone { touch-action: pan-y; }`.
- Removed pointer-move/touch-move prevention from the PDF scroll path.
- Kept pointer capture off the PDF scroll container.

### Ignore checks

- Added `[role="button"]` to the ignore list.
- Added a selected-text guard using `window.getSelection()?.toString()`.
- Kept reader UI, toolbar, and overlay targets excluded.

## Validation

- `pnpm --filter AI-Stu-R1 build`

## Follow-up

- Manual S25 Ultra C1-C5 verification is still required before user testing.
