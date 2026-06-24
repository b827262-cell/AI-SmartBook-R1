# AI-SmartBook-R2 Two-Agent Parallel Execution Order

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
Base branch：`fix/r2-admin-settings-files-integration`  
目的：先下達 Agent 1 與 Agent 2 的並行任務。Agent 3 final integration / knowledge100 / Reader TOC fallback 暫不啟動，等本文件兩個分支完成後再執行。

---

## 1. 執行總表

| Agent | 建議模型 | 分支 | 任務定位 | 是否可並行 |
|---|---|---|---|---|
| Agent 1 | Claude | `fix/r2-smart-features-runtime-claude` | smart features runtime / 安全 / auth / UI glue | 可並行 |
| Agent 2 | GPT-5.4 / Codex | `fix/r2-google-knowledge-generation` | Google API Key → 知識點生成核心 service | 可並行 |

---

## 2. 共同規則

兩個 agent 均需遵守：

1. 不得提交 `.env`。
2. 不得提交任何 API key、DB dump、runtime upload data、logs、temporary test folder。
3. 不得將 server-side secret 打包進前端 bundle。
4. 不得互相覆蓋對方責任範圍。
5. 所有最終報告以繁體中文輸出。
6. 若遇到權限不足或無法判定安全性，立即停止並回報 `permission-halt` 或 `blocker`。
7. 任何 route、schema、service 變更都要附上 typecheck / build / runtime probe 結果。

---

## 3. Agent 1：Claude 任務單

### 3.1 角色

Claude 負責 smart features runtime、安全性、auth guard、UI glue 與資料流落地。

### 3.2 工作分支

```bash
git fetch origin
git checkout fix/r2-admin-settings-files-integration
git pull origin fix/r2-admin-settings-files-integration
git checkout -b fix/r2-smart-features-runtime-claude
```

若遠端分支已存在：

```bash
git checkout fix/r2-smart-features-runtime-claude
git pull origin fix/r2-smart-features-runtime-claude
```

### 3.3 主要參考文件

```text
docs/r2/AI-SmartBook-R2-agent-claude-smart-runtime-order-20260624.md
docs/r2/AI-SmartBook-R2-smart-features-claude-execution-plan-20260624.md
docs/r2/AI-SmartBook-R2-smart-features-review-report-20260624.md
```

### 3.4 Claude 負責範圍

| 項目 | 說明 |
|---|---|
| 智能影音設定 runtime | API / CRUD / 啟用停用 / 刪除 / 學生端章節顯示 |
| 知識點管理 runtime 外殼 | API route / sync 入口 / stats / preview / settings 保存 |
| NotesHelpPage localhost | 移除 hardcoded localhost，改相對路徑或共用 API client |
| Q&A 冪等性 | 重複新增 / 同步不可造成資料暴增 |
| XSS / URL validation | 後台輸入與學生端顯示需安全處理 |
| Auth guard | 後台寫入、刪除、同步類 API 需權限保護 |
| UI glue | 後台設定需正確影響學生端顯示 |

### 3.5 Claude 不負責範圍

Claude 不要實作以下內容，避免與 Agent 2 衝突：

```text
Google AI provider service
Google knowledge generation prompt
sentence-index → AI knowledge extraction core
Google API Key loading strategy
AI 回傳 JSON schema validation core
```

若需要預留接口，請以 adapter / service interface 方式處理，不要寫死 Agent 2 的實作細節。

### 3.6 Claude 驗證指令

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
grep -R "localhost" apps packages --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git || true
```

依實際 route 執行：

```bash
curl -i http://127.0.0.1:4300/api/admin/smart-videos
curl -i http://127.0.0.1:4300/api/admin/knowledge-points
curl -i http://127.0.0.1:4300/api/student/books
```

### 3.7 Claude 完成後需產出

請新增或更新：

```text
docs/r2/AI-SmartBook-R2-claude-smart-runtime-implementation-report-20260624.md
docs/r2/AI-SmartBook-R2-claude-smart-runtime-verification-report-20260624.md
docs/r2/AI-SmartBook-R2-claude-smart-runtime-session-report-20260624.md
```

### 3.8 Claude 回報格式

```md
## Claude Smart Runtime Final Report

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

### Fixed Scope
- smart video runtime:
- knowledge runtime shell:
- NotesHelpPage localhost hardcode:
- Q&A idempotency:
- XSS / URL validation:
- auth guard:

### Verification
- typecheck:
- build:
- route smoke:
- API smoke:
- XSS probe:
- auth probe:
- idempotency probe:
- env tracking:

