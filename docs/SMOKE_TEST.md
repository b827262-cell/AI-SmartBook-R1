
# Smoke Test

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm -r build
pnpm -r typecheck
```

Check:

```bash
rg "mysql|DATABASE_PROVIDER|credits|trial|PM2|Docker|Qdrant|Redis|Ollama" apps packages deploy docs || true
rg "GEMINI_API_KEY|OPENAI_API_KEY|AI_PROVIDER|OPENAI_BASE_URL" apps/AI-Stu-R1 || true
rg "getGenerativeModel|GoogleGenerativeAI|openai.chat|anthropic" apps || true
rg "db\.select|db\.insert|db\.update|from\(" apps || true
```

