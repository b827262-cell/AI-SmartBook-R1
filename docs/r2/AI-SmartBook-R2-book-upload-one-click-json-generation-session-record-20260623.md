# AI-SmartBook-R2 Session Record — One-Click JSON Generation Implementation

Date: 2026-06-23  
Branch: `feat/r2-book-upload-one-click-json-generation`  
Base branch: `feat/r2-integrate-imports-notes`  
Agent: Claude Sonnet 4.6

---

## 1. 任務來源

Task document:

```
docs/r2/AI-SmartBook-R2-book-upload-one-click-json-generation-task-20260623.md
```

目標：為書籍後台新增一鍵產生 4 種 JSON 的功能，包含 UI、API、DB migration、runtime 儲存路徑。

---

## 2. 執行步驟記錄

### Step 1 — 讀取任務文件

```bash
# 先查找任務文件（因 pull 前不存在）
find /home/b827262/project/AI-SmartBook-R2/docs -name "*.md"

# 更新 base branch 取得最新任務文件
git checkout feat/r2-integrate-imports-notes
git pull
```

發現任務文件在 pull 後才出現：`docs/r2/AI-SmartBook-R2-book-upload-one-click-json-generation-task-20260623.md`

---

### Step 2 — 探索現有程式碼結構

探索範圍：

| 路徑 | 目的 |
|---|---|
| `apps/AI-adm-D1/src/pages/BookDetail.tsx` | 了解現有 tab 結構 |
| `apps/AI-adm-D1/src/pages/tabs/OverviewTab.tsx` | 了解 tab 元件寫法 |
| `apps/AI-adm-D1/src/api.ts` | 了解前端 API client 模式 |
| `apps/AI-adm-D1/src/server/index.ts` | 了解後端 Express 路由模式 |
| `packages/db/src/migrate.ts` | 了解 migration 寫法（非破壞性） |
| `packages/db/src/schema.ts` | 了解 Drizzle ORM table 定義方式 |
| `packages/db/src/repositories/*.ts` | 了解 repository 模式 |
| `packages/db/src/repositories/index.ts` | 了解 Repositories 介面結構 |
| `packages/schema/src/index.ts` | 了解 schema package 匯出 |
| `.gitignore` | 了解現有排除規則 |

---

### Step 3 — 建立 Feature Branch

```bash
git checkout -b feat/r2-book-upload-one-click-json-generation
```

---

### Step 4 — 更新 .gitignore

**檔案**：`.gitignore`

新增一行：

```
data/generated-json/
```

確保執行期產生的 JSON 不會進入 Git。

---

### Step 5 — 新增 Schema 型別定義

**新檔案**：`packages/schema/src/bookJsonArtifact.schema.ts`

定義以下型別：

- `ArtifactType` — union of 4 artifact type strings
- `ARTIFACT_TYPES` — const array
- `BookJsonArtifact` — DB row interface
- `BookJsonArtifactSummary` — API response shape（含 `downloadUrl`）
- `GenerateArtifactsResponse` — POST generate response
- `artifactTypeSchema` — zod schema

**修改**：`packages/schema/src/index.ts`

```ts
export * from "./bookJsonArtifact.schema";
```

---

### Step 6 — 新增 Drizzle Table 定義

**修改**：`packages/db/src/schema.ts`

新增：

```ts
export const bookJsonArtifacts = sqliteTable("book_json_artifacts", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  artifactType: text("artifact_type").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  recordCount: integer("record_count").notNull().default(0),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
```

同時在 `DbSchema` type 與 `schema` 物件中加入 `bookJsonArtifacts`。

---

### Step 7 — 新增 DB Migration

**修改**：`packages/db/src/migrate.ts`

在 `STATEMENTS` 陣列末尾加入（非破壞性）：

