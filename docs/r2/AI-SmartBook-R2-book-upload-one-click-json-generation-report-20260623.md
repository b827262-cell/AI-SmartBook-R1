# AI-SmartBook-R2 Implementation Report — Book Upload One-Click JSON Generation

Date: 2026-06-23  
Branch: `feat/r2-book-upload-one-click-json-generation`  
Base: `feat/r2-integrate-imports-notes`

---

## 1. Status

**COMPLETE** — all 4 JSON artifact types implemented, typecheck passes, builds pass.

---

## 2. Branch

```
feat/r2-book-upload-one-click-json-generation
```

---

## 3. Changed Files

| File | Change |
|---|---|
| `.gitignore` | Added `data/generated-json/` to ignore pattern |
| `packages/schema/src/bookJsonArtifact.schema.ts` | **NEW** — TypeScript interfaces for `BookJsonArtifact`, `BookJsonArtifactSummary`, `GenerateArtifactsResponse`, `ArtifactType` |
| `packages/schema/src/index.ts` | Added export for `bookJsonArtifact.schema` |
| `packages/db/src/schema.ts` | Added `bookJsonArtifacts` drizzle table definition |
| `packages/db/src/migrate.ts` | Added `CREATE TABLE IF NOT EXISTS book_json_artifacts` + index (non-destructive) |
| `packages/db/src/repositories/bookJsonArtifact.repo.ts` | **NEW** — `makeBookJsonArtifactRepo` with `create`, `findByBookId`, `findById`, `deleteByBookId`, `deleteById` |
| `packages/db/src/repositories/index.ts` | Registered new repo as `jsonArtifacts` in `Repositories` + `createRepositories` |
| `apps/AI-adm-D1/src/server/index.ts` | Added `GENERATED_JSON_ROOT` constant, `buildPageIndex`, `buildSentenceIndex`, `generateAllArtifacts` helpers, 4 API routes |
| `apps/AI-adm-D1/src/api.ts` | Added `generateJsonArtifacts`, `listJsonArtifacts`, `getJsonArtifactDownloadUrl`, `deleteJsonArtifact` |
| `apps/AI-adm-D1/src/pages/tabs/JsonArtifactsTab.tsx` | **NEW** — React tab component with generate button, artifact table, download links, import shortcuts |
| `apps/AI-adm-D1/src/pages/BookDetail.tsx` | Added `JSON 產生` tab and `json-artifacts` route |

---

## 4. API Endpoints Added

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/books/:bookId/json-artifacts/generate` | Generate all 4 artifacts, return summaries |
| `GET` | `/api/admin/books/:bookId/json-artifacts` | List existing artifacts for a book |
| `GET` | `/api/admin/books/:bookId/json-artifacts/:artifactId/download` | Download single artifact file |
| `DELETE` | `/api/admin/books/:bookId/json-artifacts/:artifactId` | Delete artifact record and file |

---

## 5. DB Migration Added

Yes — non-destructive `CREATE TABLE IF NOT EXISTS book_json_artifacts`:

```sql
CREATE TABLE IF NOT EXISTS book_json_artifacts (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

Also index: `CREATE INDEX IF NOT EXISTS idx_book_json_artifacts_book ON book_json_artifacts(book_id)`

Migration runs inside `runMigrations()` via the existing `STATEMENTS` array — idempotent and safe on existing DBs.

---

## 6. Storage Path

Runtime artifacts are written to:

```
data/generated-json/<bookId>/<filename>.json
```

This folder is gitignored via `data/generated-json/` added to `.gitignore`.

---

## 7. UI Behavior

- New tab **「JSON 產生」** appears in book detail navigation.
- Route: `/admin/books/:bookId/json-artifacts`
- Tab shows:
  - Explanation and warning (page-index / sentence-index are source/index files, not direct import targets)
  - **「一鍵產生 4 種 JSON」** button
  - Artifact status table with columns: 檔案類型 | 狀態 | 筆數 | 角色 | 產生時間 | 下載 | 下一步 | 刪除
  - Download buttons for each completed artifact
  - Direct links to `/admin/import/question-bank?bookId=...` and `/admin/import/smart-solve?bookId=...`
  - Quick-access shortcut panel at bottom

---

## 8. Sample Output Shapes

### page-index.json
```json
[
  {
    "bookId": "book_xxx",
    "pageNumber": 1,
    "pdfPage": 1,
    "text": "page text..."
  }
]
```

### sentence-index.json
```json
[
  {
    "id": "sent-0001",
    "bookId": "book_xxx",
    "pageNumber": 1,
    "chapterTitle": "第一章",
    "text": "sentence text..."
  }
]
```

### question-bank-candidates.json (v1 — empty with notice)
```json
{
  "source": "book_parse",
  "bookId": "book_xxx",
  "questions": [],
  "notice": "No rule-based questions detected. Use PDF Screenshot Ask AI or OCR pipeline to generate questions."
}
```

### smart-solve-candidates.json (chapter-based)
```json
{
  "source": "book_parse",
  "bookId": "book_xxx",
  "items": [
    {
      "externalId": "ss-001",
      "prompt": "請解釋「第一章」的主要概念。",
      "solution": "",
      "explanation": "",
      "scope": { "chapterTitle": "第一章", "pageStart": 1 },
      "tags": ["auto", "candidate"],
      "confidence": 0.5,
      "status": "candidate"
    }
  ]
}
```

---

## 9. Validation Results

```
pnpm --filter @ai-smartbook/db typecheck   → PASS (no errors)
pnpm --filter AI-adm-D1 typecheck          → PASS (no errors)
pnpm --filter AI-adm-D1 build             → PASS (147 modules, 243ms)
pnpm --filter AI-Stu-R1 build             → PASS (144 modules, 427ms)
```

---

## 10. Known Limitations

- `question-bank-candidates.json` is always empty in v1. Rule-based question extraction (detecting Q&A patterns in content text) is not implemented. Use PDF Screenshot Ask AI pipeline to generate real questions.
- `smart-solve-candidates.json` generates one stub item per chapter (prompts are generic templates). Books with no chapters will get an empty `items` array with a notice.
- `sentence-index.json` truncates each content row to 1000 characters; `page-index.json` to 2000 characters.
- Re-running generation deletes all previous artifact records for that book (clean slate per run).

---

## 11. Commit SHA

(To be filled after commit)

---

## 12. Push Result

(To be filled after push)

---

## 13. git status --short

```
M  .gitignore
M  apps/AI-adm-D1/src/api.ts
M  apps/AI-adm-D1/src/pages/BookDetail.tsx
M  apps/AI-adm-D1/src/server/index.ts
M  packages/db/src/migrate.ts
M  packages/db/src/repositories/index.ts
M  packages/db/src/schema.ts
M  packages/schema/src/index.ts
?? apps/AI-adm-D1/src/pages/tabs/JsonArtifactsTab.tsx
?? packages/db/src/repositories/bookJsonArtifact.repo.ts
?? packages/schema/src/bookJsonArtifact.schema.ts
```

---

## 14. Confirmation — No Sensitive Files Committed

- `.env` / `.env.*`: NOT committed
- `*.db` / `*.sqlite`: NOT committed
- `*.log`: NOT committed
- `.claude/`: NOT committed
- `data/generated-json/`: NOT committed (gitignored)
- `uploads/`: NOT committed (gitignored)
