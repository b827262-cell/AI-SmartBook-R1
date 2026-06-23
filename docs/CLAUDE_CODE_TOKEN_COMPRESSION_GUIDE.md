# Claude Code 編程壓縮與減少 Token 浪費方式

> Created: 2026-06-18  
> Target repo context: `b827262-cell/AI-SmartBook-R1`  
> Backup docs path: `b827262-cell/Project-md-backup/md/AI-SmartBook-R1`  
> Purpose: 建立 Claude Code 編程時的上下文壓縮、任務切割、讀檔控制與 Token 節省規則。  
> Official reference:  
> - Claude Code commands: `https://code.claude.com/docs/en/commands`  
> - Claude Code memory: `https://code.claude.com/docs/en/memory`  
> - Claude Code prompt caching: `https://code.claude.com/docs/en/prompt-caching`  
> - Claude Code skills: `https://code.claude.com/docs/en/slash-commands`

---

## 1. 核心原則

Claude Code 省 Token 的重點不是一直壓縮，而是：

1. 少讀無關檔案。
2. 少貼長篇 log。
3. 任務切小。
4. 不在同一個任務中頻繁切模型或 effort。
5. 把長規則放到 skill，不要全部塞進 `CLAUDE.md`。
6. 在自然任務斷點使用 `/compact`。
7. 換新任務時使用 `/clear`。

---

## 2. 必學指令

| 指令 | 用途 | 建議使用時機 |
|---|---|---|
| `/context` | 查看目前 context 使用量 | 任務變長或不確定誰吃 Token 時 |
| `/context all` | 展開更完整 context 分析 | 需要找出大型檔案、tool result、memory bloat 時 |
| `/compact [instructions]` | 將目前對話摘要化，釋放 context | 同一任務完成一個階段後 |
| `/clear [name]` | 開新對話，清空上下文但保留 project memory | 換下一個不相關任務時 |
| `/rewind` | 回到較早 checkpoint 或摘要一段歷史 | 走錯方向、想丟棄錯誤探索時 |
| `/btw <question>` | 問旁支問題，不膨脹主對話 | 中途問小問題時 |
| `/model` | 設定模型 | 任務開始前設定，不要中途頻繁切 |
| `/effort` | 設定 reasoning effort | 任務開始前設定，不要中途頻繁切 |

---

## 3. `/compact` 使用方式

### 3.1 正確時機

適合使用 `/compact` 的時間點：

- Gate PR 完成後。
- 一個 bug 已修完，準備修下一個 bug。
- 已完成探索，需要保留結論但丟掉過程。
- context 快滿，但任務還要繼續。

不建議使用 `/compact` 的情況：

- 每幾分鐘就壓一次。
- 還在 debug 同一個錯誤的中途。
- 還需要保留大量細節與 log。
- 已經準備換完全不同任務，這時應該用 `/clear`。

### 3.2 推薦指令

```text
/compact Keep only:
- current goal
- changed files
- decisions made
- blockers
- commands already run
- test results
- next exact step
Drop:
- exploration logs
- failed search noise
- long command outputs
- repeated reasoning
```

AI-SmartBook-R1 Gate PR 專用：

```text
/compact Phase 0.5 Gate PR only. Preserve:
- target branch
- changed files
- current blockers
- commands already run
- test results
- next exact step
Drop:
- exploration logs
- failed search noise
- long command outputs
```

---

## 4. `/clear` 使用方式

當任務切換時，直接使用：

```text
/clear Gate PR done. Start next task clean.
```

適合使用 `/clear` 的例子：

| 前一任務 | 下一任務 | 建議 |
|---|---|---|
| Gate PR config 修正 | DB schema 設計 | `/clear` |
| DB schema | book-core 純函數解析 | `/clear` |
| Admin API | Student readonly API | `/clear` |
| UI bug | Deploy healthcheck | `/clear` |

簡單規則：

- 同一任務繼續：用 `/compact`。
- 完全換任務：用 `/clear`。
- 走錯方向：用 `/rewind`。
- 問旁支問題：用 `/btw`。

