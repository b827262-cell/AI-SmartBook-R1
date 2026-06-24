# AI-SmartBook-R2｜Google AI Settings 實作紀錄

> Branch: `feat/r2-admin-google-ai-settings`  
> Commit: `17c4c66061e32be96b0db370734ea71fd0a89fb4`  
> Date: 2026-06-24  
> Executor: Claude Sonnet 4.6

---

## 1. 任務背景

依據 `docs/r2/AI-SmartBook-R2-google-ai-settings-claude-task-20260624.md` 的規格，在後台管理介面新增 Google AI Key 與預設模型設定功能，讓 AI 功能可由後台控制啟用狀態與模型選擇。

### 補充需求（執行中收到）

> 後台輸入 Google API Key 後不得要求重啟服務。  
> API Key 應儲存在後端 settings storage，AI 任務執行時即時讀取最新設定。  
> 若目前 Google AI client 是 server startup singleton，請改成依最新 settings lazy initialize / recreate client。  
> 儲存 API Key 後，AI 狀態應立即由紅燈變綠燈。

---

## 2. 實作前的程式碼探索

### 2.1 初始專案結構

```
apps/AI-adm-D1/
  src/
    main.tsx          # 25 行，靜態 HTML shell
    server/
      index.ts        # 20 行，僅有 GET /books 與 POST /qa (mock)
  index.html
  package.json        # 無 tsconfig.json
```

### 2.2 探索發現的關鍵事實

| 項目 | 狀態 |
|---|---|
| `tsconfig.json` | **不存在**，需新增才能執行 typecheck |
| `vite.config.ts` | 不存在，Vite 使用預設值（已有 dist 產物） |
| `apps/AI-adm-D1/data/` | 不存在，需建立 |
| `.gitignore` | 僅排除 `data/*.db`、`data/*.sqlite`，未排除 JSON 設定檔 |
| `packages/ai` | MockAiProvider singleton，無 Gemini 實作 |
| `packages/ui` | 已有 `<Card>` 與 `<Button>` 元件 |
| React Router | `react-router-dom@^7.0.0` 已在 dependencies |

---

## 3. 架構決策

### 3.1 設定儲存方式

選擇 **JSON 檔案**（`apps/AI-adm-D1/data/ai-settings.json`）：

- 專案目前無真實資料庫（`packages/db` 標記 TODO）
- 輕量、無外部依賴
- 檔案加入 `.gitignore` 防止意外提交

**安全原則：**
- Raw API Key 只存在伺服器端 JSON 檔
- GET 端點只回傳 `maskedGoogleApiKey`（如 `AIza...abcd`）
- 前端 state 中不長期保留 raw key
- 加入 TODO 標記未來加密（使用 `AI_SETTINGS_ENCRYPTION_KEY` env secret）

### 3.2 無重啟即生效

`ai-settings-store.ts` 的每個函式均呼叫 `readSettings()` 從磁碟讀取最新 JSON，**不使用模組層級的記憶體快取**：

```ts
// Always read from disk — no in-memory singleton, so saves take effect immediately
async function readSettings(): Promise<AiProviderSettings> {
  try {
    const raw = await readFile(SETTINGS_FILE, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}
```

AI 任務端點同樣每次呼叫 `getRawGoogleApiKey()` 取得最新 Key（lazy init），不依賴啟動時建立的 singleton。

### 3.3 前端模型選擇器

依任務規格分為兩個獨立 selector：

- **預設生成模型**：7 個生成型模型
- **預設 Embedding 模型**：2 個 embedding 模型

避免將 embedding 模型誤用於生成任務（後端 guard 需於後續 AI 整合時補充）。

---

## 4. 新增與修改的檔案

### 4.1 新增檔案

