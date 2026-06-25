# AI-SmartBook-R2 Cleanup Complete — Next Phase Multi-Agent Dispatch

Date: 2026-06-25
Repository: `b827262-cell/AI-SmartBook-R1`
Base branch: `master`
Status: `cleanup-complete / next-phase-ready`

## 1. Purpose

This document records the completed GitHub cleanup state for AI-SmartBook-R2 and assigns the next phase of work to multiple agents.

The previous phase resolved the R2 multi-branch integration problem. The repository now has a protected `master` branch and the old cleanup/documentation branches have been merged or removed. The remaining branches shown in GitHub are no longer emergency cleanup items; they are retained branches for follow-up feature work or special review.

## 2. Completed GitHub cleanup

The following items are complete:

| Item | Result |
| --- | --- |
| PR #5 | R2 main integration merged into `master` |
| PR #6 | Post-merge cleanup report merged into `master` |
| PR #7 | Governance / agent handoff docs merged into `master` |
| PR #11 | Final cleanup and multi-agent execution reports merged into `master` |
| `docs/r2-multi-agent-cleanup-dispatch-20260625` | deleted after merge |
| `fix/r2-reader-pdf-pen-annotation` | deleted after AGY confirmed it was fully merged |
| `master` branch protection | enabled |

Current conclusion:

```text
R2 multi-branch cleanup is complete.
The protected master branch is the source of truth for all future work.
```

## 3. Current remaining branches

The remaining branches are classified as retained branches, risk branches, or follow-up PR candidates.

### 3.1 Must keep

```text
master
main
feat/r2-one-click-solve-book-my-question-bank
```

Reason:

- `master` is the protected primary branch.
- `main` is retained by rule and must not be deleted until the owner explicitly confirms deprecation.
- `feat/r2-one-click-solve-book-my-question-bank` is the planned one-click solve follow-up feature branch.

### 3.2 Risk branch — hold

```text
fix/r2-agent3-smart-features-google-knowledge-integration
```

Reason:

AGY marked this branch as having merge-base risk. It must not be merged or deleted until a later detailed conflict review is complete.

### 3.3 Follow-up feature PR candidates

These branches should not be deleted yet. They should be reviewed one by one and turned into focused follow-up PRs only when needed.

```text
fix/r2-admin-settings-files-integration
fix/r2-smart-features-runtime-claude
fix/r2-student-reader-local-image-picker
feat/r2-student-reader-toolbar-modules
feat/r2-student-manuscript-board
feat/r2-book-upload-one-click-json-generation
feat/r2-pdf-screenshot-ask-ai-core
feat/r2-pdf-screenshot-ask-ai-buttons
feat/student-category-cover-reader-chat
```

Rule:

Do not bulk-merge these branches. Each branch needs a separate scope decision, validation, and PR plan.

## 4. Next phase strategy

The next phase should focus on `one-click solve` first.

Recommended approach:

1. Start from the latest `master`.
2. Create a new clean follow-up branch from `master`.
3. Use `feat/r2-one-click-solve-book-my-question-bank` as a reference branch only.
4. Do not directly merge the old branch into `master`.
5. Split the feature into smaller PRs.
6. Run typecheck/build for both admin and student apps after each PR.

## 5. Multi-agent assignment

## 5.1 Agent 1 — Claude Sonnet 4.6: one-click solve architecture and conflict plan

### Mission

Prepare the one-click solve implementation strategy using the retained branch as reference.

Reference branch:

```text
feat/r2-one-click-solve-book-my-question-bank
```

### Rules

1. Read-only analysis first.
2. Do not merge into `master`.
3. Do not delete any branch.
4. Do not force push.
5. Do not modify source code unless reassigned by the owner.

### Known conflict files

```text
apps/AI-Stu-R1/src/components/MyQuestionBankPanel.tsx
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
apps/AI-Stu-R1/src/studentClient.ts
apps/AI-adm-D1/src/server/index.ts
packages/ai/src/providers/mock.provider.ts
```

