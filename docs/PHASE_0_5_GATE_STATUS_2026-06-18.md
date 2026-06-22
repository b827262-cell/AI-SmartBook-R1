# Phase 0.5 Gate PR — 現況查核報告

> Date: 2026-06-18  
> Branch: feat/student-category-cover-reader-chat  
> HEAD: da470c3514169daa6cac3f4820f168918976e8b0  
> Spec ref: docs/CLAUDE_CODE_PHASE_0_5_GATE_PR.md (a62a8b2b)

---

## Gate 驗收狀況

| Gate | 驗收項目 | 狀態 | 備註 |
|---|---|---|---|
| G1 | book-core 不依賴 ai/db | ❌ BLOCKED | `package.json` 仍有依賴，且 `src/` 有 runtime imports（見下） |
| G2 | Student Vite config `/api/student` proxy to 4310 | ⚠️ 已存在但 diverged | 現役 proxy target 為 `4300`，非文件 `4310` |
| G3 | Admin Vite config `/api/admin` proxy to 4300 | ⚠️ 已存在但 diverged | 現役 proxy 為 `/api`（全域），非 `/api/admin` |
| G4 | 兩個 app 均有 `tsconfig.json` | ✅ 已完成 | 均 extends `../../tsconfig.base.json` |
| G5 | `boundary-check.sh` 可執行 | ⚠️ 待 chmod | 檔案已存在，缺 exec bit |
| G6 | 無 UI/DB/PDF/RAG/OAuth 額外實作 | ✅ 通過 | 本次無新增禁止範圍 |

---

## G1 Blocker — book-core 實際 import 狀況

執行 `grep -rn "@ai-smartbook/\(ai\|db\)" packages/book-core/src/` 原始輸出：

```
packages/book-core/src/book-qa.ts:1:import { buildBookQaPrompt } from "@ai-smartbook/ai";
packages/book-core/src/context.ts:1:import type { Repositories } from "@ai-smartbook/db";
packages/book-core/src/context.ts:2:import type { AiProvider } from "@ai-smartbook/ai";
packages/book-core/src/chapter-summarizer.ts:1:import { buildSummarizeChapterPrompt } from "@ai-smartbook/ai";
packages/book-core/src/book-splitter.ts:1:import { buildSplitBookPrompt } from "@ai-smartbook/ai";
```

- **3 個 runtime value import**：`buildBookQaPrompt`、`buildSummarizeChapterPrompt`、`buildSplitBookPrompt`
- **2 個 type-only import**：`Repositories`、`AiProvider`
- `index.ts` 全部 re-export，`tsc --noEmit` 會編譯到這些模組

若只刪 `package.json` 兩行 + `pnpm install`：workspace symlink 消失 → **TS2307 × 5** → `pnpm -r typecheck` / `pnpm -r build` 失敗。

---

## G2/G3 — Vite proxy 偏差

| | 文件 §5 規格 | 現役設定 |
|---|---|---|
| Student port | 5173 | 未顯式設定（Vite 預設） |
| Student proxy | `/api/student` → `4310` | `/api/student` → `env.STUDENT_API_TARGET \|\| 4300` |
| Admin port | 5174 | 5174 ✅ |
| Admin proxy | `/api/admin` → `4300` | `/api` → `env.ADMIN_API_TARGET \|\| 4300` |

現役設定功能更彈性（可透過 env override）。建議**不改動**，視為已達文件意圖。

---

## 待決策

### G1 — 擇一方向

**選項 A：維持 blocker，book-core 純函數化留待下一 Sprint**
- 本次只 `chmod +x scripts/boundary-check.sh`
- `pnpm -r typecheck` / `pnpm -r build` 保持綠
- boundary-check 正確顯示 FAIL（符合現況）
- G1 留待 Sprint 1 book-core 重構時一起清

**選項 B：授權最小遷移，本次達成 G1**
- 將 `book-qa.ts`、`chapter-summarizer.ts`、`book-splitter.ts`、`context.ts` 的 AI/DB 耦合移出 book-core
- 超出 config-only 範圍，會改變 book-core 公開 API
- 風險：未知的下游使用者

---

## boundary-check 當前輸出

```
=== Module Boundary Check ===
    "@ai-smartbook/ai": "workspace:*",
⚠️  WARN: book-core depends on ai
    "@ai-smartbook/db": "workspace:*",
⚠️  WARN: book-core depends on db
❌ Boundary violations detected
exit=1
```

---

## 下一步

等待 G1 裁示後繼續。若選 A：
1. `chmod +x scripts/boundary-check.sh`
2. 完成 commit，Gate PR 部分關閉（G1 pending next sprint）
