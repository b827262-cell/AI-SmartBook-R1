# Architecture

AI-SmartBook-R1 uses a modular monorepo.

- AI-Stu-R1: student frontend, old SmartBook Lite frontend UX reference, 1GB deploy target.
- AI-adm-D1: simple modular admin backend, smart book management, PDF parsing, admin AI modules.
- packages/schema: shared types.
- packages/db: SQLite / repositories.
- packages/ui: shared UI components.
- packages/book-core: PDF parsing, book splitting, chapters, QA services.
- packages/ai: admin-side AI provider abstraction.
- packages/student-runtime: static / sqlite-api / remote-api modes.
- deploy/systemd + deploy/nginx: lightweight 1GB deployment.

Principle: 程式碼模組化，部署極簡化。
