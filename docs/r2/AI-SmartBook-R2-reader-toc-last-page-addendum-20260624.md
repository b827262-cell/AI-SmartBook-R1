# AI-SmartBook-R2 Reader TOC Last Page Addendum

Executor: Codex
Date: 2026-06-24
Branch: fix/r2-admin-settings-files-integration

## Requirement Update

Reader TOC page range should be automatic.

Rules:

1. Start page: detected by the system.
2. End page: use the final page of the PDF directly.
3. Normal flow should not require the user to type start page or end page.
4. The existing JSON index row action for generating Reader TOC should still work.
5. The one click workflow should also include Reader TOC generation using the same automatic range.

## UI Text

Show the detected range as read-only information, for example:

Reader TOC range: system detected start page N to PDF final page M.

If start page detection fails, show a warning and allow manual override only as fallback.

## One Click Workflow

The one click workflow should:

1. Parse PDF content.
2. Generate JSON index.
3. Detect Reader TOC start page.
4. Use PDF final page as Reader TOC end page.
5. Generate Reader TOC from JSON index.
6. Continue remaining Q and A or knowledge point steps when available.

## Acceptance Criteria

- End page is always taken from the PDF final page by default.
- User does not need to type end page in the normal flow.
- Start page is system detected by default.
- Manual override appears only when detection fails or advanced mode is enabled.
- JSON index row action still works.
- One click workflow includes Reader TOC generation.
- Typecheck and build pass for AI-adm-D1 and AI-Stu-R1.

## Final Report

Please report in Traditional Chinese with success, failure, blocker, permission-halt, branch, commit SHA, changed files, verification results, and git status.
