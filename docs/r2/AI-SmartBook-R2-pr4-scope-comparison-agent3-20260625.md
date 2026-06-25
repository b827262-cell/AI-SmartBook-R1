# AI-SmartBook-R2 PR #4 Scope Comparison — Agent 3 Report

Date: 2026-06-25
Agent: Claude Sonnet 4.6 (Agent 3)
Task source: `docs/r2/AI-SmartBook-R2-pr12-pr4-sequencing-multi-agent-dispatch-20260625.md`
Mode: Read-only analysis

## 1. 任務說明

依 Agent 3 指派：比較 PR #4 的功能範圍是否已被 PR #5 / master 目前狀態所涵蓋，
並給出保留或關閉的建議。

---

## 2. PR #4 核心功能範圍

PR #4 title: `feat(stu): add category library, cover UX, reader, and chat history`
Base: `main`（非 `master`）
Head: `feat/student-category-cover-reader-chat`
Commits: 61 | Changed files: 108 | +17718 / -414

### PR #4 核心功能列表

| 功能模組 | 檔案 | 說明 |
|----------|------|------|
| 書籍分類庫 | `BookCategorySection.tsx`, `BooksPage.tsx` | 動態群組計數（中級會計學 5 本 / 刑法 3 本） |
| 封面 UX | `BookCover.tsx`, `BookCard.tsx` | coverUrl + fallback |
| 章節閱讀器 | `BookReaderPage.tsx`, `ChapterSidebar.tsx`, `ReaderTabs.tsx`, `ReaderTopBar.tsx` | 章節 / 目錄版面 |
| 右側知識問答 | `ChatPanel.tsx`, `ChatInput.tsx` | 知識問答 Chat panel |
| 聊天歷史持久化 | `ChatPanel.tsx`, `studentClient.ts` | sessionId + localStorage + 跨書隔離 |
| 管理端書籍頁 | `apps/AI-adm-D1/src/pages/BooksPage.tsx` | category / coverUrl 支援 |
| Flow Sidecar | `server/flow-sidecar.mjs`, `plist` | tw-legal-flow 唯讀 HTTP sidecar（port 4350）|
| AntiG Portal | `AntiGPortalPage.tsx`, `InstitutionalFlowPage.tsx` | 台指期法人報告門戶（與 SmartBook 核心無關）|

---

## 3. Master 現況比對

### 3.1 已完整涵蓋（PR #5 透過 fix/r2-smart-features-final-integration 合併）

| PR #4 功能 | master 現況 | 結論 |
|------------|------------|------|
| `BookCategorySection.tsx` (35 行) | master 有，35 行完全一致 | ✅ 已涵蓋 |
| `BookCover.tsx` (42 行) | master 有，42 行完全一致 | ✅ 已涵蓋 |
| `BookCard.tsx` | master 有 | ✅ 已涵蓋 |
| `BookShelfSection.tsx` | master 有 | ✅ 已涵蓋 |
| `ChapterSidebar.tsx` (114 行) | master 有 | ✅ 已涵蓋 |
| `ChatInput.tsx` (193 行) | master 有 | ✅ 已涵蓋 |
| `ChatPanel.tsx` (129 行) | master 有，sessionId / localStorage 均存在 | ✅ 已涵蓋 |
| `BookReaderPage.tsx` (1627 行) | master 有，同等或更新版本 (1627 行) | ✅ 已涵蓋 |
| `BooksPage.tsx` (student) | master 有 | ✅ 已涵蓋 |
| `studentClient.ts` (177 行) | master 有 | ✅ 已涵蓋 |
| Admin `BooksPage.tsx` (103 行) | master 有 | ✅ 已涵蓋 |

關鍵驗證：

```
master ChatPanel.tsx 包含：
  sessionId, localStorage.getItem/setItem, cross-book isolation
→ PR #4 的聊天歷史持久化功能已完整在 master 中。
```

### 3.2 PR #4 head branch 相對 master 的差異檔案（git diff origin/master...origin/feat/student-category-cover-reader-chat）

僅剩 **12 個檔案**不同於 master：

