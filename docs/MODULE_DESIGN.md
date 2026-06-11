# Module Design

## Layering rules

- App layer does not directly write SQL. SQL goes through `packages/db` repositories.
- React components do not call AI SDKs. AI goes through `packages/ai` on the server.
- PDF parsing goes through `packages/book-core`.
- API keys live only in the AI-adm-D1 server environment. AI-Stu-R1 has no keys.
- The 1GB student machine only runs Nginx + Node.js + SQLite + systemd.

## packages/db repositories

| Repo            | Methods |
| --------------- | ------- |
| `bookRepo`      | findAll, findPublished, findById, create, update |
| `bookFileRepo`  | create, findById, findByBookId, updateParseStatus |
| `bookContentRepo` | createMany, findByBookId, findByChapterId, searchByKeyword, linkChapter |
| `chapterRepo`   | findByBookId, findById, create, createMany, update |
| `chatRepo`      | createSession, addMessage, findMessages |
| `aiJobRepo`     | create, update, findByBookId |
| `qaLogRepo`     | create, findByBookId |

`createRepositories(db)` returns all of the above bound to one SQLite handle.

## packages/ai

- `createAiProvider(config?)` reads `AI_PROVIDER` / `AI_MODEL` / keys from env.
- Providers: `MockAiProvider` (default), `GeminiAiProvider`, `OpenAiCompatibleProvider`.
- If a real provider is selected without its key, it falls back to mock and warns.
- Prompt builders embed a task marker so the mock returns realistic structured
  output (chapter JSON, summaries, answers) — the full flow runs without keys.

## packages/book-core

`BookCoreContext = { repos, ai }` is injected into every service:

- `parsePdfToContents(filePath, bookId, fileId)` — pdf-parse v2, per-page text.
- `splitBookIntoChapters(ctx, bookId)` — AI outline → `book_chapters`.
- `buildChaptersFromContents(ctx, bookId)` — deterministic grouping + linkage.
- `summarizeChapter(ctx, bookId, chapterId)` — AI summary → `chapter.summary`.
- `askBookQuestion(ctx, bookId, question)` — keyword (CJK bigram) retrieval →
  AI answer → `book_qa_logs`.

## packages/student-runtime

- `createDataSource(config)` returns a `StudentDataSource` per `STU_RUNTIME_MODE`:
  `StaticDataSource`, `SqliteDataSource` (read-only), `RemoteDataSource`.
- `keywordChat(question, contents)` — local CJK-bigram retrieval, no AI call.