### Final Decision
- can merge / cannot merge:
- reason:
```

---

## 4. Agent 2：GPT-5.4 / Codex 任務單

### 4.1 角色

GPT-5.4 / Codex 負責 Google API Key → 知識點生成核心 service。

核心鏈路：

```text
sentence-index JSON → Google AI → knowledge points → idempotent upsert
```

### 4.2 工作分支

```bash
git fetch origin
git checkout fix/r2-admin-settings-files-integration
git pull origin fix/r2-admin-settings-files-integration
git checkout -b fix/r2-google-knowledge-generation
```

若遠端分支已存在：

```bash
git checkout fix/r2-google-knowledge-generation
git pull origin fix/r2-google-knowledge-generation
```

### 4.3 主要參考文件

```text
docs/r2/AI-SmartBook-R2-agent-gpt54-google-knowledge-order-20260624.md
docs/r2/AI-SmartBook-R2-smart-features-claude-execution-plan-20260624.md
docs/r2/AI-SmartBook-R2-smart-features-review-report-20260624.md
```

### 4.4 GPT-5.4 / Codex 負責範圍

| 項目 | 說明 |
|---|---|
| Google AI provider | server-side provider service |
| env key loading | 僅 server-side 讀取，不進前端 bundle |
| sentence-index parser | 解析 split-book / sentence-index JSON |
| chunking | 按章節或 token 長度切批次 |
| prompt / JSON schema | 要求 AI 回傳穩定 JSON |
| knowledge generation | 產生知識點 title / summary / keywords / sourceRef |
| idempotent upsert | 寫入 smart_book_notes 或既有 knowledge 儲存層，不重複 |
| provider probe | 可檢查 provider 狀態，不回傳 raw key |
| status / stats / generate routes | 若 route 已由 Claude 提供，則只補 service；若不存在，先提供最小 route 或測試 script |
| 一鍵流程串接 | 知識點生成步驟改用共用 service |

### 4.5 GPT-5.4 / Codex 不負責範圍

不要處理以下內容，避免與 Claude 衝突：

```text
智能影音設定 runtime
NotesHelpPage localhost 修正
大範圍後台 UI 改版
auth guard middleware 重寫
XSS policy 大改
```

若需要使用 auth 或 validation，請沿用 Claude 或現有專案既有結構。

### 4.6 Provider 安全要求

1. API Key 只存在 `.env` 或部署環境變數。
2. API Key 不得出現在 GitHub、Markdown、log、API response、前端 bundle。
3. 前端最多只可知道 `hasKey: true / false` 或 masked status。
4. provider error 需轉成可診斷訊息，但不得包含 secret。
5. Gemini / Google provider 需有 timeout、retry、error mapping。

### 4.7 GPT-5.4 / Codex 驗證指令

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

Provider probe，依實際 route 調整：

```bash
curl -s http://127.0.0.1:4300/api/admin/settings/ai-provider | head -c 1000
```

Knowledge generation probe，依實際 route 調整：

```bash
curl -s -X POST http://127.0.0.1:4300/api/admin/books/<bookId>/knowledge/generate | head -c 2000
```

Idempotency probe：

```text
同一 bookId 連跑兩次。
第一次 created 可大於 0。
第二次 created 不應再次大幅增加，應以 updated / skipped 為主。
```

### 4.8 GPT-5.4 / Codex 完成後需產出

請新增或更新：

```text
docs/r2/AI-SmartBook-R2-gpt54-google-knowledge-implementation-report-20260624.md
docs/r2/AI-SmartBook-R2-gpt54-google-knowledge-verification-report-20260624.md
```

### 4.9 GPT-5.4 / Codex 回報格式

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

### Final Decision
- ready for Claude integration / not ready:
- reason:
```

---

## 5. 兩個 Agent 的整合限制

### 5.1 不要同時修改同一責任核心

| 檔案 / 模組 | Claude | GPT-5.4 / Codex |
|---|---|---|
| smart video runtime | 可改 | 不改 |
| NotesHelpPage | 可改 | 不改 |
| Google AI provider | 不改 | 可改 |
| knowledge generation prompt | 不改 | 可改 |
| knowledge route shell | 可改 | 只接 service |
| upsert service | 可預留 interface | 實作核心 |
| auth guard | 可改 | 沿用 |
| FilesTab 一鍵流程 | 可接 UI / workflow 狀態 | 只接 knowledge generation service |

### 5.2 若發生 conflict 的保留原則

```text
Claude 優先保留：runtime / auth / validation / UI glue / smart video / NotesHelpPage
GPT-5.4 優先保留：Google provider / sentence-index chunking / prompt / schema validation / knowledge upsert
```

---

## 6. Agent 3 暫緩

本文件只下達 Agent 1 與 Agent 2。

Agent 3：`fix/r2-smart-features-final-integration` 暫不啟動。

Agent 3 需等待：

1. Agent 1 完成並 push。
2. Agent 2 完成並 push。
3. 兩份 implementation / verification report 完成。

之後才可開整合分支，合併兩支，並執行：

```text
docs/r2/AI-SmartBook-R2-knowledge100-reader-toc-fallback-codex-task-20260624.md
```

---

## 7. 最終結論

本文件下達兩個可並行任務：

```text
Agent 1 Claude：smart features runtime / 安全 / auth / UI glue
Agent 2 GPT-5.4 / Codex：Google API Key → 知識點生成核心 service
```

兩個 agent 完成後，不可直接 merge 到主分支；需交由 Agent 3 在 final integration branch 做整合、knowledge100、Reader TOC fallback 與最終驗收。
