# AI-SmartBook-R2 Agent Order — GPT-5.4 / Codex Google Knowledge Generation

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
Base branch：`fix/r2-admin-settings-files-integration`  
建議 GPT-5.4 / Codex 工作分支：`fix/r2-google-knowledge-generation`  
任務角色：GPT-5.4 / Codex 負責 Google API Key 建立知識點的核心流程、provider service、prompt、upsert、測試與驗證。

---

## 1. 背景

目前 R2 smart features review 顯示「知識點管理」尚未完成 runtime 實作。Claude 將負責 API 外殼、auth、validation、學生端設定串接與 smart features runtime blocker。GPT-5.4 / Codex 本輪專注於：

```text
sentence-index JSON → Google AI → knowledge points → idempotent upsert
```

本任務與 Claude 任務有關聯，但必須分支、分責任、避免互相覆蓋。

參考文件：

- `docs/r2/AI-SmartBook-R2-smart-features-review-report-20260624.md`
- `docs/r2/AI-SmartBook-R2-smart-features-claude-execution-plan-20260624.md`
- `docs/r2/AI-SmartBook-R2-agent-claude-smart-runtime-order-20260624.md`

---

## 2. 嚴格分工

GPT-5.4 / Codex 只負責下列範圍：

| 範圍 | 責任 |
|---|---|
| Google AI provider | 建立或整理可重用的 Google AI 呼叫 service |
| env key loading | 從 server-side env 讀取 Google API Key，不進前端 bundle |
| prompt design | 設計 sentence-index 產生知識點的 prompt |
| JSON parsing | 讀取 split-book / sentence-index JSON，切成可處理批次 |
| knowledge extraction | 由 AI 產生章節知識點 |
| schema validation | 驗證 AI 回傳 JSON 格式 |
| idempotent upsert | 將知識點寫入資料庫或現有儲存層，避免重複 |
| fallback | AI 失敗時提供可診斷錯誤，不破壞 UI |
| verification | 補 curl probe、sample run、secret / env check |

GPT-5.4 / Codex 不負責智能影音設定 runtime、不負責大改後台 UI、不負責重寫 Claude 的 auth / route 結構。

---

## 3. 不可碰撞邊界

為避免和 Claude 衝突，GPT-5.4 / Codex 應遵守：

| 項目 | 規則 |
|---|---|
| 智能影音設定 | 不修改，除非只修 shared type compile error |
| NotesHelpPage | 不修改，交由 Claude |
| 後台 UI 大改 | 不做；只補必要按鈕串接或狀態顯示 |
| Auth guard | 若 Claude 已建立 middleware，直接沿用，不重寫 |
| Knowledge API route | 若需新增 route，盡量新增 service function，route glue 與 Claude 對齊 |
| Google key | 僅 server-side 讀取，不輸出 raw key，不提交 `.env` |

---

## 4. 建議開分支

請 GPT-5.4 / Codex 從 base branch 開新分支：

```bash
git checkout fix/r2-admin-settings-files-integration
git pull origin fix/r2-admin-settings-files-integration
git checkout -b fix/r2-google-knowledge-generation
```

完成後 push：

```bash
git push origin fix/r2-google-knowledge-generation
```

---

## 5. 核心任務 A：Google AI provider service

### 5.1 需求

建立 server-side Google AI provider，不得讓 API Key 進入前端 bundle。

### 5.2 必做項目

| 功能 | 要求 |
|---|---|
| env 讀取 | 僅 server-side 讀取 Google API Key |
| availability check | 可檢查目前是否已設定 Key，但只回傳 boolean / masked status |
| generate JSON | 支援輸入 prompt，回傳 JSON-compatible 結果 |
| timeout | 設定合理 timeout，避免卡死 |
| retry | 可選擇加入簡單 retry，但不可無限重試 |
| error mapping | 將 provider error 轉成可診斷訊息 |
| no raw key | log / API response / report 不得含 raw key |

### 5.3 建議 service 介面

可依現有架構調整，概念如下：

```ts
type GenerateKnowledgeInput = {
  bookId: string;
  chapterId?: string;
  chapterTitle?: string;
  sourceText: string;
  sourceIndex?: string | number;
};

type GeneratedKnowledgePoint = {
  title: string;
  summary: string;
  keywords: string[];
  pageNumber?: number;
  chapterId?: string;
  confidence?: number;
  sourceRef?: string;
};
```

---

## 6. 核心任務 B：sentence-index JSON → 知識點

### 6.1 需求

從既有 split-book / sentence-index JSON 中萃取章節內容，呼叫 Google AI 生成知識點。

### 6.2 必做項目

| 功能 | 要求 |
|---|---|
| locate source | 找出 book 對應 sentence-index JSON |
| parse | 解析章節、頁碼、內容片段 |
| chunk | 依章節或 token 長度切批次 |
| prompt | 輸出穩定 JSON schema |
| validate | 驗證 AI 回傳欄位完整性 |
| normalize | 標題、keyword、sourceRef 正規化 |
| upsert | 寫入 knowledge points，不重複 |
| summary | 回報 created / updated / skipped / failed |

### 6.3 Prompt 要求

Prompt 應要求 AI 只回傳 JSON，不要混入 Markdown 說明。知識點欄位建議：

| 欄位 | 說明 |
|---|---|
| title | 知識點標題，繁體中文 |
| summary | 2 到 4 句重點摘要 |
| keywords | 3 到 8 個關鍵字 |
| chapterId | 若來源有章節 ID 則保留 |
| pageNumber | 若來源有頁碼則保留 |
| sourceRef | 來源段落或 sentence index |
| confidence | 0 到 1 的信心分數，可選 |

