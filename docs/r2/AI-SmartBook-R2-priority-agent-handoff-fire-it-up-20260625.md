# AI-SmartBook-R2 Priority Agent Handoff — Branch Integration Fire It Up

Date: 2026-06-25
Repository: `b827262-cell/AI-SmartBook-R1`
Default branch: `master`
Status: `ready-for-dispatch`

## 1. Purpose

The repository currently has too many active R2 branches. Normal programming should pause until branch integration is controlled.

This handoff defines a three-agent priority workflow:

1. Claude Sonnet 4.6 starts the branch integration run and reports the current merge state.
2. GPT-5.5 takes over the later merge / PR / branch cleanup decision stage after Claude reports.
3. AGY / Gemini and Codex-5.3 Spark run supporting read-only audit and validation tasks.

The goal is to unblock programming by reducing branch uncertainty and creating one final integration path.

## 2. Priority table

| Priority | Agent | Role | Permission level | Main output |
| ---: | --- | --- | --- | --- |
| 1 | Claude Sonnet 4.6 | Fire it up: report branch merge state and prepare handoff | controlled integration, no destructive remote cleanup | branch merge status report |
| 1B | GPT-5.5 | Continue after Claude: final merge decision, PR plan, cleanup approval | final reviewer / coordinator | final PR and cleanup decision |
| 2 | AGY / Gemini | Branch audit table | read-only | unique commit and branch classification table |
| 3 | Codex-5.3 Spark | Build / typecheck validation | read-only validation | build, typecheck, smoke-test report |

## 3. Global rules for all agents

1. Do not create new feature branches.
2. Do not merge directly into `master`.
3. Do not force push.
4. Do not remove remote branches before final acceptance and owner approval.
5. Do not make unrelated code edits.
6. Stop and report `blocker` if conflicts are found.
7. Termination reports must be written in Traditional Chinese.
8. GitHub execution notes and command intent may be written in English.

## 4. Current branch context

Primary final integration candidate:

```text
fix/r2-smart-features-final-integration
```

Reported active R2 branches:

```text
fix/r2-agent3-smart-features-google-knowledge-integration
fix/r2-smart-features-final-integration
fix/r2-reader-features-toggle-click-save
fix/r2-reader-features-page-fallback-crash
fix/r2-reader-settings-watermark
fix/r2-reader-pdf-pen-annotation
fix/r2-reader-ai-panel-layout
docs/r2-github-branch-governance-20260624
fix/r2-admin-nav-smart-video-route
fix/r2-student-reader-toggle-consumption
fix/r2-note-pdf-toggle-settings-api
fix/r2-admin-settings-files-integration
fix/r2-smart-features-runtime-claude
fix/r2-google-knowledge-generation
feat/r2-admin-appearance-image-folder-import-impl
feat/r2-admin-google-ai-settings
docs/r2-admin-image-import
fix/r2-student-reader-local-image-picker
feat/r2-one-click-solve-book-my-question-bank
feat/r2-student-reader-toolbar-modules
```

## 5. Priority 1 — Claude Sonnet 4.6 fire-it-up task

### 5.1 Mission

Claude Sonnet 4.6 is the first runner. Its job is to start the branch integration run and produce a clear report for GPT-5.5 to continue.

Claude should not perform final remote branch cleanup. Claude should not merge directly into `master`.

### 5.2 Claude task brief

```md
GitHub Execution in English.
Termination report in Traditional Chinese.

Repository:
b827262-cell/AI-SmartBook-R1

Agent:
Claude Sonnet 4.6

Mission:
Fire up the R2 branch integration process. Inspect and report the current merge state of active R2 branches. Prepare a handoff for GPT-5.5 to decide final merge, PR, and branch cleanup.

Primary integration branch:
fix/r2-smart-features-final-integration

Rules:
1. Do not merge into master.
2. Do not force push.
3. Do not remove remote branches.
4. If conflicts occur, stop and report blocker.
5. Produce a Traditional Chinese termination report.
```

