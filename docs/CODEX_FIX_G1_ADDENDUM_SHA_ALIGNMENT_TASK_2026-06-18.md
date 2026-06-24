# Codex 任務 — 修正 G1 Addendum SHA 對齊描述

> Date: 2026-06-18  
> Branch: `feat/student-category-cover-reader-chat`  
> Executor: Codex GPT-5.3  
> Task type: docs-only correction  
> Final report language: Traditional Chinese  
> Execution language: English

---

## 1. 任務目的

請修正以下文件中已過期的 SHA 對齊描述：

```text
docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md
```

目前該附錄第 4 節仍把「SHA 對齊」列為待修正項，但實際上 `docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md` 已於 commit `4a3d66c01c98b428568bcbe74d221e160d9f53ec` 修正，回報檔內 Commit SHA 已改為：

```text
13ae2c8883374c18454bcff936206e99560ff4f1
```

因此本次 Codex 任務只需更新附錄敘述，讓文件狀態與 repo 現況一致。

---

## 2. 背景脈絡

目前已確認：

1. Option A 的決策方向正確。
2. G1 仍維持為 blocker。
3. 正確理由是 HEAD 原始碼已存在 `book-core` 對 `@ai-smartbook/ai` / `@ai-smartbook/db` 的真實耦合。
4. `pnpm -r typecheck` / `pnpm -r build` 本次未完成，是 pnpm 執行環境問題，不是專案測試結果。
5. Codex Option A 回報檔中的 Commit SHA 錯誤已被修正。

---

## 3. 必改內容

請修改：

```text
docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md
```

### 3.1 修正第 4 節第 2 點

將目前類似以下的待修正描述：

```text
SHA 對齊：摘要稱報告 Commit SHA 為 13ae2c8，但 repo 內報告檔記載為 2b3c65c4…。需確認報告實際釘定的 SHA 並統一。
```

改成已完成狀態，例如：

```text
SHA 對齊：已於 commit 4a3d66c01c98b428568bcbe74d221e160d9f53ec 修正。`docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md` 目前已釘定實際新增回報檔的 commit `13ae2c8883374c18454bcff936206e99560ff4f1`。
```

### 3.2 保留其餘核心結論

請不要改變以下結論：

- Option A 維持正確。
- G1 仍為 blocker。
- G1 blocker 的正確理由是 `book-core` 原始碼耦合，而不是 pnpm 未執行成功。
- G1 解耦應留到下一個獨立 PR。

---

## 4. 允許範圍

只允許修改：

```text
docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md
```

並新增執行回報：

```text
docs/CODEX_FIX_G1_ADDENDUM_SHA_ALIGNMENT_REPORT_2026-06-18.md
```

---

## 5. 嚴格禁止範圍

不得修改以下內容：

- `apps/`
- `packages/`
- `scripts/`
- `legacy/`
- `package.json`
- `pnpm-lock.yaml`
- 任何 UI 檔案
- 任何 build / deploy 設定

不得執行以下重構：

- 不重構 `book-core`。
- 不移除 `@ai-smartbook/ai` 或 `@ai-smartbook/db`。
- 不處理 DB。
- 不處理 PDF parsing。
- 不新增 OAuth、RAG、Quiz、Credits、WebSocket。
- 不引入 Docker、PM2、MySQL、Redis。

---

## 6. 建議驗證指令

請執行：

```bash
grep -n "SHA 對齊" docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md
grep -n "4a3d66c01c98b428568bcbe74d221e160d9f53ec" docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md
grep -n "13ae2c8883374c18454bcff936206e99560ff4f1" docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md
git status --short
```

不用執行 `pnpm -r typecheck` 或 `pnpm -r build`，因為本次是 docs-only correction。

---

## 7. 執行回報 MD 格式

請新增：

```text
docs/CODEX_FIX_G1_ADDENDUM_SHA_ALIGNMENT_REPORT_2026-06-18.md
```

內容格式如下：

```md
# Codex 執行回報 — G1 Addendum SHA 對齊修正

> Date: 2026-06-18  
> Branch: feat/student-category-cover-reader-chat  
> Executor: Codex GPT-5.3  
> Task type: docs-only correction

---

## 1. 最終狀態

- 狀態：success / failure / blocker / permission-halt
- Commit SHA：
- Changed files：

---

## 2. 修正內容

- [ ] 已修正 `docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md` 第 4 節 SHA 對齊描述
- [ ] 已明確標示 `4a3d66c01c98b428568bcbe74d221e160d9f53ec` 為 docs 修正 commit
- [ ] 已明確標示 `13ae2c8883374c18454bcff936206e99560ff4f1` 為實際新增回報檔 commit
- [ ] 已保留 Option A / G1 blocker / 下一 Sprint 解耦結論

---

## 3. 驗證結果

| Command | Result | Notes |
|---|---|---|
| `grep -n "SHA 對齊" docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md` | pass / fail | |
| `grep -n "4a3d66c01c98b428568bcbe74d221e160d9f53ec" docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md` | pass / fail | |
| `grep -n "13ae2c8883374c18454bcff936206e99560ff4f1" docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md` | pass / fail | |
| `git status --short` | pass / dirty | |

---

## 4. 範圍控制

- 是否修改程式碼：yes / no
- 是否修改 `apps/`：yes / no
- 是否修改 `packages/`：yes / no
- 是否修改 `scripts/`：yes / no
- 是否修改 `legacy/`：yes / no

---

## 5. 終止判斷

請用繁體中文總結本次修正是否完成，並確認 G1 仍保留為下一 Sprint blocker。
```

---

## 8. 給 Codex GPT-5.3 的直接指令

```text
You are working on branch feat/student-category-cover-reader-chat.

Read docs/CODEX_FIX_G1_ADDENDUM_SHA_ALIGNMENT_TASK_2026-06-18.md.
Perform a docs-only correction.

Modify only:
- docs/GATE_G1_VERIFICATION_ADDENDUM_2026-06-18.md

Add report:
- docs/CODEX_FIX_G1_ADDENDUM_SHA_ALIGNMENT_REPORT_2026-06-18.md

Required correction:
- Update the SHA alignment item in section 4 so it no longer says the SHA mismatch is pending.
- State that the report SHA was already corrected in commit 4a3d66c01c98b428568bcbe74d221e160d9f53ec.
- State that docs/CODEX_GPT_5_3_GATE_OPTION_A_REPORT_2026-06-18.md now pins commit 13ae2c8883374c18454bcff936206e99560ff4f1.
- Preserve the conclusion that Option A is correct, G1 remains blocker, and book-core decoupling belongs in a separate next Sprint PR.

Do not modify apps/, packages/, scripts/, legacy/, package.json, pnpm-lock.yaml, UI files, or build/deploy settings.
Do not run typecheck/build for this docs-only correction.

Final report must be written in Traditional Chinese.
```
