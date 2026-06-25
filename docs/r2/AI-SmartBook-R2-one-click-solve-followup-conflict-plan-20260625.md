# AI-SmartBook-R2｜One-Click Solve Follow-up Conflict Plan

> Role: Agent 3 — Claude Sonnet 4.6 (read-only analysis)  
> Branch analyzed: `feat/r2-one-click-solve-book-my-question-bank`  
> Commit: `82246ac feat(r2): add one-click solve book and my question bank`  
> Date: 2026-06-25  
> Status: READ-ONLY — no source code changes, no push

---

## 1. Feature Purpose

`82246ac` implements an **One-Click Solve** feature with:

| Layer | Content |
|---|---|
| Admin UI | `OneClickSolvePanel.tsx` — triggers AI generation of single-choice questions (選擇題) from book content |
| Student UI | `MyQuestionBankPanel.tsx` — displays generated questions as a "我的題庫" tab |
| API (admin) | `POST /api/admin/books/:bookId/one-click-solve/jobs` — triggers async AI job |
| API (student) | `GET /api/student/books/:bookId/question-bank` — returns staged candidates |
| DB | `one_click_solve_jobs` + `one_click_solve_candidates` tables |
| Schema | `OneClickSolveCandidate`, `OneClickSolveJob` Zod types |
| Repository | `oneClickSolve.repo.ts` |
| Mock | Adds mock AI response for "one-click-solve" system prompt |

The feature represents an **early prototype** of the AI question generation workflow.

---

## 2. Conflict Files

5 files conflict when cherry-picking `82246ac` onto current `master`:

