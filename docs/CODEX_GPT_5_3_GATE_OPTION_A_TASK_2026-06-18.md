# Codex GPT-5.3 執行任務 — Phase 0.5 Gate Option A

> Date: 2026-06-18  
> Branch: `feat/student-category-cover-reader-chat`  
> Executor: Codex GPT-5.3  
> Decision: **Option A**  
> Final report language: Traditional Chinese  
> Execution language: English

---

## 1. 任務裁示

本次採用 **Option A**。

請不要在本次 Gate PR 內執行 book-core 純函數化遷移，也不要嘗試移除 `packages/book-core` 對 `@ai-smartbook/ai` / `@ai-smartbook/db` 的實際 runtime coupling。

G1 是已知 blocker，保留至下一個 Sprint 處理。

---

## 2. 背景

目前 `docs/PHASE_0_5_GATE_STATUS_2026-06-18.md` 已確認：

- G1：`book-core` 邊界仍是 blocker。
- `packages/book-core/src/` 內存在 runtime import：
  - `book-qa.ts`
  - `chapter-summarizer.ts`
  - `book-splitter.ts`
- `context.ts` 也有 type-only import coupling。
- 只刪 package.json 依賴會造成 TS2307，導致 `pnpm -r typecheck` / `pnpm -r build` 失敗。

因此本次不要做 B 選項的最小遷移。

---

## 3. 本次允許範圍

只允許做以下事項：

1. 確認 `scripts/boundary-check.sh` 存在。
2. 執行：

```bash
chmod +x scripts/boundary-check.sh
```

3. 執行驗證：

```bash
pnpm -r typecheck
pnpm -r build
bash scripts/boundary-check.sh
```

4. 若 `boundary-check.sh` 因已知 G1 blocker 失敗，請不要修 book-core，只需在回報 MD 中記錄。
5. 建立本次執行回報 MD：

```text
docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md
```

---

## 4. 嚴格禁止範圍

本次不得執行以下事項：

- 不移除 `packages/book-core/package.json` 的 `@ai-smartbook/ai` / `@ai-smartbook/db` 依賴。
- 不重構 `packages/book-core/src/`。
- 不移動 `book-qa.ts`、`chapter-summarizer.ts`、`book-splitter.ts`、`context.ts`。
- 不修改 book-core public API。
- 不修改 UI。
- 不修改 `packages/db`。
- 不新增 PDF upload / parsing flow。
- 不新增 OAuth、RAG、Quiz、Credits、WebSocket。
- 不碰 `legacy/`。
- 不引入 Docker、PM2、MySQL、Redis。

---

## 5. 預期驗證結果

### 5.1 typecheck / build

預期：

```text
pnpm -r typecheck: pass
pnpm -r build: pass
```

若失敗，請記錄第一個有效錯誤，不要擴大修改。

### 5.2 boundary-check

預期：

```text
bash scripts/boundary-check.sh: fail only because of known G1 book-core ai/db dependency blocker
```

若出現 G1 以外的新錯誤，請記錄為新增 blocker。

---

## 6. 回報 MD 格式

請在執行完畢後新增：

```text
docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md
```

內容格式如下：

```md
# Codex GPT-5.3 執行回報 — Phase 0.5 Gate Option A

> Date: 2026-06-18  
> Branch: feat/student-category-cover-reader-chat  
> Executor: Codex GPT-5.3  
> Decision: Option A

---

## 1. 最終狀態

- 狀態：success / failure / blocker / permission-halt
- Commit SHA：
- Changed files：

---

## 2. 執行內容

- [ ] Confirmed `scripts/boundary-check.sh` exists
- [ ] Ran `chmod +x scripts/boundary-check.sh`
- [ ] Ran `pnpm -r typecheck`
- [ ] Ran `pnpm -r build`
- [ ] Ran `bash scripts/boundary-check.sh`

---

## 3. 驗證結果

| Command | Result | Notes |
|---|---|---|
| `pnpm -r typecheck` | pass / fail / not-run | |
| `pnpm -r build` | pass / fail / not-run | |
| `bash scripts/boundary-check.sh` | expected-fail / pass / unexpected-fail | |

---

## 4. G1 Blocker 狀態

G1 是否仍保留為 blocker：yes / no

說明：

- 本次未重構 book-core。
- 本次未移除 ai/db dependency。
- G1 留待下一 Sprint 進行 book-core 純函數化。

---

## 5. 風險與下一步

- Remaining risks：
- Next Sprint recommendation：

---

## 6. 終止判斷

請用繁體中文總結：

- success：chmod 與驗證完成，typecheck/build 通過，boundary-check 僅因 G1 預期失敗。
- blocker：typecheck/build 出現非 G1 新問題，或 boundary-check 出現 G1 以外問題。
- failure：執行錯誤且無法判定。
- permission-halt：需要使用者授權才能繼續。
```

---

## 7. 給 Codex GPT-5.3 的直接指令

```text
You are working in the AI-SmartBook-R1 repository on branch feat/student-category-cover-reader-chat.

Execute Option A only.

Scope:
1. Confirm scripts/boundary-check.sh exists.
2. Run chmod +x scripts/boundary-check.sh.
3. Run pnpm -r typecheck.
4. Run pnpm -r build.
5. Run bash scripts/boundary-check.sh.
6. Create docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md with the required Traditional Chinese report.

Do not refactor book-core.
Do not remove @ai-smartbook/ai or @ai-smartbook/db dependencies from book-core.
Do not modify UI.
Do not modify packages/db.
Do not touch legacy/.
Do not add OAuth, RAG, quiz, credits, WebSocket, Docker, PM2, MySQL, or Redis.

Expected result:
- pnpm -r typecheck passes.
- pnpm -r build passes.
- boundary-check fails only for the known G1 book-core ai/db dependency blocker.

Final report must be written to docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md in Traditional Chinese.
```
