# AI-SmartBook-R2 Codex Task — Google AI homeUrl Link Verification

Date: 2026-06-23

## 1. Purpose

This document records the recent edits for the Student Reader external AI links and gives Codex a clear verification task.

The user requested that the Google external AI link should be:

```ts
homeUrl: "https://google.com/ai"
```

This must apply to both:

```text
1. 截圖問AI / ExternalAiAskModal provider config
2. 貼回AI筆記 / PasteBackNotePanel provider config
```

---

## 2. Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

Final report must include:

```text
建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

---

## 3. Workspace and Branch

Workspace:

```text
/home/b827262/project/AI-SmartBook-R2
```

Branch:

```text
feat/r2-student-reader-toolbar-modules
```

Repository:

```text
b827262-cell/AI-SmartBook-R1
```

---

## 4. Completed Edits to Verify

### 4.1 External AI provider config

File:

```text
apps/AI-Stu-R1/src/lib/external-ai.ts
```

Expected Google provider:

```ts
{
  id: "google",
  name: "Google",
  homeUrl: "https://google.com/ai",
  description: "開啟 Google AI，請將提示詞貼上對話區。",
  buttonText: "Google",
  buttonClass: "google"
}
```

Related commit:

```text
8e5eb3625620fc354021c5e4c11aaf88041db403
```

### 4.2 PasteBackNotePanel provider config

File:

```text
apps/AI-Stu-R1/src/components/PasteBackNotePanel.tsx
```

The local provider type must use `homeUrl`, not `url`:

```ts
interface AiProviderLink {
  name: string;
  homeUrl: string;
}
```

Expected Google provider:

```ts
{ name: "Google AI", homeUrl: "https://google.com/ai" }
```

Expected click behavior:

```ts
onClick={() => openProvider(p.homeUrl)}
disabled={!p.homeUrl}
title={p.homeUrl ? `開啟 ${p.name}` : "其他平台（手動開啟）"}
```

Related commits:

```text
ebb22d0286d9b76cdb50f9fb3269b384fb4418a6
9ceda897fccc5c3caf34892b16898c7d39fbacbc
```

---

## 5. Codex Verification Steps

Run:

```bash
cd /home/b827262/project/AI-SmartBook-R2

git fetch origin --prune
git checkout feat/r2-student-reader-toolbar-modules
git pull --ff-only origin feat/r2-student-reader-toolbar-modules

git log --oneline -10
git status --short
```

Verify the expected code:

```bash
grep -n "https://google.com/ai" apps/AI-Stu-R1/src/lib/external-ai.ts
grep -n "https://google.com/ai" apps/AI-Stu-R1/src/components/PasteBackNotePanel.tsx
grep -n "homeUrl" apps/AI-Stu-R1/src/components/PasteBackNotePanel.tsx
```

Expected:

```text
1. external-ai.ts contains homeUrl: "https://google.com/ai".
2. PasteBackNotePanel.tsx contains Google AI homeUrl: "https://google.com/ai".
3. PasteBackNotePanel.tsx uses homeUrl consistently for provider records and button open behavior.
4. PasteBackNotePanel.tsx should not use p.url or url field for provider links.
```

Run typecheck/build:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

Optional broader build if time allows:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
```

---

## 6. Manual Browser Verification

If E500 frontend is available, restart the student frontend from this branch if needed.

Manual checks:

```text
1. Open /books.
2. Open a real PDF book.
3. Open 貼回AI筆記.
4. Click Google AI.
5. Confirm it opens https://google.com/ai in a new tab.
6. Open 截圖問AI flow if available.
7. Open the external AI modal.
8. Click Google / Google AI button.
9. Confirm it opens https://google.com/ai in a new tab.
10. Confirm no prompt text or screenshot data is appended to the URL.
```

Privacy requirement:

```text
The Google AI link must only open the website. It must not upload screenshots, selected PDF text, prompt content, or note content automatically.
```

---

## 7. Safety Rules

```text
1. Do not commit .env.
2. Do not commit SQLite DB files.
3. Do not commit logs, uploads, backups, .claude, or runtime generated data.
4. Do not change unrelated Reader behavior.
5. Do not add automatic external data upload.
6. Do not append user content to the Google AI URL.
```

---

## 8. Required Report

Create a verification report:

```text
docs/r2/AI-SmartBook-R2-google-ai-link-homeurl-codex-report-20260623.md
```

Report must include:

```text
1. status: success / failure / blocker / permission-halt
2. branch and HEAD commit
3. verified files
4. grep results summary
5. typecheck/build results
6. manual browser result, if performed
7. confirmation that Google opens https://google.com/ai
8. confirmation no prompt/screenshot data is auto-sent
9. git status --short
10. confirmation no .env/db/log/.claude/runtime data committed
```

---

## 9. Commit and Push

If no source code changes are needed, commit only the report:

```text
docs(r2): add Google AI homeUrl verification report
```

If Codex finds and fixes remaining source mismatch, use:

```text
fix(r2): align Google AI homeUrl links
```

Push:

```text
origin feat/r2-student-reader-toolbar-modules
```

---

## 10. Final Termination Report Format

Final report must be in Traditional Chinese:

```text
狀態：success / failure / blocker / permission-halt
分支：feat/r2-student-reader-toolbar-modules
HEAD commit：...
驗證檔案：
- apps/AI-Stu-R1/src/lib/external-ai.ts
- apps/AI-Stu-R1/src/components/PasteBackNotePanel.tsx

Google AI homeUrl：...
是否仍有舊 url 欄位：否/是
AI-Stu-R1 typecheck：...
AI-Stu-R1 build：...
手動瀏覽器驗證：...
是否自動外傳 prompt / screenshot：否
報告檔案：...
Commit SHA：...
Push 結果：...
git status --short：...
是否提交 .env/db/log/.claude/runtime data：否
限制與後續：...

建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

---

## 11. Success Criteria

```text
1. Both external-ai.ts and PasteBackNotePanel.tsx use https://google.com/ai.
2. PasteBackNotePanel.tsx uses homeUrl consistently.
3. AI-Stu-R1 typecheck passes.
4. AI-Stu-R1 build passes.
5. No automatic upload or URL query transmission is added.
6. No .env/db/log/.claude/runtime data is committed.
```
