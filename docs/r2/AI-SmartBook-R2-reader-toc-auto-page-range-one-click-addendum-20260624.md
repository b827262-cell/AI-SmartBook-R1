# AI-SmartBook-R2 Reader TOC Auto Page Range Addendum

Executor: Codex
Date: 2026-06-24
Branch: fix/r2-admin-settings-files-integration

## Requirement Update

The Reader TOC page range should not require manual user input.

Current desired flow:

1. The system automatically detects the Reader TOC start page.
2. The system automatically detects the Reader TOC end page.
3. The user can still click the JSON index row action to generate the Reader TOC.
4. The one click workflow should also run this Reader TOC generation step automatically.

## UI Requirement

The files page may display the detected range as read-only information, for example:

Reader TOC detected range: start page N, end page M

If detection fails, show a clear message and allow manual override as fallback.

## One Click Workflow Requirement

The one click workflow should include:

1. Parse PDF content.
2. Parse or detect outline data.
3. Generate JSON index.
4. Detect Reader TOC start and end pages.
5. Generate Reader TOC from the JSON index using the detected range.
6. Continue the remaining Q and A or knowledge point steps when available.

## Acceptance Criteria

- The start page and end page are detected by the system by default.
- The user does not need to type start page and end page in the normal flow.
- The existing JSON index row action for Reader TOC generation still works.
- The one click workflow automatically includes Reader TOC generation.
- If auto detection fails, the UI shows a warning and exposes manual override.
- AI-adm-D1 typecheck and build pass.
- AI-Stu-R1 typecheck and build pass.

## Final Report

Please report in Traditional Chinese with success, failure, blocker, permission-halt, branch, commit SHA, changed files, verification results, and git status.