---

## 7. 核心任務 C：idempotent upsert

### 7.1 需求

同一份 sentence-index JSON 重複執行知識點生成，不可無限制新增重複資料。

### 7.2 建議 stable key

請依現有 DB / schema 選用下列策略之一：

```text
bookId + chapterId + normalizedTitle + sourceRef
```

或：

```text
bookId + sourceFile + sourceIndex + contentHash
```

若來源無 chapterId，則以 sourceRef / contentHash 補足。

### 7.3 API 回報格式

同步完成後需回報：

```ts
type KnowledgeGenerationSummary = {
  bookId: string;
  sourceFile?: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ sourceRef?: string; message: string }>;
};
```

---

## 8. 核心任務 D：與 Claude runtime shell 對接

Claude 會處理知識點管理 runtime 外殼。GPT-5.4 / Codex 應提供清楚的 service function，讓 Claude route 可以呼叫。

建議輸出：

| Service | 用途 |
|---|---|
| `generateKnowledgePointsForBook(bookId)` | 對整本書生成 / 更新知識點 |
| `generateKnowledgePointsForChapter(bookId, chapterId)` | 對單章生成 / 更新知識點 |
| `getKnowledgeGenerationStatus(bookId)` | 取得同步狀態 |
| `getKnowledgeStats(bookId)` | 取得統計資料 |

若現有專案命名不同，請遵守現有命名風格。

---

## 9. 安全要求

### 9.1 Secret

1. 實際 API Key 不得提交至 Git。
2. 實際 API Key 不得出現在 Markdown 報告。
3. 實際 API Key 不得出現在前端 bundle。
4. 實際 API Key 不得出現在 console log / API response。
5. `.env` 不得被 Git 追蹤。

### 9.2 Frontend boundary

前端只能看到：

```text
hasKey: true / false
maskedKey: optional masked status
provider: google
```

不可看到 raw key。

### 9.3 AI output safety

AI 產生的知識點需：

1. 以文字欄位保存。
2. 在 UI render 時不可直接執行 HTML。
3. 若支援 markdown，需 sanitize。
4. 長文字需限制長度，避免資料庫或 UI 爆量。

---

## 10. 驗證指令

### 10.1 Typecheck / Build

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

### 10.2 env tracking

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

### 10.3 provider availability probe

依實際 route 調整，預期只回傳 key 是否存在，不回傳 raw key：

```bash
curl -s http://127.0.0.1:4300/api/admin/settings/ai-provider | head -c 1000
```

### 10.4 knowledge generation probe

依實際 route 調整：

```bash
curl -s -X POST http://127.0.0.1:4300/api/admin/books/<bookId>/knowledge/generate | head -c 2000
```

若 route 尚未由 Claude 建立，請提供 service-level 測試或 node script 測試。

### 10.5 idempotency probe

同一個 bookId 重複執行兩次：

```text
第一次：created 可大於 0
第二次：created 不應再次大幅增加，應以 updated / skipped 為主
```

---

## 11. 建議測試資料

優先使用現有書籍：

```text
中級會計學（上）
51M320901全書-sentence-index.json
```

測試章節可先用：

```text
第一章 財務報導之觀念架構
第二章 財務報表的表達
```

若資料不存在，請在報告中明確列出實際找到的 source file 與 bookId。

---

## 12. 完成後輸出報告

請 GPT-5.4 / Codex 完成後新增：

```text
docs/r2/AI-SmartBook-R2-gpt54-google-knowledge-implementation-report-20260624.md
docs/r2/AI-SmartBook-R2-gpt54-google-knowledge-verification-report-20260624.md
```

報告格式：

```md
## GPT-5.4 Google Knowledge Generation Report

### Status
- success:
- failure:
- blocker:
- permission-halt:

### Git
- repository:
- branch:
- commit SHA:
- changed files:

### Implemented Scope
- Google AI provider:
- env key loading:
- sentence-index parser:
- prompt / JSON schema:
- knowledge generation:
- idempotent upsert:
- service integration:

### Verification
- typecheck:
- build:
- provider probe:
- generation probe:
- idempotency probe:
- env tracking:
- bundle secret check:

### Result Sample
- source file:
- bookId:
- chapter count:
- created:
- updated:
- skipped:
- failed:

### Remaining Risks
- risk 1:
- risk 2:

### Final Decision
- ready for Claude integration / not ready:
- reason:
```

---

## 13. Commit message 建議

若完成核心功能：

```text
fix(r2): add Google knowledge generation service
```

若只完成 service scaffold：

```text
feat(r2): scaffold Google knowledge generation pipeline
```

若只完成測試與文件：

```text
chore(r2): document Google knowledge generation checks
```

---

## 14. 最終整合順序

建議整合順序：

```text
1. Claude branch 先完成 smart runtime / auth / route shell
2. GPT-5.4 branch 完成 Google knowledge generation service
3. Claude branch merge 或作為 integration base
4. GPT-5.4 branch rebase 到 Claude branch
5. 解決 route / service 接口 conflict
6. 跑完整驗證
7. AGY / Claude final verification
8. 才重新判定 can merge
```

---

## 15. 結論

GPT-5.4 / Codex 的核心任務是把 Google AI Key 轉化為可控、可驗證、可重複執行的知識點生成 pipeline。請不要改動智能影音或大範圍 UI，避免與 Claude branch 衝突。完成後需提供可接入 Claude runtime shell 的 service 與驗證報告。