---

## 5. 不要中途頻繁切模型與 effort

Claude Code 的 prompt caching 依賴相同前綴。中途切模型、切 effort、開 fast mode、改 MCP/plugin、或做 compact，都可能造成下一輪需要重建部分或全部 cache。

### 5.1 建議流程

任務一開始就設定好模型與 effort：

```text
/model sonnet
/effort medium
```

然後一個任務內不要一直改。

### 5.2 AI-SmartBook-R1 任務建議

| 任務 | 建議模型 / effort |
|---|---|
| grep / 找檔 / 小修 | Sonnet low 或 medium |
| Gate PR | Sonnet medium |
| build fail / API 對齊 | Sonnet high |
| DB schema / repository 設計 | Sonnet high |
| book-core 純函數化 | Sonnet high |
| 大型架構審查 | Opus high 或 xhigh |
| 最終 code review | Opus high 或 xhigh |

---

## 6. `CLAUDE.md` 要短

`CLAUDE.md` 是每個 session 都會載入的內容，所以不要把它寫成百科全書。

建議只放「每次都必須知道」的規則：

```md
# AI-SmartBook-R1 Rules

## Execution
- Execute coding instructions in English.
- Final termination report must be in Traditional Chinese.
- Report status as success, failure, blocker, or permission-halt.

## Architecture Boundaries
- Student app must not import @ai-smartbook/ai.
- Student app must not contain API keys.
- book-core must be pure functions only.
- Do not copy code from legacy/.
- Do not add OAuth, RAG, quiz, credits, Docker, PM2, MySQL, or Redis in Phase 0.5.

## Commands
- Use pnpm, not npm.
- Before final report, run:
  - pnpm typecheck
  - pnpm build
  - bash scripts/boundary-check.sh
```

不要放進 `CLAUDE.md` 的內容：

- 長篇專案歷史。
- 完整舊報告。
- 大量 log。
- 多階段 SOP 全文。
- 只會在某一個 sprint 用到的細節。

---

## 7. 長流程改成 Skill

如果一段指令會反覆使用，但不是每次 session 都需要，請改成 skill。

建議結構：

```text
.claude/skills/phase-05-gate/SKILL.md
.claude/skills/final-report-tw/SKILL.md
.claude/skills/boundary-check/SKILL.md
```

適合放進 skill 的內容：

- Gate PR checklist。
- 最終繁中回報格式。
- PR review checklist。
- deploy 驗收流程。
- boundary-check 流程。

不適合放進 skill 的內容：

- 每次都必須遵守的安全邊界。
- 每次都必須遵守的語言規則。
- project root build command。

---

## 8. 限制 Claude 讀檔方式

很多 Token 浪費來自它亂讀大檔、亂掃整個 repo、亂打開 legacy。

請在任務開頭加入：

```text
Do not read the whole repository.
First inspect package.json, pnpm-workspace.yaml, and only the files needed for this task.
Use rg/find before reading files.
Read targeted line ranges, not entire large files.
Do not open legacy/ unless explicitly asked.
Do not inspect PDFs or generated assets unless required.
Do not read node_modules, dist, build, coverage, .git, or backups.
Do not paste long command output into the final report.
```

AI-SmartBook-R1 專用：

```text
Do not scan legacy/ by default.
Do not inspect PDF files unless the task explicitly requires PDF parsing or viewer behavior.
Do not inspect generated artifacts.
Do not introduce Docker, PM2, MySQL, Redis, OAuth, RAG, quiz, or credits during Phase 0.5 Gate work.
```

---

## 9. 任務切割方式

不要一次下這種任務：

```text
請完成 Phase 0.5，包含 DB、PDF、Admin、Student、Deploy。
```

這會造成 Claude Code 掃大量無關檔案，Token 快速爆掉。

改成一個 session 一個小任務：

```text
只做 Gate PR：
1. 修 book-core package boundary
2. 補兩個 vite.config.ts
3. 補兩個 tsconfig.json
4. 新增 boundary-check.sh
不要實作 DB / PDF / UI
```

