# AI-SmartBook-R2｜後台 Google AI Key 與預設模型設定任務

> Executor: Claude  
> Date: 2026-06-24  
> Suggested branch: `feat/r2-admin-google-ai-settings`  
> Goal: 在後台新增 Google API Key 與預設模型設定，讓 AI 功能可由後台控制啟用狀態與模型選擇。

---

## 0. Execution Rules

1. GitHub / coding execution notes must be written in English.
2. Final termination report must be written in Traditional Chinese.
3. Termination report must include:
   - `success`
   - `failure`
   - `blocker`
   - `permission-halt`
   - current branch
   - current commit SHA
   - changed files
   - verification result
   - `git status --short`
4. Do **not** commit any of the following:
   - `.env`
   - API keys or secrets
   - DB/runtime data
   - logs
   - `.claude/`
   - uploaded local runtime files
5. Before commit, run secret checks to confirm Google API Key is not committed.

---

## 1. Background

The admin PDF / one-click workflow currently includes these steps:

1. Upload PDF
2. Manual Reader TOC / chapter creation
3. Generate JSON index
4. Set Q&A reference
5. One-click workflow:
   - Split book, default top-level
   - Create chapters, default page range `1 ~ 589`
   - Create Q&A
   - Create knowledge points

Only some AI-enhanced steps require Google API Key:

- AI generated Q&A
- AI knowledge point extraction / summarization
- screenshot-to-AI / image understanding
- semantic search / embedding
- OCR / scanned PDF understanding if enabled

Non-AI steps should continue working without a Google API Key.

---

## 2. Feature Goal

Add one backend-admin setting area for Google AI configuration:

1. Admin can save a Google API Key.
2. AI status is shown clearly:
   - Red light: no key provided
   - Green light: key provided
3. Admin can select a default model from a dropdown list.
4. The one-click PDF workflow can detect whether AI steps are available.
5. Raw API key must never be exposed back to frontend after saving.

---

## 3. UI Requirements

### 3.1 New Admin Setting Section

Add a new setting block under the backend admin settings area, preferably:

- `功能設定 > AI 模型設定`, or
- inside the existing `智能功能設定` page as a new card.

Suggested card title:

```text
Google AI 設定
```

Suggested helper text:

```text
提供 Google API Key 後，可啟用 AI 建立 Q&A、AI 萃取知識點、截圖問 AI 與語意搜尋等功能。
```

### 3.2 API Key Field

Add these controls:

| UI Control | Requirement |
|---|---|
| `Google API Key` input | password-style input; do not show raw key after save |
| `儲存 Key` button | saves new key |
| `清除 Key` button | removes stored key |
| `測試連線` button | optional but recommended |
| status badge | red/green indicator |

Status text:

```text
AI 狀態：🔴 未提供 Google API Key
AI 狀態：🟢 Google API Key 已提供
```

If a connection test exists, show a second line:

```text
連線測試：尚未測試 / 成功 / 失敗
```

Important distinction:

- `AI 狀態：綠燈` means a key is stored.
- `連線測試：成功` means the key has passed a live API test.

### 3.3 Model Dropdown

Add a default model selector.

Required display options:

```text
Gemini 3.1 Flash Lite
Gemma 4 31B
Gemma 4 26B
Gemini Embedding 2
Gemini Embedding 1
Gemini 3.5 Flash
Gemini 3 Flash
Gemini 2.5 Flash
Gemini 2.5 Flash Lite
```

Recommended internal shape:

```ts
const GOOGLE_AI_MODEL_OPTIONS = [
  { label: 'Gemini 3.1 Flash Lite', value: 'gemini-3.1-flash-lite', type: 'generate' },
  { label: 'Gemma 4 31B', value: 'gemma-4-31b', type: 'generate' },
  { label: 'Gemma 4 26B', value: 'gemma-4-26b', type: 'generate' },
  { label: 'Gemini Embedding 2', value: 'gemini-embedding-2', type: 'embedding' },
  { label: 'Gemini Embedding 1', value: 'gemini-embedding-1', type: 'embedding' },
  { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash', type: 'generate' },
  { label: 'Gemini 3 Flash', value: 'gemini-3-flash', type: 'generate' },
  { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash', type: 'generate' },
  { label: 'Gemini 2.5 Flash Lite', value: 'gemini-2.5-flash-lite', type: 'generate' },
]
```

If the current architecture can support two separate selectors, prefer:

1. `預設生成模型`
2. `預設 Embedding 模型`

If only one selector is implemented in this task, keep the full list above but add backend guards so embedding models are not used for Q&A generation.

### 3.4 One-click Workflow Status Display

