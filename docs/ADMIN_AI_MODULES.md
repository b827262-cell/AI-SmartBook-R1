# Admin AI Modules

AI-adm-D1 reaches AI providers only through `packages/ai`, using keys from the
admin server environment. Every AI action is recorded as a `book_ai_jobs` row
(status: pending → running → success/failed).

## Admin API (port 4300)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET   | `/api/admin/books` | list books |
| POST  | `/api/admin/books` | create book |
| GET   | `/api/admin/books/:bookId` | book + chapters + files |
| PATCH | `/api/admin/books/:bookId` | update book (incl. status) |
| POST  | `/api/admin/books/:bookId/files` | upload PDF (multipart `file`) |
| POST  | `/api/admin/books/:bookId/files/:fileId/parse` | parse PDF → contents |
| GET   | `/api/admin/books/:bookId/contents` | list parsed contents |
| GET   | `/api/admin/books/:bookId/chapters` | list chapters |
| POST  | `/api/admin/books/:bookId/chapters` | create chapter |
| PATCH | `/api/admin/books/:bookId/chapters/:chapterId` | update chapter |
| POST  | `/api/admin/books/:bookId/ai/split-book` | AI: outline → chapters |
| POST  | `/api/admin/books/:bookId/ai/build-chapters` | deterministic chapters from contents |
| POST  | `/api/admin/books/:bookId/chapters/:chapterId/ai/summarize` | AI: chapter summary |
| POST  | `/api/admin/books/:bookId/qa` | AI: knowledge QA over book |
| GET   | `/api/admin/books/:bookId/ai-jobs` | AI job history |

Uploads are stored under `uploads/books/:bookId/` (git-ignored).

## Modules

1. **Split book** — `splitBookIntoChapters`: builds an outline prompt from
   contents, parses the JSON chapter list, persists `book_chapters`.
2. **Build chapters** — `buildChaptersFromContents`: deterministic grouping of
   parsed pages, links contents to chapters (no AI call).
3. **Summarize chapter** — `summarizeChapter`: AI summary saved to `chapter.summary`.
4. **Knowledge QA** — `askBookQuestion`: CJK-bigram keyword retrieval over
   contents, AI answer, logged to `book_qa_logs`.

## Providers

`AI_PROVIDER = mock | gemini | openai-compatible` (default `mock`).
- `mock` returns deterministic, structured output — the entire flow runs with no key.
- `gemini` / `openai-compatible` perform real `fetch` calls when their key is set.

## Security

- API keys are backend-only (admin server env). Never committed, never bundled.
- No API key is synced to AI-Stu-R1; the student app contains no provider code.
- Missing key for a real provider safely falls back to the mock provider.