#### `apps/AI-adm-D1/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "types": ["node"]
  },
  "include": ["src"]
}
```

typecheck 所必需（原本缺少此檔）。

---

#### `apps/AI-adm-D1/src/server/ai-settings-store.ts`

伺服器端設定儲存模組，核心責任：

- `getAiSettings()` — 讀取設定，回傳 masked key（不含 raw）
- `saveAiSettings()` — 更新 key 與模型設定，寫回磁碟
- `clearGoogleApiKey()` — 刪除 key，重設狀態
- `testAiConnection()` — 連線測試（目前為 placeholder，待 Gemini SDK 整合）
- `getRawGoogleApiKey()` — 供 AI 任務端點即時讀取 key

```ts
export type AiProviderSettings = {
  provider: "google";
  hasGoogleApiKey: boolean;
  // TODO: encrypt at rest using AI_SETTINGS_ENCRYPTION_KEY env secret
  googleApiKeyRaw?: string;
  googleApiKeyUpdatedAt?: string;
  defaultModel: string;
  defaultEmbeddingModel: string;
  lastTestStatus?: "not_tested" | "success" | "failed";
  lastTestedAt?: string;
  lastTestError?: string;
  createdAt: string;
  updatedAt: string;
};
```

---

#### `apps/AI-adm-D1/src/api.ts`

前端 API 呼叫模組，對應四個後端端點：

```ts
getAiProviderSettings()         // GET  /api/admin/settings/ai-provider
saveAiProviderSettings(opts)    // PUT  /api/admin/settings/ai-provider
clearGoogleApiKey()             // DELETE /api/admin/settings/ai-provider/google-key
testAiConnection()              // POST /api/admin/settings/ai-provider/test
```

---

#### `apps/AI-adm-D1/src/components/GoogleAiSettingsCard.tsx`

主要 UI 元件，包含：

| UI 區塊 | 內容 |
|---|---|
| AI 狀態 badge | 紅/綠燈 + masked key 顯示 + 連線測試狀態 |
| API Key 輸入 | `type="password"`，不顯示 raw key |
| 預設生成模型 | `<select>` 含 7 個選項 |
| 預設 Embedding 模型 | `<select>` 含 2 個選項 |
| 操作按鈕 | 儲存設定、測試連線、清除 Key |
| Toast 通知 | 操作結果即時顯示，4 秒後自動消失 |

模型選項清單：

```ts
export const GOOGLE_AI_MODEL_OPTIONS = [
  { label: 'Gemini 3.1 Flash Lite', value: 'gemini-3.1-flash-lite', type: 'generate' },
  { label: 'Gemma 4 31B',           value: 'gemma-4-31b',           type: 'generate' },
  { label: 'Gemma 4 26B',           value: 'gemma-4-26b',           type: 'generate' },
  { label: 'Gemini Embedding 2',    value: 'gemini-embedding-2',    type: 'embedding' },
  { label: 'Gemini Embedding 1',    value: 'gemini-embedding-1',    type: 'embedding' },
  { label: 'Gemini 3.5 Flash',      value: 'gemini-3.5-flash',      type: 'generate' },
  { label: 'Gemini 3 Flash',        value: 'gemini-3-flash',        type: 'generate' },
  { label: 'Gemini 2.5 Flash',      value: 'gemini-2.5-flash',      type: 'generate' },
  { label: 'Gemini 2.5 Flash Lite', value: 'gemini-2.5-flash-lite', type: 'generate' },
]
```

---

#### `apps/AI-adm-D1/src/pages/AiSettingsPage.tsx`

路由頁面，掛載 `<GoogleAiSettingsCard />`，路徑為 `/admin/settings/ai`。

---

#### `apps/AI-adm-D1/src/pages/FilesPage.tsx`

檔案/PDF 管理頁，路徑為 `/admin/files`，包含：

- **AI 執行狀態區塊**：即時顯示紅/綠燈、預設模型、可執行步驟清單
- **一鍵完成區塊**：依 AI 狀態動態調整執行說明，無 Key 時自動略過 AI 步驟並顯示警告訊息

```
AI 狀態：🔴 未提供 Google API Key
可執行（不需 API Key）：拆書、建立章節、產生 Reader TOC…
需 API Key：AI 建立 Q&A、AI 萃取知識點、截圖問 AI、語意搜尋

