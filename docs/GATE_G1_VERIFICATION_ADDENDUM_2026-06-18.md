# Gate PR G1 驗證更正附錄（Verification Addendum）

> Date: 2026-06-18
> Repo: b827262-cell/AI-SmartBook-R1
> Verified at HEAD: 13ae2c8883374c18454bcff936206e99560ff4f1
> Document pinned SHA: 02c214a6166ea0defbe124ee550b54b113bb9ed9（Gate PR 文件 §Source reference）
> 性質：對 docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md 的證據更正與補強，不取代決定
> 結論語言：正體中文

---

## 0. 一句話總結

Option A（維持 G1 為 blocker、不在本次 config-only Gate 內硬刪依賴）是**正確的決定**，但原報告是用**未實測**的證據去支撐它。本附錄補上由原始碼檢視取得的精確耦合證據，並更正一個關鍵的 SHA 參照錯誤。

---

## 1. 關鍵更正：SHA 參照過期

Gate PR 文件 §1 / §8 將 book-core 視為「骨架完成、核心待填」，並把 book-core 純函數實作排到「下一 Sprint」。此描述**只在文件釘住的 02c214a 為真**。

在該 SHA 上，`packages/book-core/src/` 只有單一檔案 `index.ts`（內容為 `export const bookCoreReady = true;` 加 TODO 註解），不 import 任何東西。因此「G1 = 刪 package.json 兩行」在 `02c214a` 上確為零風險、不需重構、不構成 blocker。

但 working tree 已前進至 HEAD `13ae2c8`，**book-core 的整套實作（即 §8 排定的「下一 Sprint」工作）已提前落地**，並引入了對 `@ai-smartbook/ai` 與 `@ai-smartbook/db` 的 import。

→ 先前任何「直接刪兩行即可、無 blocker」的判斷，僅適用於 `02c214a`，在 HEAD `13ae2c8` 上**不再成立**。前提已翻轉。

---

## 2. HEAD 13ae2c8 實況（原始碼檢視）

### 2.1 book-core/src 檔案清單（10 檔，非空殼）

```
context.ts            index.ts              pdf-parser.ts
pdf-index-builder.ts  book-qa.ts            reader-outline.ts
chapter-builder.ts    book-splitter.ts      content-splitter.ts
chapter-summarizer.ts
```

### 2.2 對 ai/db 的精確耦合（file:line）

| 依賴 | book-core 使用點 | import 類型 |
|---|---|---|
| `@ai-smartbook/db` | `context.ts:1` `import type { Repositories }` | **type-only** |
| `@ai-smartbook/ai` | `context.ts:2` `import type { AiProvider }` | type-only |
| `@ai-smartbook/ai` | `book-qa.ts:1` `import { buildBookQaPrompt }` | **value** |
| `@ai-smartbook/ai` | `book-splitter.ts:1` `import { buildSplitBookPrompt }` | **value** |
| `@ai-smartbook/ai` | `chapter-summarizer.ts:1` `import { buildSummarizeChapterPrompt }` | **value** |

- `@ai-smartbook/db`：僅 `context.ts` 的 **type-only** import（用於 `BookCoreContext` 介面的 `repos` 欄位）。
- `@ai-smartbook/ai`：1 個 type import（`AiProvider`）+ 3 個 **value** import（prompt builders）。

### 2.3 關鍵架構發現：@ai-smartbook/ai 是「混純度 barrel」

`packages/ai/src/index.ts` 同時匯出：

- **純** prompt builders：`buildBookQaPrompt` / `buildSplitBookPrompt` / `buildSummarizeChapterPrompt` / `buildChaptersPrompt`
- **帶金鑰的 provider**：`GeminiAiProvider` / `OpenAiCompatibleProvider`

後者含 `apiKey`、`fetch()` 至 `generativelanguage.googleapis.com` / OpenAI 端點、`process.env.GEMINI_API_KEY` / `OPENAI_API_KEY`。

→ book-core 透過 barrel import prompt builders，其**依賴圖傳遞性地含入帶金鑰的 AI provider 程式碼**。這使 Gate PR 文件 §10「book-core stays pure and does not call AI or DB」與學生端金鑰隔離精神出現**真實破口**（H1），而非裝飾性問題。這正是在 config-only Gate 內維持 G1 為 blocker 的**正確理由**。

