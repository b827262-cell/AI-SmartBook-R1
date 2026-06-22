# AI-SmartBook-R1 Phase 0.5 Implementation Report

## 1. Summary

Phase 0.5 智能書本 MVP is implemented on top of the existing scaffold (no
re-bootstrap). The full pipeline runs end to end with the default **mock** AI
provider — no API key required:

PDF upload → parse → AI 拆書 → AI 章節摘要 → 知識問答(QA log + AI job) on the
admin side; published-book read + keyword chat on the student side; and a
bundled 1GB systemd deployment path.

`pnpm -r build` and `pnpm -r typecheck` pass for all 11 buildable workspaces.

## 2. Created / Modified Files

- **schema**: `book/bookFile/bookContent/chapter/chat/aiJob/qaLog/sync.schema.ts` + `index.ts`.
- **db**: `schema.ts`, `client.ts`, `migrate.ts`, `seed.ts`, `repositories/*` (7 repos + factory), `index.ts`.
- **ai**: `provider.ts`, `ai-client.ts`, `providers/{mock,gemini,openai-compatible}.provider.ts`, `prompts/{split-book,build-chapters,summarize-chapter,book-qa}.prompt.ts`, `index.ts`.
- **book-core**: `pdf-parser.ts`, `content-splitter.ts`, `book-splitter.ts`, `chapter-builder.ts`, `chapter-summarizer.ts`, `book-qa.ts`, `context.ts`, `index.ts`.
- **student-runtime**: `config.ts`, `dataSource.ts`, `staticDataSource.ts`, `sqliteDataSource.ts`, `remoteDataSource.ts`, `chatEngine.ts`, `index.ts`.
- **sync**: `index.ts` (export/import/validate), `cli.ts`.
- **AI-adm-D1**: full Express API `src/server/index.ts`; React UI `src/App.tsx`, `api.ts`, `styles.css`, `pages/*`, `pages/tabs/*`; `vite.config.ts`, `tsconfig.json`.
- **AI-Stu-R1**: full `server/stu-api.ts`; React UI `src/App.tsx`, `studentClient.ts`, `styles.css`, `components/*`, `pages/*`; `server:build` esbuild bundle; `vite.config.ts`.
- **deploy**: updated `ai-stu-r1.service` (bundle path), `sync-student-db.sh`.
- **docs**: ARCHITECTURE, MODULE_DESIGN, ADMIN_AI_MODULES, STUDENT_1GB_SYSTEMD_DEPLOYMENT, SMOKE_TEST, this handoff.
- **root**: `tsconfig.base.json`, `.gitignore` (db/wal/dist-server).

## 3. SQLite Result

- `pnpm db:migrate` → 8 tables + indexes created idempotently.
- `pnpm db:seed` → 1 published book, 1 chapter, 3 contents (re-run safe).
- Tables: books, book_files, book_contents, book_chapters, chat_sessions,
  chat_messages, book_ai_jobs, book_qa_logs.

## 4. PDF Parse Result

- `parsePdfToContents` uses **pdf-parse v2** (per-page text). Empty paragraphs
  are dropped; long blocks are split on sentence boundaries; falls back to
  whole-document splitting when no pages are available.
- Wired through `POST /api/admin/books/:bookId/files/:fileId/parse`, which sets
  `parseStatus = parsed|failed` and stores `book_contents`.

## 5. Admin AI Modules Result

Verified via smoke run against the seeded DB (mock provider):
- split-book → `第一章 導論 / 第二章 核心概念 / 第三章 應用與總結`
- build-chapters → deterministic chapters with content linkage
- summarize → chapter summary persisted
- QA → CJK-bigram retrieval found 2 context chunks; answer + `book_qa_logs` written
- Every AI call recorded as a `book_ai_jobs` row (running → success/failed).

## 6. Student Frontend Result