```sql
CREATE TABLE IF NOT EXISTS book_json_artifacts (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

```sql
CREATE INDEX IF NOT EXISTS idx_book_json_artifacts_book ON book_json_artifacts(book_id)
```

---

### Step 8 — 新增 Repository

**新檔案**：`packages/db/src/repositories/bookJsonArtifact.repo.ts`

實作 `makeBookJsonArtifactRepo(db)` 函式，提供：

| 方法 | 說明 |
|---|---|
| `create(input)` | 建立一筆 artifact 記錄 |
| `findByBookId(bookId)` | 取得某本書所有 artifacts |
| `findById(id)` | 取得單一 artifact |
| `deleteByBookId(bookId)` | 刪除某本書所有 artifacts（重新產生時使用）|
| `deleteById(id)` | 刪除單一 artifact |

**修改**：`packages/db/src/repositories/index.ts`

- import `makeBookJsonArtifactRepo`
- export `bookJsonArtifact.repo`
- 在 `Repositories` 介面新增 `jsonArtifacts` 欄位
- 在 `createRepositories()` 中建立並回傳 `jsonArtifacts`

---

### Step 9 — 新增後端 API 路由

**修改**：`apps/AI-adm-D1/src/server/index.ts`

#### 新增 import

```ts
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync, createReadStream } from "node:fs";
```

```ts
import type { ArtifactType, BookJsonArtifact } from "@ai-smartbook/schema";
```

#### 新增常數

```ts
const GENERATED_JSON_ROOT = resolve("./data/generated-json");
```

#### 新增 helper 函式

| 函式 | 說明 |
|---|---|
| `toArtifactDownloadUrl(bookId, artifactId)` | 產生下載 URL |
| `artifactSummary(artifact, bookId)` | 轉換 DB row 為 API response shape |
| `buildPageIndex(bookId, contents)` | 從 `book_contents` 產生 page-index 陣列 |
| `buildSentenceIndex(bookId, contents, chapters)` | 從 `book_contents` + `book_chapters` 產生 sentence-index 陣列 |
| `generateAllArtifacts(bookId)` | 統一產生 4 種 artifacts、寫入磁碟、存入 DB |

`generateAllArtifacts` 邏輯：
1. 查 `repos.contents.findByBookId(bookId)` 取得內容
2. 查 `repos.chapters.findByBookId(bookId)` 取得章節
3. 建立 `data/generated-json/<bookId>/` 目錄（若不存在）
4. 呼叫 `repos.jsonArtifacts.deleteByBookId(bookId)` 清除舊記錄
5. 依序產生並寫入 4 個 JSON 檔案，每個都記錄到 DB

#### 新增 API routes

```
POST   /api/admin/books/:bookId/json-artifacts/generate
GET    /api/admin/books/:bookId/json-artifacts
GET    /api/admin/books/:bookId/json-artifacts/:artifactId/download
DELETE /api/admin/books/:bookId/json-artifacts/:artifactId
```

#### Typecheck 錯誤修正

第一次 typecheck 失敗：

```
error TS2345: Argument of type '... pageNumber?: number | null | undefined ...'
is not assignable to parameter of type '... pageNumber: number | null ...'
```

原因：`findByBookId` 回傳的 `BookContent` 型別中 `pageNumber` 為 `number | null | undefined`，而 helper 函式參數型別寫死為 `number | null`。

修正方式：將 helper 函式參數型別改為 `pageNumber?: number | null`（加上 `?`）。

---

### Step 10 — 新增前端 API Client 方法

**修改**：`apps/AI-adm-D1/src/api.ts`

新增型別匯入：

```ts
import type { BookJsonArtifactSummary, GenerateArtifactsResponse } from "@ai-smartbook/schema";
```

新增 `adminApi` 方法：

| 方法 | 說明 |
|---|---|
| `generateJsonArtifacts(bookId)` | POST generate |
| `listJsonArtifacts(bookId)` | GET list |
| `getJsonArtifactDownloadUrl(bookId, artifactId)` | 回傳下載 URL 字串（不發 request）|
| `deleteJsonArtifact(bookId, artifactId)` | DELETE |

---

### Step 11 — 新增 React Tab 元件

**新檔案**：`apps/AI-adm-D1/src/pages/tabs/JsonArtifactsTab.tsx`

UI 結構：

```
<div class="card">
  <h3>解析產物 / JSON 產生</h3>
  <p>說明文字 + 警告（page-index/sentence-index 不可直接匯入）</p>

  <button>一鍵產生 4 種 JSON</button>

  [錯誤訊息（若有）]

  <table>
    <thead>檔案類型 | 狀態 | 筆數 | 角色 | 產生時間 | 下載 | 下一步 | 刪除</thead>
    <tbody>（4 種 artifact 各一行）</tbody>
  </table>

  <div>快速入口：前往題庫匯入 | 前往智慧題解匯入</div>
