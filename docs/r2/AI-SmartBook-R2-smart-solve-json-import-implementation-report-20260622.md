# AI-SmartBook-R2 Smart Solve JSON Import — Implementation Report

Date: 2026-06-22

## Status

**success**

---

## Branch

`feat/r2-smart-solve-json-import`

Base branch: `feat/ai-smartbook-r2-modular-imports`

Independent from `feat/r2-question-bank-json-import` (no cross-branch dependency).

---

## Changed Files

| File | Change |
|------|--------|
| `packages/schema/src/smartSolveImport.schema.ts` | NEW — Zod schemas for SmartSolveItem, SmartSolveScope, SmartSolveJsonFile, SmartSolveImportJob, SmartSolveImportItem |
| `packages/schema/src/index.ts` | Added `export * from "./smartSolveImport.schema"` |
| `packages/db/src/schema.ts` | Added `smartSolveImportJobs` and `smartSolveImportItems` Drizzle table definitions |
| `packages/db/src/migrate.ts` | Added `CREATE TABLE IF NOT EXISTS smart_solve_import_jobs`, `smart_solve_import_items`, and 2 indexes to STATEMENTS array |
| `packages/db/src/repositories/smartSolveImport.repo.ts` | NEW — `makeSmartSolveImportRepo(db)` factory with `createJob`, `createItems`, `findJobById`, `findJobsByBook`, `findItemsByJob` |
| `packages/db/src/repositories/index.ts` | Added import, re-export, interface entry, and factory call for `makeSmartSolveImportRepo` |
| `apps/AI-adm-D1/src/server/index.ts` | Added 3 Smart Solve routes + multer upload config |
| `apps/AI-adm-D1/src/api.ts` | Added 3 client methods: `importSmartSolveJson`, `listSmartSolveImportJobs`, `getSmartSolveImportJob` |
| `apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx` | NEW — React admin UI for Smart Solve JSON import |
| `apps/AI-adm-D1/src/App.tsx` | Added route `/admin/import/smart-solve` → `<SmartSolveImportPage />` |
| `docs/r2/AI-SmartBook-R2-smart-solve-json-import-implementation-report-20260622.md` | NEW — this report |

---

## Schema Changes

### Zod Schema (`packages/schema/src/smartSolveImport.schema.ts`)

- `smartSolveScopeSchema` — `{ bookId?, chapterId?, chapterTitle?, pageStart?, pageEnd? }`
- `smartSolveItemSchema` — `{ externalId?, title?, prompt(required), solution?, explanation?, skill?, difficulty?, scope?, tags?, metadata? }`
- `smartSolveJsonFileSchema` — union of array or `{ version?, source?, bookId?, scopes?, items[] }`
- `smartSolveImportJobSchema` — job record with mapped/unmapped counters
- `smartSolveImportItemSchema` — per-item record with scope and error JSON columns

### Drizzle Schema (`packages/db/src/schema.ts`)

Two new tables added:
- `smartSolveImportJobs`
- `smartSolveImportItems`

Both added to `DbSchema` type and `schema` export object.

---

## SQLite Migration Behavior

New `CREATE TABLE IF NOT EXISTS` statements added to the STATEMENTS array in `packages/db/src/migrate.ts`:

```sql
CREATE TABLE IF NOT EXISTS smart_solve_import_jobs (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_records INTEGER NOT NULL DEFAULT 0,
  valid_records INTEGER NOT NULL DEFAULT 0,
  mapped_records INTEGER NOT NULL DEFAULT 0,
  unmapped_records INTEGER NOT NULL DEFAULT 0,
  invalid_records INTEGER NOT NULL DEFAULT 0,
  result_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
CREATE TABLE IF NOT EXISTS smart_solve_import_items (...)
CREATE INDEX IF NOT EXISTS idx_ss_import_jobs_book ON smart_solve_import_jobs(book_id)
CREATE INDEX IF NOT EXISTS idx_ss_import_items_job ON smart_solve_import_items(job_id)
```

Migration is idempotent — safe to re-run against existing databases.

**Verified**: Direct SQLite test confirmed both tables were created and INSERT/SELECT CRUD works correctly.

---

## Repository Changes

`makeSmartSolveImportRepo(db)` factory returns:

- `createJob(input)` → `SmartSolveImportJob`
- `createItems(inputs[])` → `SmartSolveImportItem[]` (batch insert)
- `findJobById(id)` → `SmartSolveImportJob | null`
- `findJobsByBook(bookId, limit=20)` → ordered by `createdAt DESC`
- `findItemsByJob(jobId)` → all items for a job

Added `smartSolveImports` key to `Repositories` interface and `createRepositories()`.

---

