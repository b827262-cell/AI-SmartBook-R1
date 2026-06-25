# AI-SmartBook-R2 PR #4 AntiG Portal Defer Decision and Next Dispatch

Date: 2026-06-25
Repository: `b827262-cell/AI-SmartBook-R1`
Branch: `docs/r2-cleanup-complete-next-phase-dispatch-20260625`
Status: `docs-only-follow-up-required`

## 1. Current status

PR #12 has been merged into `master`.

| Item | Result |
| --- | --- |
| PR #12 | merged |
| Merge SHA | `925c233a538a1981e533932998b42dafeb16fa03` |
| Type | documentation-only |
| Source code changed | no |

PR #4 has been closed and was not merged.

| Item | Result |
| --- | --- |
| PR #4 | closed |
| Base | `main` |
| Head | `feat/student-category-cover-reader-chat` |
| Merged | false |
| Reason | stale base branch and stale branch history |

Closing note for PR #4:

```text
PR #4 targets the old main branch and is now stale after PR #5 / PR #11 completed the R2 integration and cleanup flow.

Closing this PR to avoid merging stale branch history.

The remaining valuable unique commits will be reviewed separately from a new clean branch.
```

## 2. PR #4 unique work summary

PR #4 still had a small amount of unique work that should not be lost, but it should not be merged through PR #4.

| Commit | Summary | Decision |
| --- | --- | --- |
| `5d2070da` | TUF ASUS no-reboot fallback documentation | salvage later as docs-only candidate |
| `f3ed5e5e` | TUF ASUS route repair documentation | salvage later as docs-only candidate |
| `4c5cdf43` | TUF ASUS old services shutdown documentation | salvage later as docs-only candidate |
| `6770122e` | MacBook student frontend runbook | salvage later if not already in master |
| `85152bbd` | AntiG institutional flow portal | defer, do not integrate now |

## 3. Commit `85152bbd` decision

Commit `85152bbd` exposes an AntiG institutional flow report in the student frontend.

It adds a separate portal page, an institutional flow page, a local data adapter, route changes, proxy changes, package script changes, and AntiG-specific CSS.

## 4. Why `85152bbd` should not be integrated now

Decision:

```text
Do not integrate 85152bbd now.
```

Reasons:

1. It is a separate AntiG financial-data product area, not core AI-SmartBook reader functionality.
2. It has a runtime dependency on external institutional-flow data that is not part of the core SmartBook deployment.
3. It creates a CSS append conflict that requires manual review.
4. It is unrelated to the current next-phase milestone: One-click Solve.
5. The repository is in a post-cleanup stabilization phase.

Future re-evaluation condition:

```text
Only revisit this commit if the owner explicitly confirms AntiG Portal should become a permanent AI-SmartBook-R1 feature.
```

If approved later, it should be rebuilt from the latest protected `master` branch as a new focused feature branch, not from PR #4.

## 5. Current docs branch status

The branch `docs/r2-cleanup-complete-next-phase-dispatch-20260625` still contains follow-up documentation after PR #12.

Therefore:

```text
Do not delete this branch yet.
```

A new documentation-only PR should be opened from this branch into `master`.

Suggested PR title:

```text
docs(r2): add PR4 scope comparison and defer AntiG portal
```

After that PR is merged, delete:

```text
docs/r2-cleanup-complete-next-phase-dispatch-20260625
```

## 6. Multi-agent dispatch

## Agent 1 — Codex / GPT-5.5

Mission:

```text
Open the next docs-only PR from docs/r2-cleanup-complete-next-phase-dispatch-20260625 into master.
```

Rules:

1. Confirm all changed files are under `docs/r2/`.
2. Do not edit source code.
3. Do not merge PR #4.
4. After the docs-only PR is merged, delete only the docs branch.

Required report:

```text
status:
PR URL:
merge SHA:
deleted branch:
source code changed: no
failure:
blocker:
permission-halt:
```

## Agent 2 — AGY / Gemini

Mission:

```text
Perform read-only branch watch and confirm no source branch is accidentally merged during this docs follow-up.
```

Rules:

1. Read-only.
2. Do not delete branches.
3. Do not merge source branches.
4. Keep `fix/r2-agent3-smart-features-google-knowledge-integration` on hold.

Output table:

```text
branch | status | risk | recommended action
```

## Agent 3 — Claude Sonnet 4.6

Mission:

```text
Prepare a future-only AntiG Portal design note if owner later approves the feature.
```

Rules:

1. Do not integrate `85152bbd` now.
2. Do not edit source code.
3. Do not start from PR #4.
4. Future implementation must start from latest `master`.

Output:

```text
future prerequisites, deployment requirement, route isolation, CSS isolation, validation plan
```

## Agent 4 — Codex-5.3 Spark

Mission:

```text
No immediate action. Only run typecheck/build if a future AntiG Portal branch is explicitly approved.
```

## Agent 5 — GPT-5.5 final coordinator

Mission:

```text
Keep the project sequence clean: finish docs PR, delete docs branch, then proceed to One-click Solve.
```

Decision matrix:

| Item | Action |
| --- | --- |
| PR #4 | keep closed, do not merge |
| `85152bbd` | defer |
| current docs branch | open final docs-only PR |
| after final docs PR | delete docs branch |
| next source-code phase | One-click Solve from latest master |

## 7. Final conclusion

```text
PR #12 is complete.
PR #4 is closed and must not be merged.
85152bbd is deferred.
The docs branch still has follow-up documentation and needs one final docs-only PR.
After that PR is merged, delete the docs branch and proceed to One-click Solve from latest master.
```
