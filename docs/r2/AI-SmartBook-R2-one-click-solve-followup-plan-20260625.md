# AI-SmartBook-R2｜One-Click Solve Follow-up Plan

> Role: Agent 3 — Claude Sonnet 4.6 (read-only)  
> Branch: `feat/r2-one-click-solve-book-my-question-bank`  
> Key commit: `82246ac feat(r2): add one-click solve book and my question bank`  
> Date: 2026-06-25  
> Reference: `AI-SmartBook-R2-one-click-solve-followup-conflict-plan-20260625.md`

---

## 1. Feature Scope

The branch implements a complete **AI-powered single-choice question generation pipeline**:

| Layer | File | Status vs master |
|---|---|---|
| Admin panel | `apps/AI-adm-D1/src/components/OneClickSolvePanel.tsx` | **NEW — clean apply** |
| Admin import page integration | `apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx` | Modified — **clean apply** |
| Admin API client | `apps/AI-adm-D1/src/api.ts` | Adds functions — **clean apply** |
| DB schema | `packages/db/src/schema.ts` | Adds 2 tables — **clean apply** |
| DB migration | `packages/db/src/migrate.ts` | IF NOT EXISTS guards — **clean apply** |
| DB repository | `packages/db/src/repositories/oneClickSolve.repo.ts` | **NEW — clean apply** |
| DB repo index | `packages/db/src/repositories/index.ts` | Adds export — **clean apply** |
| Zod schema | `packages/schema/src/oneClickSolve.schema.ts` | **NEW — clean apply** |
| Schema index | `packages/schema/src/index.ts` | Adds export — **clean apply** |
| Server routes | `apps/AI-adm-D1/src/server/index.ts` | Adds routes — **content conflict** |
| Mock provider | `packages/ai/src/providers/mock.provider.ts` | Adds branch — **content conflict** |
| Student client | `apps/AI-Stu-R1/src/studentClient.ts` | Adds function — **content conflict** |
| Student panel | `apps/AI-Stu-R1/src/components/MyQuestionBankPanel.tsx` | **add/add conflict** |
| Reader page | `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | Integration — **content conflict** |

**Key finding:** 9 of 14 changed files apply **cleanly** to current master. Only 5 files conflict, and 3 of those (server, studentClient, mock) are additive conflicts where the branch is simply adding new blocks alongside existing code.

---

## 2. Conflict Reason

### Why conflicts exist

The branch (`82246ac`) was committed on 2026-06-23. Between then and master's current state (PR #5, #6, #7 merged), several files were modified by other agents:

| File | Conflict cause |
|---|---|
| `server/index.ts` | 130+ lines of new routes added by R2 integration (reader features, watermark, etc.) between branch base and master |
| `studentClient.ts` | New imports and functions added by R2 integration (inPanel, reader feature settings) |
| `mock.provider.ts` | New branches added to mock response logic |
| `MyQuestionBankPanel.tsx` | A DIFFERENT implementation of the same component was merged into master via a later PR (uses `SmartSolveImportJob` / `QuestionBankImportJob` instead of `OneClickSolveCandidate`) |
| `BookReaderPage.tsx` | Master already has `activeTab === "my-question-bank"` integrated (with `bookTitle` prop); branch integration uses older API without `bookTitle` |

### Nature of each conflict

| File | Conflict nature | Resolvable? |
|---|---|---|
| `server/index.ts` | Additive — branch adds 2 new route blocks; no semantic overlap | **Yes — add blocks after existing routes** |
| `studentClient.ts` | Additive — branch adds `OneClickSolveCandidate` import + `getQuestionBank` function | **Yes — append to existing imports/functions** |
| `mock.provider.ts` | Additive — branch adds `if` branch for "one-click-solve" system prompt | **Yes — add condition to mock chain** |
| `MyQuestionBankPanel.tsx` | Structural — two different implementations of the same component; master version is more advanced | **Yes — keep master version, discard branch version** |
| `BookReaderPage.tsx` | Minor — branch's `<MyQuestionBankPanel bookId={bookId} />` vs master's `<MyQuestionBankPanel bookId={bookId} bookTitle={book.title} />` | **Yes — keep master version (already correct)** |

---

## 3. Database Schema / Migration Risk

### New tables (in branch, not in master)

```sql
CREATE TABLE IF NOT EXISTS one_click_solve_jobs (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS one_click_solve_candidates (
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Risk assessment

| Risk | Level | Detail |
|---|---|---|
| Data loss | NONE | `IF NOT EXISTS` guards prevent errors on existing DB |
| Schema conflict with master tables | NONE | No name collision with `question_bank_import_jobs` or `smart_solve_import_*` tables |
| Running on existing production DB | LOW | Tables are additive; no existing data is modified |
| Down-migration if feature is removed later | LOW | Manual `DROP TABLE` needed; no automated rollback |
| Referential integrity | NONE | Tables use TEXT foreign keys (SQLite, no FK enforcement) |

**Conclusion:** Migration is safe to run on any existing SQLite DB. The `IF NOT EXISTS` guards make it idempotent.

---

## 4. Recommended Split PRs

### Why split: the admin layer can be merged immediately; student layer needs manual resolution.

---

### PR C-1 — Admin + Infrastructure (no conflicts, can cherry-pick directly)

**Base:** `master` → **head:** new branch `fix/r2-one-click-solve-admin-infra`

Files to include (all clean-apply):

```
packages/schema/src/oneClickSolve.schema.ts     ← new Zod schema
packages/schema/src/index.ts                    ← add export
packages/db/src/schema.ts                       ← add 2 tables
packages/db/src/migrate.ts                      ← IF NOT EXISTS migration
packages/db/src/repositories/oneClickSolve.repo.ts  ← new repo
packages/db/src/repositories/index.ts           ← register repo
apps/AI-adm-D1/src/api.ts                       ← add admin API functions
apps/AI-adm-D1/src/components/OneClickSolvePanel.tsx  ← new admin panel
apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx    ← add one-click tab
```

Plus manual additions (not in conflict, just blocked by adjacent changes):

```
apps/AI-adm-D1/src/server/index.ts:
  → Add: GET /api/admin/books/:bookId/one-click-solve/jobs
  → Add: POST /api/admin/books/:bookId/one-click-solve/jobs
  → Add: GET /api/admin/books/:bookId/one-click-solve/jobs/:jobId
  → Add: PUT /api/admin/books/:bookId/one-click-solve/candidates/:candidateId
  (append after existing routes — no semantic conflict)
```

**Estimated conflict resolution effort:** ~30 min (server route block append only)

---

### PR C-2 — Student-facing API + Mock (depends on PR C-1)

**Base:** `master` (after C-1 merged) → **head:** new branch `fix/r2-one-click-solve-student-api`

Files to include:

```
apps/AI-Stu-R1/src/studentClient.ts:
  → Add: import OneClickSolveCandidate from @ai-smartbook/schema
  → Add: getQuestionBank(bookId) function

apps/AI-adm-D1/src/server/index.ts:
  → Add: GET /api/student/books/:bookId/question-bank (uses oneClickSolve.repo)
  (C-1 registers the repo; this route depends on it)

packages/ai/src/providers/mock.provider.ts:
  → Add: if branch for "one-click-solve" system prompt mock response
```

**Student UI:** Do NOT port `MyQuestionBankPanel.tsx` from the branch. Master's version (using `SmartSolveImportJob`) is more advanced. The student question bank UI already works via master's implementation.

**`BookReaderPage.tsx`:** No change needed. Master already has `activeTab === "my-question-bank"` with `bookTitle` prop. If `getQuestionBank` per-book endpoint is needed by the existing `MyQuestionBankPanel`, update the panel to call both endpoints — but this is a scope decision for the feature owner.

**Estimated conflict resolution effort:** ~20 min (additive imports and function blocks)

---

## 5. Safest Merge Order

```
Step 1: PR C-1 (admin + infra)
  → cherry-pick clean files from 82246ac
  → manually append server routes (admin-side only)
  → typecheck AI-adm-D1 + build
  → merge

Step 2: PR C-2 (student API + mock)
  → depends on C-1 (oneClickSolve.repo must exist in master)
  → manually add studentClient.ts function + import
  → manually add /api/student/books/:bookId/question-bank route
  → manually add mock.provider.ts branch
  → typecheck both apps + build
  → merge

Step 3: (Optional) Update MyQuestionBankPanel in master to call
  getQuestionBank if per-book question loading is needed.
  This is a separate feature decision.
```

**What to skip entirely:**
- `apps/AI-Stu-R1/src/components/MyQuestionBankPanel.tsx` from branch (master's version supersedes it)
- `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` from branch (already integrated in master)
- `docs/r2/AI-SmartBook-R2-one-click-solve-book-my-question-bank-report-20260623.md` (optional: can be cherry-picked as-is)

---

## 6. Validation Checklist

### PR C-1 validation

```bash
pnpm --filter AI-adm-D1 typecheck       # must pass: 0 errors
pnpm --filter AI-adm-D1 build           # must pass
pnpm --filter @ai-smartbook/db typecheck # must pass (new repo + schema)
pnpm --filter @ai-smartbook/schema typecheck # must pass (new Zod types)

# Manual smoke (if server is running):
curl -s -X POST http://localhost:4300/api/admin/books/test123/one-click-solve/jobs
# Expected: 404 (book not found) — proves route exists and repo initializes
```

### PR C-2 validation

```bash
pnpm --filter AI-Stu-R1 typecheck       # must pass: 0 errors
pnpm --filter AI-Stu-R1 build           # must pass
pnpm --filter AI-adm-D1 typecheck       # must still pass

# Manual smoke (if server is running):
curl -s http://localhost:4300/api/student/books/test123/question-bank
# Expected: 404 (book not found) — proves route exists
```

### Secret check (before each commit)

```bash
grep -rn "AIza\|GOOGLE_API_KEY" packages/schema/src/ packages/db/src/ apps/AI-adm-D1/src/
# Expected: no matches
```

---

## 7. Summary for Agent 5

| Item | Decision |
|---|---|
| `feat/r2-one-click-solve-book-my-question-bank` branch | **Retain** — still has value (admin UI, DB layer) |
| Direct cherry-pick of `82246ac` as-is | **Block** — causes server startup crash |
| PR C-1 (admin + infra) | **Recommended** — 9 clean-apply files, ~30 min server route manual merge |
| PR C-2 (student API) | **Recommended** after C-1 — ~20 min additive changes |
| `MyQuestionBankPanel.tsx` from branch | **Discard** — master version supersedes it |
| DB migration | **Safe** — `IF NOT EXISTS` idempotent, no data loss risk |
| Timeline estimate | C-1 + C-2 completable in one focused session (~90 min total) |
| Owner decision needed | **Yes** — confirm whether per-book student `/question-bank` endpoint is required (vs existing global `/question-bank/jobs`) |
