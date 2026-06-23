# AI-SmartBook-R2 PDF Screenshot Ask AI — Two-Agent Dispatch

Date: 2026-06-23

## 1. Purpose

This dispatch splits the PDF Reader `截圖問 AI` feature into two coordinated Agent tasks.

Reference documents:

```text
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-feature-task-20260623.md
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-external-buttons-addendum-20260623.md
```

Base branch:

```text
feat/r2-integrate-imports-notes
```

Final feature branch:

```text
feat/r2-pdf-screenshot-ask-ai
```

Execution rule:

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

---

## 2. Important Coordination Rule

The two agents may work in parallel only if they avoid editing the same files.

Recommended safe split:

```text
Agent 1: Reader UI, screenshot selection, canvas capture, modal shell.
Agent 2: provider config, clipboard helper, external AI buttons, prompt template support.
```

Avoid both agents editing `BookReaderPage.tsx` at the same time.

Best sequence:

```text
1. Agent 1 creates the feature branch and core modal/overlay shell.
2. Agent 2 branches from Agent 1's pushed branch or works on utility files only.
3. Codex-Spark or AGY performs final integration and conflict resolution.
```

---

# 3. Agent 1 — Core PDF Screenshot Selection

## 3.1 Suggested model

```text
Claude Sonnet 4.6 Medium/High
```

## 3.2 Branch

```text
feat/r2-pdf-screenshot-ask-ai-core
```

Base:

```text
feat/r2-integrate-imports-notes
```

## 3.3 Responsibility

Agent 1 owns the core Reader workflow:

```text
1. Add 截圖問 AI button in PDF Reader toolbar.
2. Add screenshot selection mode.
3. Add orange rectangle, dim overlay, corner handles.
4. Add confirm/cancel controls.
5. Capture selected PDF canvas region.
6. Add modal shell with image preview.
7. Keep Reader stable after close/cancel.
```

Recommended files:

```text
apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
apps/AI-Stu-R1/src/components/PdfScreenshotSelectionOverlay.tsx
apps/AI-Stu-R1/src/components/PdfScreenshotAskAiModal.tsx
apps/AI-Stu-R1/src/utils/pdfScreenshot.ts
apps/AI-Stu-R1/src/styles.css
```

Agent 1 should not implement the full external AI provider list except a placeholder area for Agent 2.

## 3.4 Agent 1 Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Please read:
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-feature-task-20260623.md

Task:
Implement the core PDF screenshot selection workflow.

Workspace:
/home/b827262/project/AI-SmartBook-R2

Base branch:
feat/r2-integrate-imports-notes

Create branch:
feat/r2-pdf-screenshot-ask-ai-core

Scope:
- Reader toolbar button: 截圖問 AI
- selection overlay
- orange selection box and handles
- confirm/cancel
- capture selected PDF canvas area
- modal shell with image preview

Do not implement external provider config in this task.
Do not add backend upload or DB migration.
Do not auto-send screenshot data externally.

Validation:
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build

Create report:
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-core-report-20260623.md

Commit:
feat(r2): add PDF screenshot ask AI core workflow

Push:
origin feat/r2-pdf-screenshot-ask-ai-core
```

---

# 4. Agent 2 — External AI Buttons and Clipboard Tools

## 4.1 Suggested model

```text
Codex-Spark 128K or GPT-5.4 Medium/High
```

## 4.2 Branch

Recommended after Agent 1 push:

```text
feat/r2-pdf-screenshot-ask-ai-buttons
```

Base:

```text
feat/r2-pdf-screenshot-ask-ai-core
```

If Agent 1 is not done yet, Agent 2 may work docs/utility-only from:

```text
feat/r2-integrate-imports-notes
```

but should avoid editing `BookReaderPage.tsx`.

## 4.3 Responsibility

Agent 2 owns safe prompt/copy/external button utilities:

```text
1. AI provider config.
2. safe open helper.
3. clipboard helper.
4. prompt templates.
5. external AI button rendering inside the modal.
6. copy prompt / copy image UI behavior.
7. fallback messages.
```

Recommended files:

```text
apps/AI-Stu-R1/src/utils/aiAskProviders.ts
apps/AI-Stu-R1/src/utils/openExternalAi.ts
apps/AI-Stu-R1/src/utils/clipboard.ts
apps/AI-Stu-R1/src/utils/screenshotAskAiPrompts.ts
apps/AI-Stu-R1/src/components/PdfScreenshotAskAiModal.tsx
apps/AI-Stu-R1/src/styles.css
```

Agent 2 should not change PDF canvas selection logic unless absolutely necessary.

## 4.4 Agent 2 Prompt

```text
GitHub Execution in English.
Termination report in Traditional Chinese.

Please read:
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-external-buttons-addendum-20260623.md

Task:
Implement the safe external AI buttons, clipboard helpers, and prompt templates for the PDF Screenshot Ask AI modal.

Workspace:
/home/b827262/project/AI-SmartBook-R2

Preferred base branch:
feat/r2-pdf-screenshot-ask-ai-core

Create branch:
feat/r2-pdf-screenshot-ask-ai-buttons

Scope:
- provider config
- open external AI helper
- copy prompt helper
- copy image helper with browser fallback
- prompt templates
- modal provider buttons

Safety rules:
- Do not auto-upload screenshots.
- Do not put prompt/image content into URL query strings.
- Only open new tabs after explicit user click.
- Do not add backend upload or DB migration.
- Avoid editing BookReaderPage.tsx unless integration requires it.

Validation:
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build

Create report:
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-buttons-report-20260623.md

Commit:
feat(r2): add screenshot ask AI provider buttons

Push:
origin feat/r2-pdf-screenshot-ask-ai-buttons
```

---

# 5. Final Integration Step

After both agents finish, a third short integration pass should merge:

```text
feat/r2-pdf-screenshot-ask-ai-core
feat/r2-pdf-screenshot-ask-ai-buttons
```

into final branch:

```text
feat/r2-pdf-screenshot-ask-ai
```

Run:

```text
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
```

Create final report:

```text
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-implementation-report-20260623.md
```

---

## 6. Recommendation

Best practical assignment:

```text
Agent 1 / Claude: core Reader screenshot selection and modal shell.
Agent 2 / Codex-Spark: provider buttons, clipboard helpers, prompt templates, typecheck fixes.
AGY later: visual/RWD/manual screenshot acceptance.
```

Do not merge into `feat/r2-integrate-imports-notes` until final typecheck/build and manual Reader test pass.
