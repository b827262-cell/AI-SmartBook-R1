# Architecture

AI-SmartBook-R1 is a modular pnpm monorepo. Application layers stay thin;
all data and AI logic lives in shared packages.

```
apps/
  AI-adm-D1     Admin: book CRUD, PDF parse, AI split/summarize/QA (Express + React)
  AI-Stu-R1     Student: read + chat, 1GB systemd deploy target (Express + React)
packages/
  schema        Zod schemas + inferred TypeScript types (single source of truth)
  db            SQLite + Drizzle: schema, client, migrate, seed, repositories
  ai            AI provider abstraction (mock | gemini | openai-compatible) + prompts
  book-core     PDF parsing, book splitting, chapter building/summary, book QA
  student-runtime  static / sqlite-api / remote-api data sources + keyword chat engine
  sync          Export published books from admin DB -> student.db
  ui            Shared React primitives
  auth, quiz-core  Phase 0.5 placeholders
deploy/         systemd unit, nginx conf, install/sync/healthcheck scripts
```

## Data flow

```
PDF --parsePdfToContents--> book_contents
                                |
                  splitBookIntoChapters (AI) --> book_chapters (+ summaries)
book_contents --keyword retrieval--> AI provider --> answer --> book_qa_logs
```

## Process / runtime layout

- **Admin** (`AI-adm-D1`): React SPA + Express API (`/api/admin/*`) on port 4300.
  The API holds the only AI provider and the only writable SQLite handle.
- **Student** (`AI-Stu-R1`): React SPA + Express API (`/api/student/*`) on port 4310.
  Read-only. In the 1GB `sqlite-api` mode it answers chat with a local keyword
  engine — no external AI call, no API key.
- **Sync**: published books are exported from the admin DB and imported into a
  standalone `student.db` shipped to the 1GB host.

## Boundaries (enforced)

- App layer never writes SQL directly — it calls `packages/db` repositories.
- PDF parsing always goes through `packages/book-core`.
- AI access always goes through `packages/ai`; React never imports a provider.
- API keys exist only in the admin server environment, never in the student app.

Principle: 程式碼模組化，部署極簡化。