### 5.3 Claude required checks

Claude must confirm:

- default branch is `master`
- current final integration branch SHA
- whether `fix/r2-smart-features-final-integration` is behind `master`
- which branches are already contained by final integration
- which branches still have unique source changes
- which branches are docs-only or stale
- which branches require GPT-5.5 decision

### 5.4 Claude output file

Claude should create or update:

```text
docs/r2/AI-SmartBook-R2-claude-fire-it-up-merge-state-report-20260625.md
```

Required sections:

```text
- repository status
- default branch status
- final integration branch status
- branch audit summary
- safe-to-continue items
- conflict/blocker list
- recommended GPT-5.5 next action
- no remote branches removed
```

## 6. Priority 1B — GPT-5.5 continuation task

### 6.1 Mission

GPT-5.5 continues only after Claude Sonnet 4.6 returns the fire-it-up report.

GPT-5.5 owns final decision support:

- whether to merge remaining unique branches into final integration
- whether to open the final PR
- which branches become cleanup candidates
- which branch cleanup actions require owner approval

### 6.2 GPT-5.5 task brief

```md
GitHub Execution in English.
Termination report in Traditional Chinese.

Repository:
b827262-cell/AI-SmartBook-R1

Agent:
GPT-5.5

Prerequisite:
Read Claude Sonnet 4.6 fire-it-up merge state report first.

Mission:
Continue from Claude's branch merge report. Decide the final merge plan, final PR plan, and branch cleanup plan. Do not perform destructive remote cleanup without explicit owner approval.

Rules:
1. Use Claude's report as the source of branch status.
2. Do not merge directly into master.
3. Do not force push.
4. Do not remove remote branches without owner approval.
5. Produce a Traditional Chinese termination report.
```

### 6.3 GPT-5.5 output file

GPT-5.5 should create or update:

```text
docs/r2/AI-SmartBook-R2-gpt55-final-merge-pr-cleanup-plan-20260625.md
```

Required sections:

```text
- Claude report reviewed
- final integration branch selected
- branches to merge
- branches to retain
- cleanup candidates after final PR merge
- final PR title/body draft
- owner approval checklist
- branch protection checklist
```

## 7. Priority 2 — AGY / Gemini read-only branch audit

### 7.1 Mission

AGY / Gemini works in read-only mode. It produces a branch audit table and does not modify source code.

### 7.2 AGY / Gemini task brief

```md
GitHub Execution in English.
Termination report in Traditional Chinese.

Repository:
b827262-cell/AI-SmartBook-R1

Agent:
AGY / Gemini

Mission:
Create a read-only branch audit table for all active R2 branches against the final integration candidate.

Primary comparison base:
origin/fix/r2-smart-features-final-integration

Rules:
1. Read-only only.
2. Do not merge branches.
3. Do not push source changes.
4. Do not remove branches.
5. Report unique commits, changed files, category, and recommended action.
```

### 7.3 AGY / Gemini classification

| Category | Meaning | Recommended action |
| --- | --- | --- |
| A | already contained by final integration | cleanup candidate after final PR merge |
| B | has unique source code | send to Claude/GPT-5.5 for merge decision |
| C | docs-only | merge into docs or final integration if useful |
| D | obsolete / duplicated | cleanup candidate after owner approval |
| E | unclear / conflict risk | hold and report blocker |

### 7.4 AGY / Gemini output file

AGY / Gemini should create or update:

```text
docs/r2/AI-SmartBook-R2-agy-gemini-readonly-branch-audit-20260625.md
```

Required table:

```text
branch | unique commits | changed files | category | recommended action
```

## 8. Priority 3 — Codex-5.3 Spark read-only validation

### 8.1 Mission

Codex-5.3 Spark validates the final integration branch without making source-code changes.

### 8.2 Codex task brief

