# AI-SmartBook-R2 Question Bank JSON Import — Implementation Report

Date: 2026-06-22

## Status

**success**

---

## Branch

`feat/r2-question-bank-json-import`

Base branch: `feat/ai-smartbook-r2-modular-imports`

---

## Changed Files

| Status | File Path | Description |
|--------|-----------|-------------|
| Modified | `packages/db/src/schema.ts` | Added `questionBankImportJobs` SQLite table definition |
| Added | `packages/schema/src/questionBankImport.schema.ts` | Zod schemas for question bank import job, JSON item, file, and result |
| Modified | `packages/schema/src/index.ts` | Exported new question bank import schemas |
| Added | `packages/db/src/repositories/questionBankImport.repo.ts` | Repository: `create`, `findById`, `findRecent` |
| Modified | `packages/db/src/repositories/index.ts` | Registered `makeQuestionBankImportRepo` and `questionBankImports` repo |
| Modified | `apps/AI-adm-D1/src/server/index.ts` | Added 3 API routes for question bank import |
| Modified | `apps/AI-adm-D1/src/api.ts` | Added 3 admin API client methods |
| Added | `apps/AI-adm-D1/src/pages/QuestionBankImportPage.tsx` | Admin UI page for JSON upload, validation result, and job history |
| Modified | `apps/AI-adm-D1/src/App.tsx` | Registered `/admin/import/question-bank` route |
| Added | `docs/r2/AI-SmartBook-R2-question-bank-json-import-implementation-report-20260622.md` | This report |

---

## Schema Changes

### New SQLite table: `question_bank_import_jobs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Prefixed UUID (`qbi_...`) |
| `file_name` | TEXT | Uploaded file name |
| `status` | TEXT | `"pending"` / `"done"` / `"failed"` |
| `total_records` | INTEGER | Total parsed items |
| `valid_records` | INTEGER | Items that passed validation |
| `invalid_records` | INTEGER | Items that failed validation |
| `result_json` | TEXT (nullable) | JSON with error list |
| `error_message` | TEXT (nullable) | Top-level error if job failed |
| `created_at` | TEXT | ISO timestamp |

Table is append-only. No existing tables were modified.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/import/question-bank/jobs` | Upload JSON file (multipart `file` field), validate, persist job, return result |
| `GET` | `/api/admin/import/question-bank/jobs` | List recent 20 import jobs |
| `GET` | `/api/admin/import/question-bank/jobs/:jobId` | Get single job by ID |

### Accepted JSON formats

- Array format: `[{ question, options?, answer?, ... }, ...]`
- Object format: `{ questions: [...] }`
- Max file size: 5 MB

### Validation rules (per item)

- `question_number` or `questionNumber` or `number` — at least one must be present
- `question` — must be a non-empty string

---

## UI Changes

New page at `/admin/import/question-bank`:

- File picker accepting `.json` / `application/json`
- "驗證並匯入" button — uploads file, validates, and persists job record
- Shows success summary: total / valid / invalid counts
- Shows validation errors (first 20)
- Job history table showing recent imports with status, counts, and timestamp
- Graceful error display using `AdminErrorCard` with `description` prop

---

## DB Changes

- New table `question_bank_import_jobs` (not yet migrated to existing SQLite databases — migration SQL must be run or the table auto-created via `runMigrations()` if the migrate.ts handles new tables)
- No existing tables modified

---

## Scope Mapping Behavior

Not applicable for this module. This module imports raw question items and records validation results. No book/chapter scope mapping is performed in this phase.

---

## Validation Result

**TypeScript typecheck: PASS** (verified against the main checkout's `apps/AI-adm-D1` + installed `node_modules`)

No type errors in new code.

Errors fixed during implementation:
- `AdminErrorCard`: corrected prop from `message` to `description`
- `AdminCard`: removed unsupported `style` prop, used wrapper `<div>` instead
- `z.record(z.string())` → `z.record(z.string(), z.string())` (Zod v4 API)
- Repository `status` field: added `toJob()` cast helper (Drizzle infers `string`, Zod expects literal union)

---

## Build / Typecheck Result

- **TypeScript typecheck**: PASS (no errors, verified via `tsc --noEmit`)
- **Frontend build (vite)**: PASS — 140 modules transformed, 247ms, output ~408 kB JS + 14 kB CSS
- **Runtime — `runMigrations()`**: PASS — `question_bank_import_jobs` table auto-created on server start via `CREATE TABLE IF NOT EXISTS` in `migrate.ts`; table persists in `data/ai-smartbook-r1.db`

## Runtime API Verification

Server: `AI-adm-D1` on port 4300, DB: `data/ai-smartbook-r1.db`

| Test | Method | Path | Result |
|------|--------|------|--------|
| List jobs (empty) | GET | `/api/admin/import/question-bank/jobs` | `{"jobs":[]}` — PASS |
| Import 3 valid items (array format) | POST | `/api/admin/import/question-bank/jobs` | `status: "done", totalRecords: 3, validRecords: 3` — PASS |
| Import 1 valid item (wrapper format `{questions:[...]}`) | POST | same | `status: "done", totalRecords: 1, validRecords: 1` — PASS |
| Malformed JSON | POST | same | `400 {"error":"invalid JSON: could not parse file"}` — PASS |
| Get job by ID | GET | `/api/admin/import/question-bank/jobs/:id` | Full job record returned — PASS |
| Get non-existent job | GET | same | `404 {"error":"job not found"}` — PASS |
| List jobs (after imports) | GET | `/api/admin/import/question-bank/jobs` | 2 job records returned — PASS |
| DB persistence | — | SQLite direct query | 2 rows confirmed in `question_bank_import_jobs` — PASS |
| Admin frontend | GET | `http://localhost:5174/` | HTTP 200 — PASS |

---

## Commit SHA

`9bc0f78` (initial implementation)
`<verification commit SHA>` — see push result below

---

## Push Result

Initial push: `feat/r2-question-bank-json-import` (new branch) created on `b827262-cell/AI-SmartBook-R1`.
Verification update: see git log for second commit SHA.

---

## Limitations

1. ~~`runMigrations()` migration compatibility~~ — **verified**: `CREATE TABLE IF NOT EXISTS` in `migrate.ts` STATEMENTS array runs on server start; table is created automatically.
2. Import validates and records jobs but does NOT write question items to a persistent `QuestionItem` table (no such table exists yet). Full question persistence is outside this minimal slice.
3. Duplicate question number detection is not implemented (only missing number / empty question text are checked per-item).
4. No additional authentication beyond the existing admin server boundary.

---

## 建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
