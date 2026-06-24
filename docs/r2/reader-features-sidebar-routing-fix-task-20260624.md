# Reader Features and Admin Sidebar Routing Fix Task

Branch: fix/r2-agent3-smart-features-google-knowledge-integration
Executor: Codex
Date: 2026-06-24

## Background

Browser validation found two blockers after AGY acceptance.

1. Admin reader feature settings show text selection, answer mask, and watermark as disabled, but the student reader still shows the text selection button, answer mask button, and watermark.
2. Clicking the admin book management item still opens or activates the smart video settings page.

Do not merge to master before these are fixed and revalidated.

## Fix A: Apply reader feature settings to student reader

Student reader must follow the admin reader feature settings.

Expected behavior:

- text selection disabled: hide the text selection button and disable the related behavior
- answer mask disabled: hide the answer mask button and disable the related behavior
- watermark disabled: do not render any watermark layer or text
- watermark enabled: apply the configured opacity

Check the full data path:

admin reader feature settings page -> settings API/store -> student reader load -> BookReaderPage / toolbar / watermark components

Suggested search:

```bash
grep -R "reader-features" -n apps packages | head -n 100
grep -R "文字選取" -n apps packages | head -n 100
grep -R "遮答案" -n apps packages | head -n 100
grep -R "watermark" -n apps packages | head -n 100
grep -R "浮水印" -n apps packages | head -n 100
```

## Fix B: Correct admin sidebar routing

Book management and smart video settings must not share the same route, menu key, or active matcher.

Expected behavior:

- clicking book management or book list opens the book management/list page
- clicking smart video settings opens only the smart video settings page
- active state highlights only the correct current menu item

Suggested search:

```bash
grep -R "書本管理" -n apps/AI-adm-D1/src | head -n 100
grep -R "書本列表" -n apps/AI-adm-D1/src | head -n 100
grep -R "智能影音" -n apps/AI-adm-D1/src | head -n 100
grep -R "smart-video" -n apps/AI-adm-D1/src | head -n 100
grep -R "admin/books" -n apps/AI-adm-D1/src | head -n 100
```

## Required checks

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

## Browser acceptance

Validate:

1. Disable text selection in admin settings, refresh student reader, text selection button is hidden.
2. Disable answer mask in admin settings, refresh student reader, answer mask button is hidden.
3. Disable watermark in admin settings, refresh student reader, watermark is fully hidden.
4. Enable watermark and adjust opacity, refresh student reader, opacity is applied.
5. Click book management or book list, it opens the book page.
6. Click smart video settings, it opens the smart video settings page.
7. The active sidebar item is correct.

## Report

Create a Traditional Chinese report at:

docs/r2/reader-features-sidebar-routing-fix-report-20260624.md

Report must include:

- success
- failure
- blocker
- permission-halt
- current branch
- current commit SHA
- changed files
- validation results
- browser acceptance result
- git status

Suggested commit message:

```bash
git commit -m "fix(r2): apply reader settings and correct admin sidebar routing"
```