AI 狀態：🟢 Google API Key 已提供
預設模型：Gemini 2.5 Flash
可執行（AI 功能）：AI 建立 Q&A、AI 萃取知識點…
```

---

### 4.2 修改檔案

#### `apps/AI-adm-D1/src/main.tsx`

從靜態 HTML shell 改寫為完整 React Router 應用：

```
BrowserRouter
  Layout（header 導覽列）
    Routes
      /                    → redirect → /admin/files
      /admin               → redirect → /admin/files
      /admin/files         → <FilesPage />
      /admin/settings/ai   → <AiSettingsPage />
```

---

#### `apps/AI-adm-D1/src/server/index.ts`

新增 AI 設定 API 路由，Q&A 端點改為 lazy init：

```
GET    /api/admin/settings/ai-provider            → getAiSettings()
PUT    /api/admin/settings/ai-provider            → saveAiSettings()
DELETE /api/admin/settings/ai-provider/google-key → clearGoogleApiKey()
POST   /api/admin/settings/ai-provider/test       → testAiConnection()
POST   /api/admin/books/:bookId/qa                → lazy getRawGoogleApiKey()
```

---

#### `.gitignore`

新增排除規則：

```gitignore
apps/AI-adm-D1/data/
.claude/
```

---

## 5. API 規格

### GET `/api/admin/settings/ai-provider`

Response（不含 raw key）：

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

### PUT `/api/admin/settings/ai-provider`

Request：

```json
{
  "googleApiKey": "<new-key-or-omit-to-keep>",
  "defaultModel": "gemini-2.5-flash",
  "defaultEmbeddingModel": "gemini-embedding-1"
}
```

Response：同 GET 格式。

### DELETE `/api/admin/settings/ai-provider/google-key`

Response：

```json
{ "hasGoogleApiKey": false }
```

### POST `/api/admin/settings/ai-provider/test`

Response：

```json
{ "ok": true, "message": "Google AI 連線測試成功（placeholder）。" }
```

---

## 6. 驗證結果

### 6.1 Typecheck

```
> tsc --noEmit
（無輸出，無錯誤）✅
```

### 6.2 Build

```
> vite build
✓ 29 modules transformed.
dist/assets/index-BW05t4oM.js  242.01 kB │ gzip: 77.23 kB
✓ built in 208ms  ✅
```

### 6.3 Secret Grep

```bash
grep -R "AIza" -n apps packages docs --exclude-dir=node_modules
# → 僅 docs/r2/*-claude-task-*.md 內的範例文字，無真實 Key ✅

grep -R "GOOGLE_API_KEY" -n apps packages docs --exclude-dir=node_modules
# → 同上，僅任務文件範例 ✅
```

### 6.4 Git Status

```
?? .pnpm-store/
?? ai-stu-r1-dist-a04232f.tar.gz
?? apps/AI-Stu-R1/dist-server/
?? test-pup/
```

未追蹤檔案均為既有暫存檔，非本次新增。

---

## 7. Commit 資訊

```
commit 17c4c66061e32be96b0db370734ea71fd0a89fb4
feat(r2): add admin google ai settings

- Add GET/PUT/DELETE/POST /api/admin/settings/ai-provider endpoints
- Server reads settings fresh from disk on every request (no restart needed)
- Raw API key is never returned to frontend; masked display only
- Red/green AI status indicator based on hasGoogleApiKey
- GoogleAiSettingsCard with key input, two model selectors, test and clear buttons
- AiSettingsPage at /admin/settings/ai
- FilesPage with AI availability status block and one-click workflow area
- tsconfig.json added; typecheck and build verified clean
- .gitignore updated to exclude apps/AI-adm-D1/data/ and .claude/
```

---

## 8. 未來 TODO

| 項目 | 說明 |
|---|---|
| Gemini SDK 整合 | `packages/ai` 加入 `GeminiAiProvider`，`testAiConnection()` 執行真實 API ping |
| 加密 at rest | 使用 `AI_SETTINGS_ENCRYPTION_KEY` env secret 加密 `googleApiKeyRaw` |
| Embedding model guard | 後端驗證：embedding 模型不得用於生成任務，反之亦然 |
| 實際 PDF 一鍵流程 | `FilesPage` 的按鈕目前為 UI placeholder，需串接真實 workflow API |
| 書本 CRUD UI | `/admin/books` 路由尚未實作 |