- Routes `/books`, `/books/:id/read`, `/books/:id/chat`, served by clean
  components ported in spirit from the legacy UX (BookCard, ChatPanel,
  MessageBubble, ChatInput) — not a bulk copy.
- `studentClient` only calls `/api/student/*`; no API key, no AI SDK.
- `stu-api.ts` (sqlite-api mode) verified: `/books`, `/books/:id`,
  `/books/:id/contents`, `/books/:id/chat` (keyword answer with matched passages).

## 7. 1GB systemd Deployment Result

- `pnpm --filter AI-Stu-R1 server:build` → single `dist-server/stu-api.mjs`
  (esbuild bundle, `better-sqlite3` external). Verified running: serves the
  student API against a SQLite DB.
- systemd unit: `MemoryHigh=200M`, `MemoryMax=256M`,
  `NODE_OPTIONS=--max-old-space-size=128`, `EnvironmentFile=/etc/ai-stu-r1/student.env`,
  no PM2 / Docker.
- `sync-student-db.sh` builds bundle + publishes a published-only `student.db`
  via `packages/sync` and rsyncs to the target. Sync export/import verified
  (1 book / 3 contents into a clean student.db).

## 8. Validation Results

| Check | Result |
| ----- | ------ |
| `pnpm db:migrate` | ✅ ok |
| `pnpm db:seed` | ✅ ok |
| `pnpm -r typecheck` | ✅ all 11 workspaces Done |
| `pnpm -r build` | ✅ all Done (admin 245kB / student 237kB js) |
| admin AI flow smoke | ✅ split/build/summarize/QA |
| student sqlite-api smoke | ✅ books/contents/chat |
| sync export+import | ✅ 1 book, 3 contents |

## 9. Scope Check

- Forbidden-term grep matches are **only docs prohibition lists** plus the
  generated `docs/OPUS_ARCHITECTURE_REVIEW_PHASE_0_5.md`. No MySQL impl, no
  credits/trial logic (removed the stray `trial` role from `packages/auth`).
- `rg GEMINI_API_KEY|OPENAI_API_KEY|AI_PROVIDER|OPENAI_BASE_URL apps/AI-Stu-R1` → none.
- `rg getGenerativeModel|GoogleGenerativeAI|...|generateContent apps` → none (React never calls AI).
- `rg db.select|db.insert|db.update|from( apps` → none (apps use repositories only).
- Not done (per scope): Google OAuth, real RAG, quiz generation, credits/trial,
  MySQL, Redis/Qdrant/Ollama, Docker/PM2, VPS deploy, bulk legacy copy.

## 10. Git Status

See `git status --short`: tracked scaffold files modified + many new
implementation files (schema/db/ai/book-core/student-runtime sources, app
pages/components, `tsconfig.base.json`, `pnpm-lock.yaml`).

## 11. Diff Stat

34 tracked files changed, ~732 insertions / ~348 deletions, plus the new
untracked implementation files listed in §2.

## 12. Known Issues

- **book-core ↔ ai/db coupling**: the generated `scripts/boundary-check.sh`
  prefers `packages/book-core` to NOT depend on `@ai-smartbook/ai` / `db`. The
  task spec (§5) explicitly requires book-core to call `packages/ai` and read
  `book_contents`, and the build needs those deps, so they are kept. A future
  refactor could move orchestration into the admin app and reduce book-core to
  pure PDF/text logic.
- **DB path**: `migrate`/`seed` resolve `SQLITE_PATH`/`DATABASE_URL` relative to
  cwd; set `SQLITE_PATH` consistently across admin/sync processes (documented in
  SMOKE_TEST / deploy).
- Gemini / OpenAI-compatible providers do real `fetch` but are unverified
  without live keys (mock is the default and fully exercised).
- `remote-api` student mode is a thin placeholder for a future central server.

## 13. Commit Recommendation

All validation passes. Suggested commit:

```
feat: implement smartbook MVP with SQLite PDF parsing and admin AI modules
```