On the `檔案 / PDF` page near the `一鍵完成` area, add a compact AI status indicator:

No key:

```text
AI 狀態：🔴 未提供 Google API Key
可執行：拆書、建立章節、建立基礎知識點
需 API Key：AI 建立 Q&A、AI 萃取知識點、截圖問 AI
```

Key provided:

```text
AI 狀態：🟢 Google API Key 已提供
預設模型：Gemini 2.5 Flash
可執行：拆書、建立章節、AI 建立 Q&A、AI 建立知識點
```

---

## 4. Backend Requirements

### 4.1 Storage

Store Google AI settings server-side only.

Recommended data shape:

```ts
type AiProviderSettings = {
  provider: 'google'
  hasGoogleApiKey: boolean
  googleApiKeyEncrypted?: string
  googleApiKeyUpdatedAt?: string
  defaultModel: string
  defaultEmbeddingModel?: string
  lastTestStatus?: 'not_tested' | 'success' | 'failed'
  lastTestedAt?: string
  lastTestError?: string
  createdAt: string
  updatedAt: string
}
```

Security requirements:

1. Never store raw key in frontend state longer than needed for save.
2. Never return raw key from any GET endpoint.
3. Never log the raw key.
4. Prefer encryption at rest using an existing server secret.
5. If encryption utilities do not exist, create a small server-only utility and require an env secret such as:

```bash
AI_SETTINGS_ENCRYPTION_KEY=<32-byte-secret>
```

If the project is currently simple/local and DB encryption is out of scope, use a safer minimum:

- Save the key in server-only config storage.
- Mask it in UI.
- Add a TODO comment for encryption-at-rest.
- Do not expose it to client.

### 4.2 Suggested API Endpoints

Add or adapt these endpoints under the admin server:

#### GET settings

```http
GET /api/admin/settings/ai-provider
```

Response must not include raw key:

```json
{
  "provider": "google",
  "hasGoogleApiKey": true,
  "maskedGoogleApiKey": "AIza...abcd",
  "defaultModel": "gemini-2.5-flash",
  "defaultEmbeddingModel": "gemini-embedding-1",
  "lastTestStatus": "success",
  "lastTestedAt": "2026-06-24T04:00:00.000Z"
}
```

#### Save settings

```http
PUT /api/admin/settings/ai-provider
```

Request:

```json
{
  "googleApiKey": "<new-key-or-empty>",
  "defaultModel": "gemini-2.5-flash",
  "defaultEmbeddingModel": "gemini-embedding-1"
}
```

Rules:

- If `googleApiKey` is omitted, keep existing key.
- If `googleApiKey` is provided and non-empty, replace existing key.
- If clear is requested, use DELETE endpoint below.

#### Clear key

```http
DELETE /api/admin/settings/ai-provider/google-key
```

Response:

```json
{
  "hasGoogleApiKey": false
}
```

#### Test connection

```http
POST /api/admin/settings/ai-provider/test
```

Response:

```json
{
  "ok": true,
  "message": "Google AI connection test passed."
}
```

If the project cannot perform a live call in local test mode, implement a graceful placeholder with clear message and do not block build.

---

## 5. Frontend Requirements

### 5.1 Components

Suggested new component:

```text
apps/AI-adm-D1/src/components/GoogleAiSettingsCard.tsx
```

or place inside the current settings page if the project has no shared component structure.

Component behavior:

1. Load settings on mount.
2. Show red/green AI status.
3. Show masked key status, never raw key.
4. Allow key input and save.
5. Allow model selection.
6. Allow clearing key.
7. Allow optional connection test.
8. Show error/success toast or inline alert.

### 5.2 Add to Admin Page

Add the settings card to one of these pages:

- Existing `智能功能設定` page, or
- New route/menu item `AI 模型設定` under `功能設定`.

Preferred visible label:

```text
AI 模型設定
```

### 5.3 Add Status to PDF One-click Page

On the admin `檔案 / PDF` page, add a compact status near the `一鍵完成` action bar.

The status should help admins understand whether Q&A / knowledge point AI generation can run.

---

## 6. One-click Workflow Integration

When running `一鍵完成`, split steps into two categories:

### 6.1 No-key steps

These must run without Google API Key:

```text
上傳 PDF
重新解析內容
拆書（預設頂級）
建立章節（首面 1 ～ 末面 589）
產生 Reader TOC
產生 JSON 索引
設定 Q&A Reference
建立基礎知識點（直接取用拆書後 JSON）
```

### 6.2 Key-required steps

These require Google API Key:

```text
AI 建立 Q&A
AI 萃取知識點
截圖問 AI
AI 筆記問答
語意搜尋 / Embedding
OCR / 掃描 PDF 圖像理解
```

