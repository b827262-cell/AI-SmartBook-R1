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

- **TypeScript typecheck**: PASS (no errors)
- **Build**: Not run (no `pnpm build` executed in this session — build environment requires the full service stack)
- **Runtime check**: Not run (no live services available in this session)

---

## Commit SHA

See git log after push.

---

## Push Result

See push command output.

---

## Limitations

1. The `question_bank_import_jobs` table is defined in schema but `runMigrations()` (in `packages/db/src/migrate.ts`) must support auto-creating new tables. If it is a strict migration system, a migration file is needed.
2. Import only validates and records the job — it does NOT write question items to any persistent questions table (no `QuestionItem` table exists yet). The full question persistence layer is outside this minimal slice.
3. Validation errors for duplicate question numbers are not yet detected (only missing number and missing question text are checked).
4. No authentication check on the import endpoints beyond the existing admin boundary.

---

## 建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