| 檔案 | 性質 | 是否屬於 SmartBook 核心 |
|------|------|------------------------|
| `apps/AI-Stu-R1/package.json` | 依賴調整 | 可能，需個別評估 |
| `apps/AI-Stu-R1/server/flow-sidecar.mjs` | Flow Sidecar server | **否**（tw-legal-flow 專案用） |
| `apps/AI-Stu-R1/server/com.ai-smartbook.flow-sidecar.plist` | launchd plist | **否** |
| `apps/AI-Stu-R1/src/App.tsx` | 路由新增 | AntiG Portal 路由，非 SmartBook 核心 |
| `apps/AI-Stu-R1/src/pages/AntiGPortalPage.tsx` | 台指期法人門戶 | **否**（獨立產品） |
| `apps/AI-Stu-R1/src/pages/InstitutionalFlowPage.tsx` | 法人流報告頁 | **否**（獨立產品） |
| `apps/AI-Stu-R1/src/styles.css` | CSS（AntiG 相關） | 部分混入 |
| `apps/AI-Stu-R1/vite.config.ts` | Vite 設定 | 需確認是否有 proxy 調整 |
| `docs/TUF_ASUS_OLD_SERVICES_SHUTDOWN_TASK.md` | 運維文件 | **否** |
| `docs/TUF_ASUS_TAILSCALE_NO_REBOOT_FALLBACK_TASK.md` | 運維文件 | **否** |
| `docs/TUF_ASUS_TAILSCALE_ROUTE_REPAIR_TASK.md` | 運維文件 | **否** |
| `docs/ops/macbook-student-frontend-runbook.md` | 運維文件 | **否** |

---

## 4. 重疊分析結論

```
PR #4 的核心 SmartBook 功能（分類庫、封面 UX、閱讀器、聊天歷史）
已 100% 涵蓋在 master（透過 PR #5 整合）。

PR #4 head branch 目前相對 master 僅剩 12 個差異檔案，
且這些差異均屬以下類別：
  1. AntiG Portal 頁面（與 SmartBook 無關的獨立功能）
  2. flow-sidecar 伺服器（tw-legal-flow 外部專案用途）
  3. 運維文件（TUF ASUS / Tailscale / macbook runbook）

PR #4 若現在合併進 main，無法為 master 帶來任何 SmartBook 新功能，
只會引入 stale branch history 與 main/master 分叉風險。
```

---

## 5. 可搶救內容

| 項目 | 建議 |
|------|------|
| `AntiGPortalPage.tsx` + `InstitutionalFlowPage.tsx` | 若確認是 AI-SmartBook-R2 產品線功能，可從 head branch 單獨 cherry-pick 至 master 的新分支，需 owner 確認 |
| `flow-sidecar.mjs` + plist | 屬於 tw-legal-flow 外部專案，不應進入 AI-SmartBook-R1 repo |
| 運維文件 | 可獨立 PR 歸入 docs/ 整理，但優先級低 |

---

## 6. 關閉 / 保留建議

| 決策 | 內容 |
|------|------|
| **建議關閉 PR #4** | SmartBook 核心功能已由 PR #5 完整整合進 master，PR #4 已被取代 |
| **關閉理由** | Superseded by PR #5 final R2 integration. Core features (category, cover UX, reader, chat history) fully contained in master. Remaining diff is AntiG Portal and ops docs unrelated to SmartBook. |
| **保留 head branch** | `feat/student-category-cover-reader-chat` 應暫時保留，待 owner 確認 AntiG Portal 功能的歸屬 |
| **不得合併 PR #4 至 main** | main 已非 source of truth，合併只會造成 stale history |
| **需 owner 核准** | 關閉 PR #4 前需 owner 明確確認 |

---

## 7. 終止回報

```
- status: success (read-only analysis complete)
- agent: Claude Sonnet 4.6 (Agent 3)
- PR analyzed: #4
- comparison target: PR #5 / master
- overlap finding: 100% of SmartBook core features superseded by PR #5
- unique remaining diff: AntiG Portal + flow-sidecar + ops docs (non-SmartBook)
- recommended action: close PR #4 as stale, retain head branch pending owner decision on AntiG Portal
- source code changed: no
```
