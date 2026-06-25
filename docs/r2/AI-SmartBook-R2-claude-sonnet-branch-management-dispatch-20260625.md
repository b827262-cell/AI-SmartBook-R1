# AI-SmartBook-R2 Claude Sonnet 4.6 Branch Management Dispatch

Date: 2026-06-25
Repository: `b827262-cell/AI-SmartBook-R1`
Target executor: Claude Sonnet 4.6 / Claude Code
Default branch: `master`
Status: `dispatch-ready`

## 1. Purpose

GitHub currently has many R2 result branches. The project should stop creating additional parallel R2 branches and move into a controlled GitHub management phase:

1. branch audit
2. integration
3. validation
4. final PR management
5. safe branch cleanup after acceptance

This document is the execution order for Claude Sonnet 4.6.

## 2. Current GitHub report

Repository:

```text
b827262-cell/AI-SmartBook-R1
```

Visibility:

```text
Public
```

Default branch:

```text
master
```

GitHub warning:

```text
Your master branch isn't protected.
```

The master branch should be protected after final integration is accepted.

## 3. Active branches reported by GitHub

| Branch | Behind | Ahead | Initial handling |
| --- | ---: | ---: | --- |
| `fix/r2-agent3-smart-features-google-knowledge-integration` | 5 | 191 | review unique commits before cleanup |
| `fix/r2-smart-features-final-integration` | 5 | 220 | primary final integration candidate |
| `fix/r2-reader-features-toggle-click-save` | 5 | 219 | audit and compare with final integration |
| `fix/r2-reader-features-page-fallback-crash` | 5 | 213 | audit and compare with final integration |
| `fix/r2-reader-settings-watermark` | 5 | 201 | audit and compare with final integration |
| `fix/r2-reader-pdf-pen-annotation` | 5 | 199 | audit and compare with final integration |
| `fix/r2-reader-ai-panel-layout` | 5 | 200 | audit and compare with final integration |
| `docs/r2-github-branch-governance-20260624` | 0 | 1 | docs branch; keep until docs PR is handled |
| `fix/r2-admin-nav-smart-video-route` | 5 | 188 | likely cleanup candidate after final merge |
| `fix/r2-student-reader-toggle-consumption` | 5 | 187 | likely cleanup candidate after final merge |
| `fix/r2-note-pdf-toggle-settings-api` | 5 | 188 | likely cleanup candidate after final merge |
| `fix/r2-admin-settings-files-integration` | 5 | 180 | audit and compare with final integration |
| `fix/r2-smart-features-runtime-claude` | 5 | 174 | audit and compare with final integration |
| `fix/r2-google-knowledge-generation` | 5 | 173 | audit and compare with final integration |
| `feat/r2-admin-appearance-image-folder-import-impl` | 7 | 147 | audit and compare with final integration |
| `feat/r2-admin-google-ai-settings` | 7 | 3 | audit; small branch but may be obsolete or duplicated |
| `docs/r2-admin-image-import` | 7 | 0 | docs-only / stale candidate after audit |
| `fix/r2-student-reader-local-image-picker` | 7 | 146 | audit and compare with final integration |
| `feat/r2-one-click-solve-book-my-question-bank` | 7 | 145 | audit and compare with final integration |
| `feat/r2-student-reader-toolbar-modules` | 7 | 144 | audit and compare with final integration |

## 4. Primary rule

Use this branch as the consolidation branch unless the audit proves another branch is safer:

```text
fix/r2-smart-features-final-integration
```

Do not continue distributing R2 work across more branches.

## 5. Claude Sonnet 4.6 task contract

```md
GitHub Execution in English.
Termination report in Traditional Chinese.

Repository:
b827262-cell/AI-SmartBook-R1

Goal:
Audit all active R2 branches, consolidate valid work into one final integration branch, produce a final PR plan, and identify redundant branches for owner-approved cleanup.

Primary integration branch:
fix/r2-smart-features-final-integration

Important rules:
1. Do not create more feature/fix branches unless a blocker requires a temporary rescue branch.
2. Do not merge directly into master.
3. Do not force-push.
4. Do not remove remote branches until their work is proven merged, duplicated, or explicitly obsolete.
5. Do not merge any stale PR that targets main; this repository default branch is master.
6. Final report must be in Traditional Chinese.
```

## 6. Required audit method

For every active branch, compare it against:

```text
origin/fix/r2-smart-features-final-integration
```

Record:

- unique commit count
- unique changed files
- whether it is source code, docs-only, mixed, or stale
- whether it is already contained by the final integration candidate
- whether it should be retained, merged, or later cleaned up

