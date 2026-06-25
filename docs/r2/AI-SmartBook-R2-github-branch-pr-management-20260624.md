# AI-SmartBook-R2 GitHub Branch / PR Management Plan

Date: 2026-06-24
Model/Role: Codex-5.3 Spark execution brief
Repository: `b827262-cell/AI-SmartBook-R1`
Default branch: `master`

## 1. Purpose

GitHub already contains multiple R2 result branches. The project should now stop creating additional parallel agent branches and move into a controlled phase:

1. integration
2. acceptance verification
3. PR management
4. branch cleanup

This document records the required governance process and branch cleanup policy for the 2026-06-24 R2 integration window.

## 2. Observed repository facts

| Item | Value |
| --- | --- |
| Default branch | `master` |
| Repository visibility | public |
| Latest observed `master` SHA | `3bde87f8fdefe08246fc7ba0fffe2f18abad891f` |
| Primary integration candidate | `fix/r2-smart-features-final-integration` |
| Primary integration candidate SHA | `bc028af5ef5fc65e6c86239ebc4379244d0ad470` |
| Primary integration candidate vs `master` | diverged, ahead 196, behind 5 |
| Existing open PR observed | PR #4, `feat/student-category-cover-reader-chat` -> `main` |

## 3. Branch audit result

Comparison base: `fix/r2-smart-features-final-integration`

| Branch | Status relative to final integration | Action |
| --- | --- | --- |
| `fix/r2-admin-nav-smart-video-route` | no unique commits; behind final by 8 | cleanup candidate after final PR merge |
| `fix/r2-student-reader-toggle-consumption` | no unique commits; behind final by 9 | cleanup candidate after final PR merge |
| `fix/r2-note-pdf-toggle-settings-api` | no unique commits; behind final by 8 | cleanup candidate after final PR merge |
| `fix/r2-agent3-smart-features-google-knowledge-integration` | diverged; 10 unique commits, 16 commits behind final | retain; review and merge/cherry-pick before cleanup |
| `fix/r2-smart-features-final-integration` | primary candidate, but still behind `master` by 5 | retain; update from `master`, verify, then open final PR |

## 4. Branch cleanup classification

### 4.1 Keep until final acceptance

```text
fix/r2-smart-features-final-integration
fix/r2-agent3-smart-features-google-knowledge-integration
```

Reason:

- `fix/r2-smart-features-final-integration` is the primary integration candidate.
- `fix/r2-agent3-smart-features-google-knowledge-integration` still has unique commits and must not be deleted yet.

### 4.2 Candidate for deletion after final PR merge

The following branches appear to be already contained by the final integration candidate and should be removed only after final PR merge and acceptance verification:

```text
fix/r2-admin-nav-smart-video-route
fix/r2-student-reader-toggle-consumption
fix/r2-note-pdf-toggle-settings-api
```

Deletion must not happen before the final integration branch is merged into `master` and verified.

### 4.3 Hold / review before action

PR #4 currently targets `main`, while the repository default branch is `master`. This PR should not be merged in its current state. It should be either closed as superseded by the R2 final integration PR, or retargeted only if its scope is still needed and has not already been absorbed by R2.

## 5. Required GitHub management policy from now on

Until R2 final integration is complete:

1. Do not create more feature/fix branches for R2 unless approved.
2. Do not open several parallel PRs into `master` for overlapping R2 work.
3. Use one final integration branch as the consolidation point.
4. Any remaining agent work must be merged into the final integration branch first.
5. Open only one final R2 PR into `master` after verification.
6. Do not delete branches until final PR is merged and accepted.
7. Protect `master` after cleanup.

Recommended `master` protection:

- disallow direct push
- require PR before merge
- require at least one review
- require status checks when CI exists
- disallow force push
- disallow branch deletion

## 6. Codex-5.3 Spark execution order

Use this task contract for Codex-5.3 Spark.

