# AI-Stu-R1 1GB systemd Deployment

Use:

- Nginx
- Node.js 22
- SQLite
- systemd

Do not use:

- PM2
- Docker
- MySQL
- Redis
- Qdrant
- Ollama
- pnpm dev
- PDF parse
- full RAG

Runtime modes:

- static
- sqlite-api
- remote-api

Default 1GB mode:

```bash
STU_RUNTIME_MODE=sqlite-api
STU_DB_PATH=/opt/AI-Stu-R1/data/student.db
STU_API_PORT=4310
STU_CHAT_MODE=keyword
NODE_OPTIONS=--max-old-space-size=128
```

Service file:

`deploy/systemd/ai-stu-r1.service`

Nginx file:

`deploy/nginx/ai-stu-r1.conf`