| File | Conflict type | Severity |
|---|---|---|
| `apps/AI-Stu-R1/src/components/MyQuestionBankPanel.tsx` | add/add | HIGH |
| `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | content | MEDIUM |
| `apps/AI-Stu-R1/src/studentClient.ts` | content | LOW |
| `apps/AI-adm-D1/src/server/index.ts` | content | MEDIUM |
| `packages/ai/src/providers/mock.provider.ts` | content | LOW |

---

## 3. Conflict Root Causes (per file)

### 3a. `MyQuestionBankPanel.tsx` — add/add (CRITICAL)

This is a **completely different implementation** of the same component:

| Aspect | Branch (82246ac) | Master |
|---|---|---|
| Types used | `OneClickSolveCandidate` | `SmartSolveImportJob`, `SmartSolveImportItem`, `QuestionBankImportJob` |
| API called | `studentClient.getQuestionBank(bookId)` | Polling job-based approach |
| Prop signature | `{ bookId: string }` | `{ bookId: string; bookTitle: string }` |
| Design | Simple list of candidates | Job status tracking + item-level detail |

**Root cause:** The `MyQuestionBankPanel` was developed twice in parallel — once in this branch (early prototype) and once by a subsequent PR that was already merged into master. The master version is more advanced and production-ready.

### 3b. `BookReaderPage.tsx` — content conflict (MEDIUM)

Branch adds:
```tsx
import { MyQuestionBankPanel } from "../components/MyQuestionBankPanel";
// ...
) : activeTab === "my-question-bank" ? (
  <MyQuestionBankPanel bookId={bookId} />
```

Master already has:
```tsx
// import already present at different location
) : activeTab === "my-question-bank" ? (
  <MyQuestionBankPanel bookId={bookId} bookTitle={book.title} />
```

**Root cause:** The integration was already completed in master (from the later PR), but with `bookTitle` prop added. The branch's version is a subset of what master already has.

### 3c. `studentClient.ts` — content conflict (LOW)

Branch adds:
```ts
import type { ..., OneClickSolveCandidate } from "@ai-smartbook/schema";
// ...
getQuestionBank: (bookId) =>
  http<{ candidates: OneClickSolveCandidate[] }>(`/api/student/books/${bookId}/question-bank`)
```

Master already has:
```ts
import type { ..., QuestionBankImportJob, SmartSolveImportJob, SmartSolveImportItem, ... }
// ...
getQuestionBankJobs: () =>
  http<{ jobs: QuestionBankImportJob[] }>("/api/student/question-bank/jobs")
```

**Root cause:** Different API design — branch uses a per-book endpoint, master uses a global jobs endpoint. The `OneClickSolveCandidate` type does not exist in master's schema package.

### 3d. `server/index.ts` — content conflict (MEDIUM)

Branch adds:
- `GET /api/student/books/:bookId/question-bank` (uses `repos.oneClickSolve`)
- `POST /api/admin/books/:bookId/one-click-solve/jobs` (async AI generation)

Master already has (different routes for similar purpose):
- `GET /api/student/question-bank/jobs` (SmartSolveImport-based)
- `POST /api/admin/import/question-bank/jobs` (CSV/JSON import workflow)
- `POST /api/admin/books/:bookId/one-click-workflow` (existing one-click AI workflow)

**Root cause:** The branch's routes reference `repos.oneClickSolve` which does NOT exist in master's repositories. Applying the cherry-pick would break server startup because `repos.oneClickSolve` is undefined.

### 3e. `packages/ai/src/providers/mock.provider.ts` — content conflict (LOW)

Branch adds mock response matching `"one-click-solve"` in system prompt. Master has different mock structure. Low risk but requires manual merge of the conditional block.

---

## 4. Database Schema / Migration Risk

### Branch introduces (not in master):

```sql
CREATE TABLE one_click_solve_jobs (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE one_click_solve_candidates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  question TEXT NOT NULL,
  options_json TEXT NOT NULL,
  answer TEXT,
  explanation TEXT,
  source_page INTEGER,
  source_text TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  ...
);
```

### Master already has:

- `question_bank_import_jobs` table (from `QuestionBankImport` system — different design)
- No `one_click_solve_*` tables
- No `oneClickSolve.repo.ts` repository

### Migration Risk Assessment: HIGH

1. The `migrate.ts` in the branch adds `CREATE TABLE IF NOT EXISTS` guards, so running it won't fail on an existing DB. **Low risk for data loss.**
2. However, the tables are NOT REFERENCED anywhere in master's codebase. Adding them creates dead schema.
3. The `repos.oneClickSolve` reference in the server routes would cause a **runtime error on startup** if the routes are applied without also adding the repository to `repos` initialization.
4. If a developer adds the tables then later removes them, a down-migration would be needed (manual).

---

## 5. Recommended Merge Strategy

### Verdict: **Close as Superseded (Category D/E)**

The branch's core feature (`MyQuestionBankPanel` + question bank UI) is **already implemented in master** through a later, more complete PR. Master's implementation uses a different (more advanced) data model (`SmartSolveImport`/`QuestionBankImport`).

Applying `82246ac` to master would:
1. Overwrite the advanced `MyQuestionBankPanel` with an older prototype version
2. Introduce `repos.oneClickSolve` references that break the server (undefined repo)
3. Add DB tables that are not used by any code in master
4. Duplicate the student question bank API endpoint in a different form

### Option A — Recommended: Retain branch, close as superseded

| Decision | Reason |
|---|---|
| Do NOT cherry-pick `82246ac` into master | Master already has the feature in a more complete form |
| Retain `feat/r2-one-click-solve-book-my-question-bank` | Historical reference; do not delete |
| No follow-up PR needed for the UI/API layer | Already covered by master |
| Consider: if `OneClickSolveCandidate` type is needed anywhere | Add only the schema types if explicitly referenced |

### Option B — Selective port (if specific sub-features are needed)

If the `/api/student/books/:bookId/question-bank` per-book endpoint is specifically required (master only has `/api/student/question-bank/jobs`), create a minimal follow-up PR containing:

1. **Only** `oneClickSolve.schema.ts` + export in `schema/index.ts`
2. **Only** `oneClickSolve.repo.ts` + registration in `db/repositories/index.ts`
3. **Only** the `GET /api/student/books/:bookId/question-bank` server route
4. **Only** the `getQuestionBank()` addition to `studentClient.ts`
5. DB migration for `one_click_solve_candidates` only (read path; skip the write/job tables)

**Excludes:**
- `MyQuestionBankPanel.tsx` (master version is better; only add `bookTitle` prop compatibility if needed)
- `BookReaderPage.tsx` (master integration already complete)
- `POST /api/admin/books/:bookId/one-click-solve/jobs` route (master has `one_click_workflow` for admin-side generation)
- `OneClickSolvePanel.tsx` (admin panel; master may have equivalent)
- `mock.provider.ts` (low priority; add only if AI mock is needed in tests)

---

## 6. Estimated Risk

| Risk area | Level | Notes |
|---|---|---|
| Data loss | LOW | `IF NOT EXISTS` migration guards |
| Server crash on startup | HIGH if applied as-is | `repos.oneClickSolve` undefined without repo registration |
| Breaking existing tests | LOW | No existing tests reference oneClickSolve |
| UI regression | HIGH if applied as-is | Would downgrade `MyQuestionBankPanel` to older version |
| Schema type conflicts | MEDIUM | `OneClickSolveCandidate` not in master schema; imports would fail |

---

## 7. Whether to Split into Smaller PRs

**Option A (recommended):** No follow-up PR — feature is superseded.

**Option B (if needed):** Split into 2 PRs:

**PR B-1 — Schema + Repository only:**
- `packages/schema/src/oneClickSolve.schema.ts`
- `packages/schema/src/index.ts` (add export)
- `packages/db/src/schema.ts` (add tables)
- `packages/db/src/migrate.ts` (add migration)
- `packages/db/src/repositories/oneClickSolve.repo.ts`
- `packages/db/src/repositories/index.ts` (register repo)

**PR B-2 — API endpoint only (depends on B-1):**
- `apps/AI-adm-D1/src/server/index.ts` (add `GET /api/student/books/:bookId/question-bank` only)
- `apps/AI-Stu-R1/src/studentClient.ts` (add `getQuestionBank`)
- No UI component changes (master already has better versions)

This 2-PR split ensures the DB layer is stable before any API or UI code references it.

---

## 8. Final Recommendation for Agent 5

| Action | Reason |
|---|---|
| Mark `feat/r2-one-click-solve-book-my-question-bank` as **Category D** (superseded) | Feature already in master via later PR; branch `82246ac` is an older prototype |
| Do NOT delete the branch yet | Preserve for historical reference until owner reviews |
| Do NOT open a follow-up PR now | No unique value that master doesn't already have |
| Owner decision needed on: per-book `/question-bank` endpoint | If specifically required, follow Option B split strategy above |
| If Option B is chosen: assign conflict resolution to a new write-capable agent session | Do not attempt without explicit authorization |

---

## 9. Summary

The `feat/r2-one-click-solve-book-my-question-bank` branch (`82246ac`) represents an **early prototype** of the question bank feature. By the time this branch was ready for integration, master had already received a more complete implementation via a later PR. The 5-file conflict is not a technical bug — it is the result of parallel development where the later PR superseded the earlier design.

Cherry-picking as-is would cause a server startup crash (undefined `repos.oneClickSolve`), UI regression (older `MyQuestionBankPanel`), and dead DB tables. The safest action is to retain the branch for reference and treat it as superseded.
