# R2 AI Settings and Reader TOC One Click Note

Executor: Codex
Date: 2026-06-24

Tasks:
1. The admin files page should detect AI configuration from both saved admin settings and server environment fallback.
2. The admin AI settings page should allow user input, save, clear, test connection, and model selection.
3. The files page AI status should show whether the configuration source is admin settings, environment fallback, or missing.
4. The one click workflow on the files page should include reader TOC generation.
5. Reader TOC generation must use the current start page and end page fields, such as 3 to 6.
6. If AI configuration is missing, non AI steps should still run and AI steps should be skipped with a clear message.
7. Do not commit local runtime files or credentials.

Verify:
- AI-adm-D1 typecheck and build
- AI-Stu-R1 typecheck and build
- /admin/settings/ai page
- /admin/books/<bookId>/files one click flow
- /admin/appearance page
- /books page

Final report must be in Traditional Chinese and include success, failure, blocker, permission-halt, branch, commit SHA, changed files, verification results, and git status.
