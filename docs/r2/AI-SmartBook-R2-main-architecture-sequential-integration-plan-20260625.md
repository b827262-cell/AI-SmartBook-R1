# AI-SmartBook-R2 主架構模組化循序整合計畫

Date: 2026-06-25  
Repository: `b827262-cell/AI-SmartBook-R1`  
Base branch: `master`  
Status: `integration-control / documentation-only`

## 1. 目的

本文件將 GitHub 目前已開發完成但分散於多個 topic branches / PR 的功能，依既有 R2 主架構模組化文件重新整理為可執行的循序整合路線。

核心原則：

1. `master` 為後續整合唯一來源。
2. 不再從舊功能分支 bulk merge。
3. 舊分支只作為 reference branch，採 feature replay / manual port。
4. 每一個模組拆成可驗收、可回退的小 PR。
5. 每一輪整合後必須跑 admin / student typecheck 與 build。

## 2. 目前狀態判讀

目前 GitHub branches 畫面顯示仍有多個 R2 branch 存在，但它們不應被視為同一批次等待合併的分支，而應分類為：

| 類型 | 分支 / PR | 判定 | 動作 |
| --- | --- | --- | --- |
| 已完成主整合 | PR #5 `feat(r2): final smart features integration` | 已 merged 到 `master` | 作為 baseline，不重做 |
| 目前開放 PR | PR #15 `feat/r2-clean-rebuild-20260625` | base 是 `main`，不是 `master` | 不直接合併；需重新對齊 master 後再 port |
| 主要後續功能 | `feat/r2-one-click-solve-book-my-question-bank` | 保留為 one-click solve reference | 拆成多個小 PR |
| 風險分支 | `fix/r2-agent3-smart-features-google-knowledge-integration` | merge-base 風險 | hold，不 merge、不刪除 |
| 候選功能分支 | 其他 reader / admin / PDF / manuscript branches | 可用作參考 | 逐一 scope review |

## 3. 主架構模組邊界

依 R2 modular import plan，後續整合採三層加三模組：

### 3.1 三層

| 層級 | 目錄 | 職責 |
| --- | --- | --- |
| Admin Backend | `apps/AI-adm-D1/src/server/*` | 匯入 API、job、資料驗證、管理端動作 |
| Student Frontend | `apps/AI-Stu-R1/src/*` | Reader、Notes、My Question Bank、問答互動 |
| SQLite Persistence | `packages/db`, `packages/schema` | schema、repo、migration、type boundary |

### 3.2 三個主功能模組

| 模組 | 目標 | 優先順序 |
| --- | --- | --- |
| `question-bank-import` | 題庫 JSON 匯入、驗證、dry-run、execute | P1 |
| `smart-solve-import` | 智慧題解 JSON 匯入、scope 對映、章節/頁碼綁定 | P2 |
| `reader-notes-navigation` | AI 筆記導覽、note → reader page/chapter/anchor | P0/P3 |

備註：PR #15 已經完成部分 `reader-notes-navigation` / notes directory 功能，但因為 base 在 `main`，應先做 master 對齊，不能直接依 GitHub 綠色 merge 狀態就合入。

## 4. 循序整合順序

### Phase 0 — Baseline freeze and validation

目標：確認 `master` 可以作為唯一整合起點。

必要動作：

