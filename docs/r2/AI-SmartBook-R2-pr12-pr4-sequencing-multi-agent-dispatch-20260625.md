# AI-SmartBook-R2 PR #12 / PR #4 Sequencing Multi-Agent Dispatch

Date: 2026-06-25
Repository: `b827262-cell/AI-SmartBook-R1`
Branch: `docs/r2-cleanup-complete-next-phase-dispatch-20260625`
Status: `ready-for-agent-execution`

## 1. Purpose

This document records the decision that PR #12 and PR #4 must not be handled as the same operation.

PR #12 is a documentation-only PR targeting the protected `master` branch. It should be completed first.

PR #4 is an older feature PR targeting `main`, not `master`. It is not part of the current final cleanup PR flow and should not be merged into `main` or `master` during this step.

## 2. Current PR status

## 2.1 PR #12 — final next-phase dispatch docs

| Field | Value |
| --- | --- |
| PR | `#12` |
| Title | `docs(r2): add cleanup complete next phase dispatch` |
| Base | `master` |
| Head | `docs/r2-cleanup-complete-next-phase-dispatch-20260625` |
| State | `open` |
| Mergeable | `true` |
| Draft | `false` |
| Commits | `3` |
| Changed files | `2` |
| Additions | `359` |
| Deletions | `0` |

Decision:

```text
PR #12 should be merged first after confirming changed files are docs-only.
```

Expected action:

1. Open PR #12.
2. Check `Files changed`.
3. Confirm only `docs/r2/` files are changed.
4. Merge PR #12.
5. If branch protection blocks the merge and the owner approves, use bypass merge because this is documentation-only.
6. After merge, delete only:

```text
docs/r2-cleanup-complete-next-phase-dispatch-20260625
```

## 2.2 PR #4 — old student category / reader / chat feature PR

| Field | Value |
| --- | --- |
| PR | `#4` |
| Title | `feat(stu): add category library, cover UX, reader, and chat history` |
| Base | `main` |
| Head | `feat/student-category-cover-reader-chat` |
| State | `open` |
| Mergeable | `true` |
| Commits | `61` |
| Changed files | `108` |
| Additions | `17718` |
| Deletions | `414` |

Decision:

```text
PR #4 must not be merged as part of the PR #12 docs cleanup operation.
```

Reason:

1. PR #4 targets `main`, while the repository source of truth is now the protected `master` branch.
2. PR #4 is a large source-code feature PR, not documentation-only.
3. R2 main integration was already completed through PR #5 and later cleanup PRs.
4. Merging PR #4 now would reintroduce stale branch history and duplicate changes.

Recommended action:

After PR #12 is merged and the docs branch is deleted, review PR #4 as a stale PR candidate.

If confirmed superseded by PR #5 and later cleanup PRs, close PR #4 with this comment:

```text
Superseded by PR #5 final R2 integration and later cleanup PRs. Closing this stale PR to avoid duplicate branch history.
```

Do not merge PR #4 without explicit owner approval and a new review against `master`.

## 3. Multi-agent assignment

## 3.1 Agent 1 — Codex / GPT-5.5: PR #12 docs completion

### Mission

Complete PR #12 only.

### Rules

1. Do not touch PR #4.
2. Confirm PR #12 is docs-only.
3. Do not modify source code.
4. Do not touch `apps/`, `packages/`, `scripts/`, `deploy/`, `package.json`, or `pnpm-lock.yaml`.
5. Merge PR #12 only after confirming docs-only changes.
6. If blocked by branch protection, use owner-approved bypass only for PR #12.
7. After PR #12 merge, delete only:

```text
docs/r2-cleanup-complete-next-phase-dispatch-20260625
```

### Required report

Return a Traditional Chinese termination report:

```md
## 終止回報

- status: success / failure / blocker / permission-halt
- PR: #12
- PR URL:
- merge SHA:
- deleted branch:
- source code changed: no
- failure:
- blocker:
- permission-halt:
```

## 3.2 Agent 2 — AGY / Gemini: PR #4 stale confirmation

### Mission

Confirm whether PR #4 is stale and superseded by PR #5 / PR #11.

### Rules

1. Read-only unless explicitly assigned to close PR #4.
2. Do not merge PR #4.
3. Do not retarget PR #4.
4. Do not delete `feat/student-category-cover-reader-chat` unless owner approves.

### Required checks

Confirm:

```text
PR #4 base is main
PR #4 is source-code heavy
PR #4 scope overlaps with PR #5 R2 final integration
PR #4 should not be merged into main/master now
```

### Required output

Return table:

```text
PR | base | head | scope | risk | recommended action
```

Recommended action should usually be:

```text
close stale PR after owner approval
```

## 3.3 Agent 3 — Claude Sonnet 4.6: historical scope comparison

### Mission

Compare PR #4 scope conceptually against completed PR #5 / R2 master state.

### Rules

1. Read-only analysis.
2. Do not merge PR #4.
3. Do not edit source code.
4. Do not close PR #4 unless reassigned.

### Output

Prepare a short Traditional Chinese summary:

```text
PR #4 overlap analysis
whether PR #4 is superseded
what, if anything, should be salvaged later
recommended close / retain decision
```

## 3.4 Agent 4 — GPT-5.5 final coordinator

### Mission

After PR #12 is merged and AGY / Claude confirm PR #4 status, coordinate the final decision.

### Decision table

```text
item | action | reason | owner approval needed
```

Expected result:

```text
PR #12 = merge and delete docs branch
PR #4 = close as stale, do not merge
feat/student-category-cover-reader-chat = retain or delete only after owner approval
```

## 4. Strict sequencing rule

Use this order:

```text
1. Merge PR #12 first.
2. Delete PR #12 docs branch.
3. Review PR #4 as stale.
4. Close PR #4 only after owner approval.
5. Do not merge PR #4.
```

## 5. Final conclusion

Status: `sequencing-required`

PR #12 and PR #4 should not be handled together as equivalent merge tasks.

PR #12 is a docs-only final cleanup handoff PR into `master` and should be completed first.

PR #4 is an old source-code PR into `main`; it should be treated as stale/superseded and closed after confirmation, not merged.
