# AI-SmartBook-R1

Modular SmartBook rebuild project.

## Apps

- `apps/AI-Stu-R1`: student frontend, old SmartBook Lite frontend UX reference, 1GB systemd deploy target.
- `apps/AI-adm-D1`: simple modular admin backend for smart books, PDF parsing, chapter building, admin AI QA.

## Packages

- `packages/schema`: shared TypeScript types and Zod schemas.
- `packages/db`: SQLite, Drizzle schema, repositories, migrations.
- `packages/ui`: shared UI components.
- `packages/book-core`: PDF parsing, content splitting, chapter building, book QA services.
- `packages/student-runtime`: static / sqlite-api / remote-api runtime for student frontend.
- `packages/ai`: admin-side AI provider abstraction.
- `packages/sync`: student data export/import.
- `packages/auth`: placeholder.
- `packages/quiz-core`: placeholder.

## Deployment

1GB student frontend target:

- Nginx
- Node.js 22
- SQLite
- systemd
- No PM2
- No Docker
- No MySQL / Redis / Qdrant / Ollama