If no key is provided:

- Do not crash.
- Continue non-AI steps.
- Show a warning message:

```text
已完成非 AI 流程；AI 建立 Q&A 與 AI 萃取知識點因未提供 Google API Key 而略過。
```

If key is provided:

- Run AI steps with selected default model.
- If selected model is an embedding model but the task needs generation, fallback to a generation model or show a clear validation error.

---

## 7. Validation Rules

1. API key field may be empty only when clearing or keeping existing key.
2. Model value must be one of the allowed options.
3. Embedding models should not be used for generation tasks.
4. Generation models should not be used for embedding tasks unless the existing provider supports it.
5. GET endpoint must return `hasGoogleApiKey`, not raw key.
6. UI must show red/green status based on `hasGoogleApiKey`.

---

## 8. Security Checklist

Before committing, run checks similar to:

```bash
git status --short
git diff --stat
grep -R "AIza" -n apps packages docs --exclude-dir=node_modules || true
grep -R "GOOGLE_API_KEY" -n apps packages docs --exclude-dir=node_modules || true
```

Expected:

- No real API key committed.
- Only placeholder names or env variable names are allowed.

Add or confirm `.gitignore` includes:

```gitignore
.env
.env.*
!.env.example
*.log
logs/
.claude/
apps/AI-adm-D1/data/
```

---

## 9. Suggested Files to Inspect

Start by locating existing admin routes, settings pages, and API modules:

```bash
find apps/AI-adm-D1/src -maxdepth 4 -type f | sort
find apps/AI-adm-D1/src -type f | grep -Ei "setting|appearance|api|book|file|pdf|qa|note|ai"
find apps/AI-adm-D1/src/server -type f | sort 2>/dev/null || true
find packages -type f | grep -Ei "schema|settings|ai|google|gemini" | head -100
```

Likely areas from prior work:

```text
apps/AI-adm-D1/src/api.ts
apps/AI-adm-D1/src/pages/tabs/FilesTab.tsx
apps/AI-adm-D1/src/server/index.ts
packages/schema/src/appearance.schema.ts
```

Do not assume exact file names; inspect first.

---

## 10. Testing / Verification

Run at minimum:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
```

If backend tests exist, run the relevant test command.

Manual verification checklist:

1. Open backend admin.
2. Go to AI model / smart feature settings page.
3. Confirm status is red when no key exists.
4. Enter a fake key and save.
5. Confirm GET response does not return raw key.
6. Confirm UI status turns green after saving.
7. Select each model option and save.
8. Clear key.
9. Confirm status returns to red.
10. Go to `檔案 / PDF` one-click area.
11. Confirm AI status block displays correctly.
12. Confirm no non-AI workflow is blocked by missing key.

---

## 11. Acceptance Criteria

This task is complete when all are true:

- [ ] Admin has a Google AI settings UI.
- [ ] Google API Key can be saved and cleared.
- [ ] API key is masked and never returned raw to frontend.
- [ ] Red/green AI status works.
- [ ] Model dropdown contains all required labels.
- [ ] Selected model persists after save.
- [ ] `檔案 / PDF` one-click workflow page shows AI availability status.
- [ ] Non-AI steps work without Google API Key.
- [ ] AI-required steps are clearly disabled/skipped/warned when no key exists.
- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] No secrets, DB data, logs, `.claude/`, or runtime files are committed.
- [ ] A Traditional Chinese termination report is provided.

---

## 12. Suggested Commit Messages

Use one or more focused commits:

```bash
git add <changed-files>
git commit -m "feat(r2): add admin google ai settings"
git commit -m "feat(r2): show ai status in pdf workflow"
git commit -m "docs(r2): record google ai settings verification"
```

---

## 13. Final Report Template

```text
## 最終報告（繁體中文）

- 狀態
  - success:
  - failure:
  - blocker:
  - permission-halt:

- current branch:
- current commit SHA:

- changed files:
  - ...

- 實作摘要:
  - ...

- Google API Key / AI 狀態:
  - 紅燈：未提供 Google API Key
  - 綠燈：已提供 Google API Key
  - raw key 是否回傳前端：否

- 模型下拉選單:
  - Gemini 3.1 Flash Lite
  - Gemma 4 31B
  - Gemma 4 26B
  - Gemini Embedding 2
  - Gemini Embedding 1
  - Gemini 3.5 Flash
  - Gemini 3 Flash
  - Gemini 2.5 Flash
  - Gemini 2.5 Flash Lite

- 驗證結果:
  - pnpm --filter AI-adm-D1 typecheck:
  - pnpm --filter AI-adm-D1 build:
  - secret grep:
  - manual browser verification:

- git status --short:
```
