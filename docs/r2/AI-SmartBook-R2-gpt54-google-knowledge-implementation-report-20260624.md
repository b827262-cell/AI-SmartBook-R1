## GPT-5.4 Google Knowledge Generation Report

### Status
- success: Google knowledge generation service、prompt、schema validation、route glue、masked provider probe、server-side key loading、idempotent note upsert 已完成。
- failure: 無結構化 chapterId 的既有 sentence-index 無法直接做高品質單章切片；需配合重新產生帶 chapter mapping 的 sentence-index。
- blocker: 無。
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
  - 沿用 `GeminiAiProvider`，補上 timeout、有限 retry、HTTP error mapping。
- env key loading:
  - 僅 server-side 透過 `ai-settings-store.ts` 讀取已儲存 key / env fallback。
- sentence-index parser:
  - 讀取 `book_files.role=json_index`，挑選 `level=sentence` 的有效 index。
  - 依 `pageStart/pageEnd/chapterId` 建批次。
- prompt / JSON schema:
  - 新增 `buildKnowledgeGenerationPrompt()`
  - 新增 `generatedKnowledgePointSchema`、`knowledgeGenerationSummarySchema`、`knowledgeGenerationStatusSchema`
- knowledge generation:
  - 新增 `generateKnowledgePointsForBook()`
  - 新增 `generateKnowledgePointsForChapter()`
  - 新增 `getKnowledgeGenerationStatus()` / `getKnowledgeStats()`
- idempotent upsert:
  - 使用 `smart_book_notes`
  - 以 `sourceMessageId = knowledge-point:<stableKey>` 實作 upsert
  - 穩定 key 由 `bookId + chapterId + sourceRef + normalizedTitle` 雜湊而成
- service integration:
  - 新增 route:
    - `GET /api/admin/books/:bookId/knowledge/provider-probe`
    - `GET /api/admin/books/:bookId/knowledge/status`
    - `GET /api/admin/books/:bookId/knowledge/stats`
    - `POST /api/admin/books/:bookId/knowledge/generate`
    - `POST /api/admin/books/:bookId/chapters/:chapterId/knowledge/generate`
  - 一鍵流程的「建立知識點」步驟已切換為共用 service。

### Verification
- typecheck:
  - `pnpm --filter AI-adm-D1 typecheck` pass
  - `pnpm --filter AI-Stu-R1 typecheck` pass
- build:
  - `pnpm --filter AI-adm-D1 build` pass
  - `pnpm --filter AI-Stu-R1 build` pass
- provider probe:
  - `GET /api/admin/books/book_217a190a-3678-4959-97b4-6e3580b3fae3/knowledge/provider-probe`
  - 回傳 `provider=google`, `hasKey=true`, masked key, model
- generation probe:
  - 整本書 probe 可執行，但 Google quota 會在多批次後回 `429`
  - 已加上 early-stop，避免持續打滿整本
- idempotency probe:
  - 加入 `maxChunks` 診斷參數後，對同一本書重跑 `maxChunks=1` 兩次均得到 `created=0, updated=0, skipped=1, failed=0`
- env tracking:
  - tracked `.env` 僅有 `.env.example`
- bundle secret check:
  - `apps/AI-adm-D1/dist`、`apps/AI-Stu-R1/dist` 未找到 `AIza` / `GOOGLE_API_KEY` / `GEMINI_API_KEY`

### Result Sample
- source file: `51MG122110全書-上架-sentence-index.json`
- bookId: `book_217a190a-3678-4959-97b4-6e3580b3fae3`
- chapter count: `0` before chapter build, `7` after PDF outline build
- created:
  - full-book capped probe: `31`
  - deterministic `maxChunks=1`: `0`
- updated:
  - full-book capped probe: `3`
  - deterministic `maxChunks=1`: `0`
- skipped:
  - deterministic `maxChunks=1`: `1`
- failed:
  - full-book capped probe: `4`

### Remaining Risks
- risk 1: Google quota / billing 受限時，整本 sentence-index 仍可能只完成前段批次；目前已早停但尚未做背景排程或 resume cursor。
- risk 2: 若 sentence-index 缺少 `chapterId` 且章節標題不可對應，單章生成會受限於 page mapping 品質。

### Final Decision
- ready for Claude integration / not ready: `ready for Claude integration`
- reason:
  - service 與 route 已可直接接 runtime shell
  - provider / schema / upsert / probe 已可驗證
  - 剩餘問題集中在 quota 與來源資料品質，不是接口缺失