```bash
git fetch --all --prune
git checkout master
git pull --ff-only origin master
corepack enable
pnpm install --frozen-lockfile
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

輸出：

```text
docs/r2/AI-SmartBook-R2-master-baseline-validation-before-feature-integration-20260625.md
```

### Phase 1 — Port PR #15 notes navigation into master-based branch

目標：將 `feat/r2-clean-rebuild-20260625` 的已完成 notes navigation 功能轉為 master-based 小 PR。

建議新分支：

```text
feat/r2-reader-notes-navigation-master-port-20260625
```

Reference：

```text
feat/r2-clean-rebuild-20260625
```

納入範圍：

- `/notes`、`/my-notes` routing
- `StudentNote` client methods
- `NotesDirectoryPage`
- local SQLite-backed `smart_book_notes` CRUD endpoint
- BookCard / App / styles 的必要最小調整

禁止事項：

- 不搬 SQLite DB 檔案
- 不覆蓋 master 既有 reader 主流程
- 不將整個 branch merge 進 master
- 不攜帶與 notes navigation 無關的清理提交

驗收：

```bash
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
```

### Phase 2 — One-click solve / my question bank 最小後端邊界

目標：從 `feat/r2-one-click-solve-book-my-question-bank` 只抽取 schema + repo + API contract。

建議新分支：

```text
feat/r2-one-click-solve-schema-api-20260625
```

拆分內容：

1. `packages/schema`：題目、題解、我的題庫 request/response schema。
2. `packages/db`：question bank / solve record repo。
3. `apps/AI-adm-D1/src/server/index.ts`：新增最小 API，不接大型 UI。
4. Mock provider 僅保留可測試輸出，不先接多模型選單。

驗收重點：

- API 可以建立一筆 question bank item。
- API 可以保存一筆 one-click solve result。
- 無 DB migration 破壞。
- Student 現有 reader/chat 不退化。

### Phase 3 — Question Bank Import admin dry-run

目標：落地 `question-bank-import` 第一版。

建議新分支：

```text
feat/r2-question-bank-import-dry-run-20260625
```

範圍：

- JSON schema validation
- upload / parse / preview
- duplicate detection
- error report data model
- admin page first screen

暫不做：

- 大量 execute
- AI 自動改題
- 跨書本匯入

### Phase 4 — Smart Solve Import scope mapping

目標：落地 `smart-solve-import`，把智慧題解資料與 book/chapter/page scope 對齊。

建議新分支：

```text
feat/r2-smart-solve-import-scope-mapping-20260625
```

範圍：

- Smart Solve item schema
- scope mapping builder
- chapter/page fallback mapping
- admin preview report

### Phase 5 — Student reader feature integration

目標：逐一整合 reader 相關保留功能。

候選 reference branches：

```text
fix/r2-student-reader-local-image-picker
feat/r2-student-reader-toolbar-modules
feat/r2-pdf-screenshot-ask-ai-core
feat/r2-pdf-screenshot-ask-ai-buttons
feat/r2-student-manuscript-board
```

整合順序：

1. Toolbar modules 基礎框架。
2. Local image picker。
3. PDF screenshot core。
4. Ask AI buttons。
5. Manuscript board。

每一項獨立 PR，禁止一次合併全部 reader branches。

### Phase 6 — Admin settings / files / Google knowledge integration

目標：將 admin settings、files、Google knowledge 類功能轉為可控設定模組。

候選 reference branches：

```text
fix/r2-admin-settings-files-integration
fix/r2-smart-features-runtime-claude
fix/r2-agent3-smart-features-google-knowledge-integration
```

規則：

- `fix/r2-agent3-smart-features-google-knowledge-integration` 先 hold，只讀分析。
- 先整合 settings/files UI，再整合 runtime provider。
- provider 或 API key 設定不得硬寫進前端。

## 5. PR 拆分規格

每個功能 PR 固定格式：

```text
Title: feat(r2/<module>): <small feature>
Base: master
Head: feat/r2-<module>-<scope>-<date>
```

PR body 必須包含：

```text
## Scope
## Reference branch
## Files changed
## Validation
## Rollback
## Not included
```

每個 PR 必須能被獨立 revert，且不依賴下一個 PR 才能 build pass。

## 6. 分支處理原則

| 分支 | 處理方式 |
| --- | --- |
| `main` | 保留，不主動刪除；但新 PR 不再以 main 為 base |
| `master` | 唯一整合 base |
| PR #15 branch | 只作 reference；重新 port 到 master-based branch |
| one-click solve branch | 只作 reference；拆成 schema/API/UI PR |
| Google knowledge risk branch | hold；先產出 conflict review |
| 其他 feature branch | 每次只 review 一支，決定 port / abandon / docs-only |

## 7. 回滾策略

1. 每個 feature 有獨立 PR。
2. DB schema 採 append-only，避免修改既有核心表。
3. API 採 feature flag 或 route-level disable。
4. Student reader UI 新功能以 fallback 保持既有閱讀流程。
5. 若出現 build/runtime regression，先 revert 最新 PR，不回退整個 R2。

## 8. 下一步指令

建議下一個實作任務：

```text
請建立 master-based 分支 feat/r2-reader-notes-navigation-master-port-20260625，
只從 PR #15 / feat/r2-clean-rebuild-20260625 手動 port notes navigation 必要檔案，
完成後開 PR 到 master，並附 AI-Stu-R1 / AI-adm-D1 typecheck + build 結果。
```

如果要先走 one-click solve，則改用：

```text
請建立 master-based 分支 feat/r2-one-click-solve-schema-api-20260625，
只從 feat/r2-one-click-solve-book-my-question-bank 抽取 schema、repo、API contract，
不要導入完整 UI，完成後開 PR 到 master。
```
