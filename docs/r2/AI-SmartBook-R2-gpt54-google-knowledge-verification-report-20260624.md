## GPT-5.4 Google Knowledge Verification Report

### Status
- success: provider probe、admin/student typecheck/build、knowledge route、deterministic idempotency probe 完成。
- failure: full-book generation 在現有 Google quota 下出現 `429 rate limited`。
- blocker: 無硬性 blocker，但 full-book 大批次驗證受 quota 影響。
- permission-halt: 無。

### Git
- repository: `b827262-cell/AI-SmartBook-R1`
- branch: `fix/r2-google-knowledge-generation`
- commit SHA: `pending-before-commit`
- changed files:
  - `apps/AI-adm-D1/src/server/google-knowledge-service.ts`
  - `apps/AI-adm-D1/src/server/index.ts`
  - `packages/ai/src/prompts/knowledge-generation.prompt.ts`
  - `packages/ai/src/providers/gemini.provider.ts`
  - `packages/ai/src/providers/mock.provider.ts`
  - `packages/ai/src/index.ts`
  - `packages/schema/src/knowledgeGeneration.schema.ts`
  - `packages/schema/src/index.ts`
  - `packages/db/src/repositories/smartBookNote.repo.ts`

### Implemented Scope
- Google AI provider:
  - timeout / retry / error mapping
- env key loading:
  - server-side only
- sentence-index parser:
  - latest valid sentence-index selection + chunking
- prompt / JSON schema:
  - strict JSON-only knowledge prompt
  - zod validation
- knowledge generation:
  - book-level + chapter-level API/service
- idempotent upsert:
  - `smart_book_notes` by stable `sourceMessageId`
- service integration:
  - provider probe / status / stats / generate routes

### Verification
- typecheck:
  - `pnpm --filter AI-adm-D1 typecheck` pass
  - `pnpm --filter AI-Stu-R1 typecheck` pass
- build:
  - `pnpm --filter AI-adm-D1 build` pass
  - `pnpm --filter AI-Stu-R1 build` pass
- provider probe:
  - request:
    - `curl -s http://127.0.0.1:4567/api/admin/books/book_217a190a-3678-4959-97b4-6e3580b3fae3/knowledge/provider-probe`
  - result:
    - `{"provider":"google","hasKey":true,"maskedKey":"AIza...3ySE","model":"gemini-3.1-flash-lite"}`
- generation probe:
  - request:
    - `curl -s -X POST http://127.0.0.1:4567/api/admin/books/book_217a190a-3678-4959-97b4-6e3580b3fae3/knowledge/generate -H 'Content-Type: application/json' -d '{}'`
  - result:
    - service 可生成資料，但 full-book 在 quota 壓力下出現 `429`
    - early-stop 後 summary 為 `created=31 updated=3 skipped=0 failed=4`
- idempotency probe:
  - request 1:
    - `curl -s -X POST http://127.0.0.1:4567/api/admin/books/book_217a190a-3678-4959-97b4-6e3580b3fae3/knowledge/generate -H 'Content-Type: application/json' -d '{"maxChunks":1}'`
  - request 2:
    - same request repeated
  - result:
    - two runs both returned `created=0 updated=0 skipped=1 failed=0`
- env tracking:
  - `git ls-files | rg '(^|/)\\.env(\\.|$)'`
  - result: `.env.example`
- bundle secret check:
  - `rg -n "AIza|GEMINI_API_KEY|GOOGLE_API_KEY" apps/AI-adm-D1/dist apps/AI-Stu-R1/dist || true`
  - result: no matches

### Result Sample
- source file: `51MG122110全書-上架-sentence-index.json`
- bookId: `book_217a190a-3678-4959-97b4-6e3580b3fae3`
- chapter count: `7` after `POST /chapters/build`
- created: `0` in deterministic probe
- updated: `0` in deterministic probe
- skipped: `1` in deterministic probe
- failed: `0` in deterministic probe

### Remaining Risks
- risk 1: Google quota 不足時，full-book 執行結果會是 partial success，需要 Claude runtime shell 顯示 partial / retry 提示。
- risk 2: 現有部分 sentence-index 未帶 `chapterId`，chapter route 可能需搭配重新產生 sentence-index 才能準確縮小範圍。

### Final Decision
- ready for Claude integration / not ready: `ready for Claude integration`
- reason:
  - 核心 service 與 probe 已成立
  - deterministic idempotency 已驗證
  - 剩餘是 quota 與資料來源品質議題，Claude 可直接接 runtime shell