Required classification:

| Category | Meaning | Action |
| --- | --- | --- |
| A | already contained by final integration | cleanup candidate after final PR merge |
| B | has unique source code | review and merge/cherry-pick into final integration |
| C | docs-only | merge into docs PR or final integration if useful |
| D | obsolete / no unique useful work | cleanup candidate after acceptance |
| E | conflict risk or unclear ownership | hold and report blocker |

## 7. Recommended review order

Review branches in this order:

1. `fix/r2-reader-features-toggle-click-save`
2. `fix/r2-reader-features-page-fallback-crash`
3. `fix/r2-reader-settings-watermark`
4. `fix/r2-reader-pdf-pen-annotation`
5. `fix/r2-reader-ai-panel-layout`
6. `fix/r2-agent3-smart-features-google-knowledge-integration`
7. `fix/r2-admin-settings-files-integration`
8. `fix/r2-smart-features-runtime-claude`
9. `fix/r2-google-knowledge-generation`
10. `feat/r2-admin-appearance-image-folder-import-impl`
11. `feat/r2-admin-google-ai-settings`
12. `fix/r2-student-reader-local-image-picker`
13. `feat/r2-one-click-solve-book-my-question-bank`
14. `feat/r2-student-reader-toolbar-modules`
15. docs-only branches

## 8. Integration process

1. Fetch and inspect all remote branches.
2. Confirm the default branch is `master`.
3. Check out `fix/r2-smart-features-final-integration`.
4. Pull the latest final integration branch.
5. Audit each active R2 branch against the final integration branch.
6. Merge or cherry-pick only valid unique work.
7. Stop and report blocker if conflicts occur.
8. After selected work is integrated, update final integration from `origin/master`.
9. Run validation.
10. Commit an integration report under `docs/r2/`.
11. Push only the final integration branch.
12. Open one final PR from final integration into `master`.
13. Clean up redundant branches only after the final PR is merged and accepted.

## 9. Validation requirements

Minimum validation:

| Area | Required check |
| --- | --- |
| Dependencies | install check with the existing lockfile |
| Workspace | typecheck |
| Workspace | build |
| Admin app | focused typecheck and build if full workspace fails |
| Student app | focused typecheck and build if full workspace fails |
| API | student books smoke test if services are available |
| UI | admin and student reader manual smoke notes |

If full verification is blocked by environment, record exact logs and affected package names.

## 10. Final PR requirements

Open one PR only:

```text
base: master
head: fix/r2-smart-features-final-integration
title: feat(r2): final smart features integration
```

The PR body must include:

- summary
- merged branches
- retained / pending branches
- cleanup candidates after merge
- validation command/result table
- known limitations
- acceptance checklist

## 11. Cleanup policy

Likely cleanup candidates after final PR merge and acceptance:

```text
fix/r2-admin-nav-smart-video-route
fix/r2-student-reader-toggle-consumption
fix/r2-note-pdf-toggle-settings-api
```

Other branches may be cleaned up only if the audit proves they are fully merged or obsolete.

Do not clean up these branches until final acceptance is complete:

```text
master
fix/r2-smart-features-final-integration
```

## 12. Master branch protection after final merge

After the final R2 PR is accepted, enable branch protection for `master`:

- require pull request before merging
- require at least one approval
- block force push
- block branch removal
- require status checks when CI exists

If Claude cannot configure branch protection because of permission or tool limitations, report `permission-halt` and ask the repository owner to configure it in GitHub UI.

## 13. Required final termination report format

```md
## 終止回報

- status: success / failure / blocker / permission-halt
- repo: b827262-cell/AI-SmartBook-R1
- current branch:
- final commit SHA:
- PR URL:
- default branch:
- master protection status:

## success

- 已完成事項：

## failure

- 失敗事項：
- 錯誤 log：

## blocker

- 阻塞點：
- 需要人工決策：

## permission-halt

- 因權限或高風險操作暫停的事項：
- 需要使用者核准：

## 分支稽核表

| branch | unique commits | category | action |
| --- | ---: | --- | --- |

## 已整合分支

-

## 保留分支

-

## 待清理分支

-

## 已清理分支

-

## 驗證結果

| command | result |
| --- | --- |

## 建議下一步

-
```

## 14. Current conclusion

Status: `dispatch-ready / integration-pending`

Claude Sonnet 4.6 should first perform a full branch audit. The safe strategy is to consolidate work into `fix/r2-smart-features-final-integration`, open one final PR into `master`, and postpone branch cleanup until after final acceptance.