```md
GitHub Execution in English.
Termination report in Traditional Chinese.

Repository:
b827262-cell/AI-SmartBook-R1

Agent:
Codex-5.3 Spark

Mission:
Run build, typecheck, and smoke validation against the final integration branch. Do not fix code unless explicitly reassigned.

Branch:
fix/r2-smart-features-final-integration

Rules:
1. Read-only validation first.
2. Do not edit source files.
3. Do not merge branches.
4. Do not push source changes.
5. Record exact logs for every failure.
```

### 8.3 Required validation

Minimum validation commands:

```text
corepack enable
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm -r build
```

Focused fallback validation:

```text
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 build
```

Smoke checks if local services are available:

```text
student books API check
student books page check
admin page check
reader page check
```

### 8.4 Codex output file

Codex-5.3 Spark should create or update:

```text
docs/r2/AI-SmartBook-R2-codex53-readonly-validation-20260625.md
```

Required table:

```text
command | result | log summary | affected package | recommended owner
```

## 9. Cross-agent handoff order

### Stage A — Start

Claude Sonnet 4.6 starts first and produces the fire-it-up merge state report.

### Stage B — Parallel support

AGY / Gemini may run read-only branch audit while Claude works.

Codex-5.3 Spark may run read-only validation on the current final integration branch, but it must clearly mark that validation as pre-final if Claude has not completed integration yet.

### Stage C — GPT-5.5 continuation

GPT-5.5 takes over after Claude returns.

GPT-5.5 reads:

```text
docs/r2/AI-SmartBook-R2-claude-fire-it-up-merge-state-report-20260625.md
docs/r2/AI-SmartBook-R2-agy-gemini-readonly-branch-audit-20260625.md
docs/r2/AI-SmartBook-R2-codex53-readonly-validation-20260625.md
```

Then GPT-5.5 produces the final merge / PR / cleanup plan.

### Stage D — Owner approval

Remote branch cleanup and master branch protection require owner approval.

## 10. Final PR target

One final PR only:

```text
base: master
head: fix/r2-smart-features-final-integration
title: feat(r2): final smart features integration
```

The final PR body must include:

```text
- summary
- merged branches
- retained branches
- cleanup candidates
- validation results
- known limitations
- manual acceptance checklist
- master branch protection note
```

## 11. Branch cleanup policy

No branch cleanup happens before the final PR is merged and accepted.

Cleanup candidates must be classified by audit first. The known likely cleanup candidates are:

```text
fix/r2-admin-nav-smart-video-route
fix/r2-student-reader-toggle-consumption
fix/r2-note-pdf-toggle-settings-api
```

Other branches may be added only after Claude/GPT-5.5 confirms they are merged, duplicated, or obsolete.

## 12. Master branch protection

After final PR merge and acceptance, configure `master` protection:

```text
require PR before merging
require at least one approval
block force push
block branch removal
require status checks when CI exists
```

If tool permissions are not sufficient, report `permission-halt` and ask the repository owner to configure it in GitHub UI.

## 13. Required Traditional Chinese termination report format

All agents must finish with this format:

```md
## 終止回報

- status: success / failure / blocker / permission-halt
- agent:
- repo: b827262-cell/AI-SmartBook-R1
- branch:
- final commit SHA:
- source files changed: yes/no
- pushed: yes/no
- remote branches removed: no

## success

- 已完成事項：

## failure

- 失敗事項：
- 錯誤 log：

## blocker

- 阻塞點：
- 需要人工決策：

## permission-halt

- 因權限或高風險操作暫停事項：
- 需要使用者核准：

## 建議下一步

-
```

## 14. Current conclusion

Status: `ready-for-dispatch`

Recommended execution:

1. Claude Sonnet 4.6 runs first and reports branch merge state.
2. AGY / Gemini produces a read-only branch audit table.
3. Codex-5.3 Spark produces read-only validation logs.
4. GPT-5.5 continues after Claude to finalize PR and cleanup decisions.

This process should unblock programming by consolidating work into a single final integration path.