```md
GitHub Execution in English.
Termination report in Traditional Chinese.

Repository:
b827262-cell/AI-SmartBook-R1

Goal:
Consolidate R2 branches into one final integration PR and clean up redundant branches safely.

Primary integration branch:
fix/r2-smart-features-final-integration

Branches already contained by final integration candidate:
- fix/r2-admin-nav-smart-video-route
- fix/r2-student-reader-toggle-consumption
- fix/r2-note-pdf-toggle-settings-api

Branch that still needs review before deletion:
- fix/r2-agent3-smart-features-google-knowledge-integration

Rules:
1. Do not create new feature branches.
2. Do not delete any branch before final PR merge and acceptance.
3. Do not force push unless explicitly approved.
4. Do not merge PR #4 as-is because it targets main, not master.
5. Produce a Traditional Chinese termination report with success, failure, blocker, permission-halt.
```

## 7. Local checklist for Codex-5.3 Spark

### 7.1 Inspect

- fetch all remote refs
- list remote branches
- inspect recent graph
- compare the final integration branch against each R2 branch

### 7.2 Verify final integration containment

Expected result for these branches when compared against final integration:

```text
fix/r2-admin-nav-smart-video-route: no unique commits
fix/r2-student-reader-toggle-consumption: no unique commits
fix/r2-note-pdf-toggle-settings-api: no unique commits
```

### 7.3 Review agent3 unique work

Review unique work from:

```text
fix/r2-agent3-smart-features-google-knowledge-integration
```

Observed unique scope includes admin app routing/API changes, Google knowledge service work, QA/video settings work, AI provider/schema changes, and related R2 reports.

If the unique work is valid, merge or cherry-pick it into:

```text
fix/r2-smart-features-final-integration
```

If conflicts occur, stop and report `blocker`.

### 7.4 Update final integration from master

The final integration branch is behind `master` by 5 commits. Update it from `master` before opening the final PR.

Do not rebase this shared branch unless explicitly approved.

### 7.5 Run validation

Required validation:

- dependency installation check
- workspace typecheck
- workspace build
- admin API smoke test
- student API smoke test
- admin UI smoke test
- student reader UI smoke test

If workspace/database environment blocks full verification, report it as `failure` or `blocker` with exact logs and affected packages.

### 7.6 Open final PR

Open one PR only:

```text
base: master
head: fix/r2-smart-features-final-integration
title: feat(r2): final smart features integration
```

PR body must include:

- merged branch list
- validation results
- known blockers
- manual acceptance checklist
- screenshots if UI changed

### 7.7 Cleanup after final PR merge only

After the final PR is merged and accepted, remove redundant remote branches through GitHub UI or approved CLI process:

```text
fix/r2-admin-nav-smart-video-route
fix/r2-student-reader-toggle-consumption
fix/r2-note-pdf-toggle-settings-api
```

After `fix/r2-agent3-smart-features-google-knowledge-integration` is merged or explicitly rejected, it can also be removed.

Do not remove `master`. Do not remove the final integration branch until final acceptance is complete and a stable point is confirmed.

## 8. Acceptance checklist

Before final merge into `master`:

- [ ] final integration branch includes all intended R2 work
- [ ] agent3 unique commits reviewed
- [ ] final integration branch updated from `master`
- [ ] typecheck result recorded
- [ ] build result recorded
- [ ] API smoke test recorded
- [ ] student frontend smoke test recorded
- [ ] admin frontend smoke test recorded
- [ ] PR body documents validation and known limitations
- [ ] no additional parallel R2 branches are pushed

After final merge:

- [ ] redundant branches removed
- [ ] stale PR #4 closed or retargeted appropriately
- [ ] `master` branch protection enabled
- [ ] final acceptance report committed under `docs/r2/`

## 9. Termination report template

```md
## Termination Report

- status: success | failure | blocker | permission-halt
- repository: b827262-cell/AI-SmartBook-R1
- branch: fix/r2-smart-features-final-integration
- final commit SHA:
- PR URL:

### success
- What was completed:

### failure
- What failed:
- Logs:

### blocker
- Blocking issue:
- Required human decision:

### permission-halt
- Permission-sensitive operation stopped:
- Required approval:

### branch cleanup
- removed:
- retained:
- pending:
```

## 10. Current conclusion

Status: `partial / integration-pending`

Do not continue distributing work across more branches. The next safe step is to consolidate into `fix/r2-smart-features-final-integration`, review the unique agent3 branch, open one final PR to `master`, and only then remove redundant branches.
