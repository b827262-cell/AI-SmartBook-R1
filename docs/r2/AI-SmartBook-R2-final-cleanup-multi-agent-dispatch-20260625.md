# AI-SmartBook-R2 Final Cleanup Multi-Agent Dispatch

Date: 2026-06-25
Repository: `b827262-cell/AI-SmartBook-R1`
Target branch: `docs/r2-multi-agent-cleanup-dispatch-20260625`
Status: `ready-for-dispatch`

## 1. Purpose

This document assigns the final R2 cleanup work to multiple agents while keeping write operations controlled.

The R2 main integration is already complete. PR #5, PR #6, and PR #7 have been merged. The remaining work is limited to final documentation PR handling, remaining branch audit confirmation, master validation, and one-click solve follow-up planning.

## 2. Current status

| Item | Status |
| --- | --- |
| PR #5 | merged into `master` |
| PR #6 | merged into `master` |
| PR #7 | merged into `master` |
| `master` protection | enabled |
| `docs/r2-post-merge-cleanup-report-20260625` | removed after PR #6 |
| `docs/r2-multi-agent-cleanup-dispatch-20260625` | active final docs branch |
| `feat/r2-one-click-solve-book-my-question-bank` | retained for follow-up PR |

## 3. Global rules

1. Do not push directly to `master`.
2. Do not force push.
3. Do not delete `master`.
4. Do not delete `main`.
5. Do not delete `feat/r2-one-click-solve-book-my-question-bank`.
6. Only one agent may perform write/delete operations at a time.
7. All other agents must work read-only or docs-only.
8. Source-code merges are not allowed in this cleanup phase.
9. Final reports must be written in Traditional Chinese.

## 4. Agent assignment table

| Agent | Role | Permission | Main output |
| --- | --- | --- | --- |
| Codex / GPT-5.5 | Final docs PR owner | write for docs PR only | PR URL, merge result, branch cleanup result |
| AGY / Gemini | Remaining branch confirmation | read-only | branch action table |
| Claude Sonnet 4.6 | One-click solve follow-up planner | read-only | conflict and PR split plan |
| Codex-5.3 Spark | Latest `master` validator | read-only | typecheck/build validation result |
| GPT-5.5 | Final coordinator | coordinator | final branch decision report |

## 5. Agent 1 — Codex / GPT-5.5: final docs PR

### Mission

Open and complete the final documentation PR.

Source branch:

```text
docs/r2-multi-agent-cleanup-dispatch-20260625
```

Target branch:

```text
master
```

Recommended PR title:

```text
docs(r2): add final cleanup execution reports
```

### Rules

1. Confirm all changed files are under `docs/r2/`.
2. Do not modify source code.
3. Do not touch `apps/`, `packages/`, `scripts/`, `deploy/`, `package.json`, or `pnpm-lock.yaml`.
4. If blocked by review rule, owner-approved bypass merge is allowed only because this is docs-only.
5. After merge, delete only:

```text
docs/r2-multi-agent-cleanup-dispatch-20260625
```

### Required output

Traditional Chinese termination report must include:

```text
- status
- PR URL
- merge SHA
- deleted branch
- source code changed: no
- failure
- blocker
- permission-halt
```

## 6. Agent 2 — AGY / Gemini: remaining branch confirmation

### Mission

Confirm the remaining branch status after PR #5, PR #6, and PR #7 were merged.

### Focus branches

```text
fix/r2-reader-pdf-pen-annotation
fix/r2-agent3-smart-features-google-knowledge-integration
feat/r2-one-click-solve-book-my-question-bank
main
remaining source branches
docs-only branches
```

### Rules

1. Read-only only.
2. Do not merge.
3. Do not delete branches.
4. Do not push source changes.
5. If a report is needed, use docs-only branch workflow.

### Required output

Report table:

```text
branch | status | action | reason
```

Special decisions:

```text
fix/r2-reader-pdf-pen-annotation = delete candidate if still fully merged into master
feat/r2-one-click-solve-book-my-question-bank = retain
main = retain
fix/r2-agent3-smart-features-google-knowledge-integration = hold due to merge-base risk
```

## 7. Agent 3 — Claude Sonnet 4.6: one-click solve follow-up plan

### Mission

Analyze the one-click solve follow-up PR strategy.

Branch:

```text
feat/r2-one-click-solve-book-my-question-bank
```

Known conflict files:

```text
apps/AI-Stu-R1/src/components/MyQuestionBankPanel.tsx
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
apps/AI-Stu-R1/src/studentClient.ts
apps/AI-adm-D1/src/server/index.ts
packages/ai/src/providers/mock.provider.ts
```

### Rules

1. Do not merge.
2. Do not delete the branch.
3. Do not force push.
4. Analysis only unless explicitly reassigned.

### Required output

Prepare or update:

```text
docs/r2/AI-SmartBook-R2-one-click-solve-followup-plan-20260625.md
```

The report must include:

```text
- conflict reason
- feature scope
- database schema / migration risk
- recommended split PRs
- safest merge order
- validation checklist
```

## 8. Agent 4 — Codex-5.3 Spark: latest master validation

### Mission

Validate the latest protected `master` branch.

### Commands

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

### Rules

1. Read-only validation.
2. Do not edit files.
3. Do not push.
4. Do not merge.

### Required output

Report table:

```text
command | result | log summary | blocker
```

## 9. Agent 5 — GPT-5.5: final coordinator

### Mission

After Agent 1–4 finish, produce the final branch decision report.

### Required decision table

```text
branch | action | reason | owner approval needed
```

Allowed actions:

```text
delete
retain
open follow-up PR
hold
close stale PR
```

### Final report template

```md
## 終止回報

- status: success / failure / blocker / permission-halt
- repo: b827262-cell/AI-SmartBook-R1
- master SHA:
- final docs PR:
- one-click solve:
- deleted branches:
- retained branches:

## success

- 已完成事項：

## failure

- 失敗事項：

## blocker

- 阻塞點：

## permission-halt

- 權限或高風險操作暫停事項：

## 下一步

-
```

## 10. Current execution order

1. Codex / GPT-5.5 opens the final docs PR.
2. AGY / Gemini confirms remaining branch decisions in read-only mode.
3. Claude Sonnet 4.6 completes the one-click solve follow-up plan.
4. Codex-5.3 Spark validates latest `master`.
5. GPT-5.5 consolidates final decisions.
6. Owner approves any destructive cleanup actions.

## 11. Current conclusion

Status: `multi-agent-dispatch-ready`

This workflow allows multiple agents to work in parallel while keeping write and delete operations controlled. The protected `master` branch remains the only source of truth for new development.