</div>
```

角色標記邏輯：

- `page-index` / `sentence-index` → 顯示「索引檔（不可直接匯入）」（灰色）
- `question-bank-candidates` / `smart-solve-candidates` → 顯示「候選匯入檔」（藍色）

下一步連結格式：

```
/admin/import/question-bank?bookId=<bookId>&artifact=question-bank-candidates
/admin/import/smart-solve?bookId=<bookId>&artifact=smart-solve-candidates
```

---

### Step 12 — 更新 BookDetail.tsx

**修改**：`apps/AI-adm-D1/src/pages/BookDetail.tsx`

新增 import：

```ts
import { JsonArtifactsTab } from "./tabs/JsonArtifactsTab";
```

新增 tab 導覽：

```tsx
{tab("/json-artifacts", "JSON 產生")}
```

新增 route：

```tsx
<Route path="json-artifacts" element={<JsonArtifactsTab bookId={bookId} />} />
```

---

### Step 13 — 驗證

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter @ai-smartbook/db typecheck
# → PASS

PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
# → 第一次失敗（pageNumber 型別問題） → 修正後 PASS

PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
# → PASS（147 modules, 243ms）

PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
# → PASS（144 modules, 427ms）
```

---

### Step 14 — 建立實作報告

**新檔案**：`docs/r2/AI-SmartBook-R2-book-upload-one-click-json-generation-report-20260623.md`

---

### Step 15 — Commit 與 Push

```bash
git add [所有相關檔案，不含 .claude/]
git commit -m "feat(r2): add one-click book JSON artifact generation"
git push -u origin feat/r2-book-upload-one-click-json-generation
```

Commit SHA: `4ac2dcc11fb5df19f1b47b445ab025d05dd88a40`

補充更新報告後再 push：

```bash
git commit -m "docs(r2): update one-click JSON generation report with commit SHA and push result"
git push
```

Final SHA: `84a9c411`

---

## 3. 完整變更清單

### 新增檔案（5 個）

| 檔案 | 類型 |
|---|---|
| `packages/schema/src/bookJsonArtifact.schema.ts` | Schema 型別定義 |
| `packages/db/src/repositories/bookJsonArtifact.repo.ts` | Drizzle ORM repository |
| `apps/AI-adm-D1/src/pages/tabs/JsonArtifactsTab.tsx` | React UI 元件 |
| `docs/r2/AI-SmartBook-R2-book-upload-one-click-json-generation-report-20260623.md` | 實作報告 |
| `docs/r2/AI-SmartBook-R2-book-upload-one-click-json-generation-session-record-20260623.md` | 本檔案 |

### 修改檔案（8 個）

| 檔案 | 變更摘要 |
|---|---|
| `.gitignore` | 加入 `data/generated-json/` |
| `packages/schema/src/index.ts` | 匯出新 schema |
| `packages/db/src/schema.ts` | 新增 `bookJsonArtifacts` drizzle table |
| `packages/db/src/migrate.ts` | 新增 `book_json_artifacts` table + index |
| `packages/db/src/repositories/index.ts` | 註冊 `jsonArtifacts` repo |
| `apps/AI-adm-D1/src/server/index.ts` | 新增 4 API 路由與產生邏輯 |
| `apps/AI-adm-D1/src/api.ts` | 新增 4 個 API client 方法 |
| `apps/AI-adm-D1/src/pages/BookDetail.tsx` | 新增「JSON 產生」tab |

---

## 4. 遭遇問題與解決方式

| 問題 | 解決方式 |
|---|---|
| 任務文件在 base branch 上不存在 | 先 `git pull` 更新 base branch，取得最新 task 文件後再建立 feature branch |
| TypeScript 錯誤：`pageNumber` 型別不相容（`undefined` 不可賦值給 `number \| null`） | 將 helper 函式參數型別改為 `pageNumber?: number \| null`，加上可選標記 |

---

## 5. 確認事項

- [x] 未提交 `.env` / `.env.*`
- [x] 未提交 `*.db` / `*.sqlite`
- [x] 未提交 `*.log`
- [x] 未提交 `.claude/`
- [x] 未提交 `data/generated-json/`（已加入 `.gitignore`）
- [x] 未提交 `uploads/`
- [x] 所有 typecheck 通過
- [x] 所有 build 通過