建議 Sprint 切法：

| Sprint | 任務 | Session 策略 |
|---|---|---|
| Gate PR | config + boundary | 單一 session |
| Sprint 1 | packages/db schema | 新 session |
| Sprint 2 | book-core pure functions | 新 session |
| Sprint 3 | Admin API CRUD/upload orchestration | 新 session |
| Sprint 4 | Admin UI | 新 session |
| Sprint 5 | Student readonly API | 新 session |
| Sprint 6 | Student reader UI | 新 session |
| Sprint 7 | deploy verification | 新 session |

---

## 10. 最省 Token 的 Claude Code 開工模板

```text
Read only the relevant files for this task.
Do not scan the whole repo.
Do not inspect legacy/ unless explicitly required.
Use rg/find before reading files.
Read targeted files and line ranges only.

Task:
Implement only the Phase 0.5 Gate PR.

Scope:
- Remove book-core dependencies on ai/db.
- Add Vite configs for student/admin apps.
- Add tsconfig.json for both apps.
- Add boundary-check.sh.

Restrictions:
- Do not implement DB.
- Do not implement PDF upload or parsing.
- Do not modify UI.
- Do not add OAuth, RAG, quiz, credits, Docker, PM2, MySQL, or Redis.

Validation:
- pnpm typecheck
- pnpm build
- bash scripts/boundary-check.sh

Final report:
Traditional Chinese only.
Include status, changed files, commands run, test results, remaining risks, and suggested commit message.
```

---

## 11. 最容易浪費 Token 的行為

| 行為 | 問題 | 替代方式 |
|---|---|---|
| 一次貼整份長報告 | 每輪都帶著大段上下文 | 放入 md 檔，請 Claude 只讀指定章節 |
| 一次做整個 Phase | 會掃全 repo | 一個 session 一個 Sprint |
| 一直切模型 / effort | cache 失效或重建 | 任務開始先固定 |
| `CLAUDE.md` 寫幾百行 | 每次 session 都吃 context | 長流程改成 skill |
| 讓它讀 `legacy/` | token 爆炸且污染架構 | 預設禁止讀 legacy |
| 貼完整 build log | 大部分無用 | 只貼第一個 error 與 stack |
| 不用 `/clear` | 舊任務拖累新任務 | 換任務就 `/clear` |
| 太頻繁 `/compact` | 產生不必要摘要成本 | 自然斷點才 compact |

---

## 12. 建議加入 `CLAUDE.md` 的 Token 規則

```md
## Token Budget Rules

- Do not scan the whole repository unless explicitly required.
- Use `rg`, `find`, `git diff`, and `git status` before reading files.
- Prefer reading specific files and specific line ranges.
- Never inspect `legacy/`, `node_modules/`, `dist/`, `build/`, `.git/`, `coverage/`, or backup folders unless explicitly requested.
- Do not paste long logs into the final report. Summarize failures and include only the relevant error lines.
- Keep each task narrow. If the task expands, stop and report blocker instead of doing unrelated work.
- Use `/compact` only at natural task boundaries.
- Use `/clear` when starting an unrelated task.
```

---

## 13. AI-SmartBook-R1 推薦工作流

```text
1. /clear
2. /model sonnet
3. /effort medium
4. 下達單一小任務
5. /context 檢查 context 使用量
6. 完成一個階段後 /compact
7. 換任務前 /clear
8. 最終審查再切 Opus high / xhigh
```

對 AI-SmartBook-R1，最佳策略是：

- 每個 Sprint 開新 session。
- `CLAUDE.md` 保持短。
- 長 SOP 用 skill。
- 預設禁止讀 legacy。
- 每次只給 Claude Code 一個明確任務。

---

## 14. 結論

Claude Code 節省 Token 的核心是工程管理，不是單純壓縮文字。

最重要的三句話：

1. 一個 session 只做一個任務。
2. 先限制讀檔，再讓它動手。
3. 同任務用 `/compact`，換任務用 `/clear`。
