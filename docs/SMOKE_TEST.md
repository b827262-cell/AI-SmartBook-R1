# Smoke Test

## 1. Build & data

```bash
pnpm install
pnpm db:migrate          # creates packages/db/data/ai-smartbook-r1.db
pnpm db:seed             # 1 published book, 1 chapter, 3 contents
pnpm -r build
pnpm -r typecheck
```

## 2. Run the admin API + UI

```bash
pnpm --filter AI-adm-D1 server:dev     # http://localhost:4300  (AI provider: mock)
pnpm --filter AI-adm-D1 dev            # http://localhost:5174  (proxies /api -> 4300)
```

Flow: create book → upload PDF → parse → AI 拆書 → AI 摘要 → 知識問答 → AI 任務.

## 3. Run the student API + UI

```bash
# point the student API at the seeded DB (or a synced student.db)
STU_DB_PATH=packages/db/data/ai-smartbook-r1.db pnpm --filter AI-Stu-R1 server:dev
pnpm --filter AI-Stu-R1 dev            # http://localhost:5173  (proxies /api -> 4310)

curl -s localhost:4310/api/student/books
curl -s -X POST localhost:4310/api/student/books/<id>/chat \
  -H 'content-type: application/json' -d '{"question":"智能書本是什麼"}'
```

## 4. 1GB bundle

```bash
pnpm --filter AI-Stu-R1 server:build   # -> apps/AI-Stu-R1/dist-server/stu-api.mjs
```

## 5. Scope / safety checks

```bash
rg "mysql|DATABASE_PROVIDER|credits|trial|PM2|Docker|Qdrant|Redis|Ollama" apps packages deploy docs || true
rg "GEMINI_API_KEY|OPENAI_API_KEY|AI_PROVIDER|OPENAI_BASE_URL" apps/AI-Stu-R1 || true
rg "getGenerativeModel|GoogleGenerativeAI|openai.chat|anthropic|generateContent" apps || true
rg "db\.select|db\.insert|db\.update|from\(" apps || true
```

Expected: matches only in `docs/` prohibition lists; no real key usage in
AI-Stu-R1; no AI SDK or raw SQL inside `apps/`.