### Required output

Prepare a Traditional Chinese report:

```text
docs/r2/AI-SmartBook-R2-one-click-solve-followup-implementation-plan-20260625.md
```

The report must include:

```text
- feature purpose
- conflict file analysis
- database / schema risk
- recommended PR split
- safest implementation order
- validation checklist
- rollback strategy
```

## 5.2 Agent 2 — Codex-5.3 Spark: latest master baseline validation

### Mission

Validate latest `master` before any new feature work starts.

### Rules

1. Read-only validation.
2. Do not edit files.
3. Do not push.
4. Do not merge.

### Required commands

```bash
git fetch --all --prune
git checkout master
git pull --ff-only origin master
corepack enable
pnpm install --frozen-lockfile
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

### Required output

Traditional Chinese validation report:

```text
docs/r2/AI-SmartBook-R2-master-baseline-validation-before-one-click-solve-20260625.md
```

Include:

```text
command | result | log summary | blocker | recommendation
```

## 5.3 Agent 3 — AGY / Gemini: remaining branch read-only watch

### Mission

Monitor remaining branches and confirm they should still be retained, held, or converted into future PRs.

### Rules

1. Read-only only.
2. Do not merge.
3. Do not delete branches.
4. Do not push source changes.

### Required table

```text
branch | current state | recommended action | reason
```

Special rules:

```text
main = keep
feat/r2-one-click-solve-book-my-question-bank = keep as reference
fix/r2-agent3-smart-features-google-knowledge-integration = hold due to merge-base risk
feature branches = review one by one; no bulk merge
```

## 5.4 Agent 4 — GPT-5.5: final coordinator for next phase

### Mission

After Claude, Codex, and AGY return their reports, GPT-5.5 decides the exact next PR sequence.

### Required output

Traditional Chinese decision table:

```text
PR order | branch/source | scope | risk | validation | owner approval needed
```

Allowed decisions:

```text
open follow-up PR
split into smaller PRs
hold
delete after confirmation
close stale PR
```

## 6. Old PR cleanup note

GitHub still shows one pull request in the navigation badge. This is likely an old/stale PR such as:

```text
feat/student-category-cover-reader-chat
```

If confirmed stale and superseded by PR #5 / PR #11, close it with this note:

```text
Superseded by PR #5 final R2 integration and later cleanup PRs. Closing this stale PR to avoid duplicate branch history.
```

Do not close any PR that still contains active follow-up work without owner approval.

## 7. Rules for new development

All future coding must follow these rules:

1. Start from latest `master`.
2. Create a new branch for each feature.
3. Do not work directly from old R2 topic branches.
4. Do not bulk-merge old branches.
5. Every source-code PR must pass:
   - `pnpm --filter AI-adm-D1 typecheck`
   - `pnpm --filter AI-adm-D1 build`
   - `pnpm --filter AI-Stu-R1 typecheck`
   - `pnpm --filter AI-Stu-R1 build`
6. Documentation-only PRs may use branch protection bypass only with owner approval.
7. Source-code PRs must not bypass review unless explicitly approved by the owner.

## 8. Final termination report template

Each agent must return a Traditional Chinese report:

```md
## 終止回報

- status: success / failure / blocker / permission-halt
- repo: b827262-cell/AI-SmartBook-R1
- branch:
- commit SHA:
- PR URL:
- source code changed:

## success

- 已完成事項：

## failure

- 失敗事項：
- 錯誤 log：

## blocker

- 阻塞點：
- 需要人工決策：

## permission-halt

- 權限或高風險操作暫停事項：

## 下一步

-
```

## 9. Conclusion

Status: `success / cleanup complete / next phase ready`

The R2 GitHub cleanup work is complete. The next phase is not branch cleanup; it is controlled follow-up feature development, starting with one-click solve planning and implementation from the latest protected `master`.