## API Endpoints Added

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/books/:bookId/imports/smart-solve/jobs` | Upload JSON, validate, scope-map, persist job + items |
| `GET` | `/api/admin/books/:bookId/imports/smart-solve/jobs` | List recent import jobs (limit 20) |
| `GET` | `/api/admin/books/:bookId/imports/smart-solve/jobs/:jobId` | Get specific job with all items |

All endpoints return `404` if `bookId` does not match a known book.

---

## Admin UI Changes

New page: `apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx`

Route: `/admin/import/smart-solve`

UI features:
1. Book ID input field (required — scoped to the target book)
2. JSON file picker (up to 10 MB)
3. Validate & import button
4. Import result summary table (total / valid / mapped / unmapped / invalid)
5. Recent job history table per book

---

## Scope Mapping Behavior

The POST route performs per-item scope mapping using the book's existing chapters:

**Mapping priority (in order):**

1. `scope.chapterId` — direct lookup by chapter ID
2. `scope.chapterTitle` — case-insensitive exact title match
3. `scope.pageStart` — chapter whose `[pageStart, pageEnd]` range contains the item's `pageStart`
4. **Unmapped fallback** — recorded as `status: "unmapped"`, not an error

**Result summary includes:**
- `totalRecords`, `validRecords`, `mappedRecords`, `unmappedRecords`, `invalidRecords`

Items with empty/missing `prompt` are rejected as `invalid`. All other validation failures are schema-level and returned before any DB writes.

---

## Validation Examples

**Valid (array format):**
```json
[
  {"prompt": "Solve 2x + 3 = 7", "solution": "x=2", "scope": {"chapterTitle": "第一章"}},
  {"prompt": "Derivative of x²?", "solution": "2x"}
]
```
Response: `status: "done", totalRecords: 2, validRecords: 2`

**Valid (wrapper format):**
```json
{"version": "1.0", "items": [{"prompt": "What is √16?", "solution": "4"}]}
```
Response: `status: "done"`

**Malformed JSON:**
Response: `400 {"error": "invalid JSON: could not parse file"}`

**Invalid schema (`{"not_valid": true}`):**
Response: `400 {"error": "file schema validation failed", "issues": [...]}`

---

## Typecheck Result

- `@ai-smartbook/schema` typecheck: **PASS** (tsc --noEmit, 0 errors)
- `@ai-smartbook/db` typecheck: **PASS** (tsc --noEmit, 0 errors)
- `AI-adm-D1` (server + client + pages) typecheck: **PASS** (tsc --noEmit, 0 errors after fixing `String(req.params.bookId)` cast)

---

## Build Result

```
vite v8.0.16 building client environment for production...
✓ 140 modules transformed.
dist/index.html              0.39 kB │ gzip: 0.27 kB
dist/assets/index.css       14.22 kB │ gzip: 3.52 kB
dist/assets/index.js       409.74 kB │ gzip: 117.49 kB
✓ built in 246ms
```

**Frontend build: PASS**

---

## Runtime API Verification Result

Server: `AI-adm-D1` on port 4300, DB: `data/ai-smartbook-r1.db`

| # | Test | Result |
|---|------|--------|
| T1 | `GET /api/admin/books/:bookId/imports/smart-solve/jobs` (empty) | `{"jobs":[]}` — PASS |
| T2 | `GET` with nonexistent bookId | `404 {"error":"book not found"}` — PASS |
| T3 | `POST` array format (3 items) | `status:"done", totalRecords:3, validRecords:3` — PASS |
| T4 | `POST` wrapper format `{items:[...]}` | `status:"done", totalRecords:1` — PASS |
| T5 | `POST` malformed JSON | `400 {"error":"invalid JSON: could not parse file"}` — PASS |
| T6 | `POST` invalid schema | `400 {"error":"file schema validation failed"}` — PASS |
| T7 | `GET` jobs list after imports | 2 jobs returned — PASS |
| T8 | `GET` specific job with items | job + 3 items, `item.status:"unmapped"` — PASS |
| T9 | `GET` nonexistent jobId | `404 {"error":"job not found"}` — PASS |

---

## DB Persistence Verification Result

Direct SQLite query after API tests:

```
smart_solve_import_jobs: 2 rows
smart_solve_import_items: 4 rows
```

Confirmed: jobs and items persist correctly across API calls.

---

## Known Limitations

1. **Scope mapping is per-chapter only** — if the book has no chapters (`repos.chapters.findByBookId` returns empty array), all items are recorded as `unmapped`. This is expected behaviour (no chapters = nothing to map to).
2. **chapterTitle matching is exact (case-insensitive)** — fuzzy matching is not implemented.
3. **No bulk job cancellation** — once a job is `done`, items cannot be rolled back through the API.
4. **No write-through to a production `smart_solve_items` table** — this is an import/preview layer only. Actual tutor engine integration is out of scope.
5. **Duplicate externalId detection not implemented** — items with the same `externalId` in different jobs are not deduplicated.

---

## Commit SHA

See git log after push.

---

## Push Result

See push command output.

---

## `git status --short`

```
M apps/AI-adm-D1/src/App.tsx
M apps/AI-adm-D1/src/api.ts
M apps/AI-adm-D1/src/server/index.ts
M packages/db/src/migrate.ts
M packages/db/src/repositories/index.ts
M packages/db/src/schema.ts
M packages/schema/src/index.ts
? apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx
? packages/db/src/repositories/smartSolveImport.repo.ts
? packages/schema/src/smartSolveImport.schema.ts
? docs/r2/AI-SmartBook-R2-smart-solve-json-import-implementation-report-20260622.md
```

---

## .env and DB Files

- `.env` committed: **No**
- SQLite `.db` files committed: **No**
- Uploads, logs, backups: **No**