---

## 3. 原報告證據鏈的問題

`docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md` §6 載明：typecheck 與 build 在執行環境**未能完成**（pnpm 本體報錯），boundary-check 僅顯示「已知 G1」。

由此可知：

1. 本次 run **未產出任何客觀測試結果**。failure 的真實原因是 pnpm 工具/環境失敗，而非「刪依賴 → build 壞」被驗證到。
2. boundary-check 對 book-core 僅 grep `packages/book-core/package.json`；其 FAIL 只代表「那兩行依賴尚未移除」（待辦），**不是**「移除會破壞 build」的證據。
3. 因此原報告把一個**從未實測**的 G1 記為「blocker」。結論方向碰巧正確，但證據鏈是壞的——屬於「以未執行的測試蓋結論章」的反向假訊號。

真正能支撐 blocker 的，是 §2.2 的 file:line 耦合與 §2.3 的混純度 barrel 發現，而非 pnpm 跑不動。

---

## 4. 待修正項（報告被信任前必補）

1. **把斷言轉為量測**：修復 pnpm 執行環境，實跑 `pnpm install && pnpm -r typecheck && pnpm -r build`，將「斷言的 blocker」轉為「實測的 blocker」。並驗證：移除 `@ai-smartbook/ai`、`@ai-smartbook/db` 後 typecheck 是否如預期失敗於 §2.2 各點。
2. **SHA 對齊**：已於 commit `4a3d66c01c98b428568bcbe74d221e160d9f53ec` 修正。`docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md` 目前已釘定實際新增回報檔的 commit `13ae2c8883374c18454bcff936206e99560ff4f1`。
3. **狀態理由更正**：將狀態描述改為「typecheck/build 未執行（pnpm 環境失敗）；G1 耦合由原始碼檢視確認（附 file:line），尚未經 typecheck 實測」。

---

## 5. 下一 Sprint 任務重新定義（解耦，非實作）

book-core 實作已存在於 HEAD，故下一階段任務不是「實作 book-core 純函數化」，而是**對既有 book-core 解耦**，目標讓 book-core **不 import `@ai-smartbook/ai` 與 `@ai-smartbook/db`**、保持純、且不改變 `BookCoreContext` 對外形狀：

1. **prompt builders 外移**：`build*Prompt` 本身為純函數，移至純 package（或為 `@ai-smartbook/ai` 增設**不 re-export provider** 的 subpath export，如 `@ai-smartbook/ai/prompts`），book-core 改 import 該純來源。
2. **契約型別改純來源**：`AiProvider`、`Repositories` 兩個介面型別改由純型別 package（建議 `@ai-smartbook/schema`）提供；book-core 的 `context.ts` 改為 `import type` 自 schema。
3. 完成後移除 `packages/book-core/package.json` 對 `@ai-smartbook/ai`、`@ai-smartbook/db` 的依賴，跑 `pnpm -r typecheck && pnpm -r build` 實測綠燈，G1 才為**誠實通過**。
4. 此為改動多個 src 檔的 scoped 重構，依 Gate PR 文件 §4（config-only / 不重構），應作為**獨立 PR**，不混入本次 config Gate。

---

## 6. 決定確認

- 本次 config-only Gate：**維持 Option A**（G1 列為 blocker，不硬刪依賴），但理由更正為 §2.3 的真實 purity/金鑰圖耦合。
- 其餘 gates（G2–G6：兩個 vite.config、兩個 tsconfig、boundary-check.sh + 可執行權限、scope control）與 book-core 無關，**可在本次完成**。
- G1 的解除，留待 §5 的獨立解耦 PR，並以 `pnpm -r typecheck` 實測為驗收依據。

---

## 附錄 A：驗證指令（可重現）

```bash
# 於 HEAD 13ae2c8 之 working tree
git rev-parse HEAD
ls -la packages/book-core/src/
grep -rn "@ai-smartbook/\(ai\|db\)" packages/book-core/src/
sed -n '1,3p' packages/ai/src/index.ts   # 確認 barrel 同時匯出 prompt 與 provider
grep -rniE "apiKey|process\.env|fetch\(" packages/ai/src/providers/   # 確認 provider 帶金鑰/網路
```
