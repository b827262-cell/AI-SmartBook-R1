# AI-SmartBook-R2 One Click AI Model Dropdown Addendum

Executor: Codex
Date: 2026-06-24
Branch: fix/r2-admin-settings-files-integration

## Requirement Update

When AI status is green, show model selection controls near the AI status and one click workflow area.

The user should be able to select which model is used for AI steps before running the one click workflow.

## Model Options

Generation model dropdown options:

- Gemini 3.1 Flash Lite
- Gemma 4 31B
- Gemma 4 26B
- Gemini 3.5 Flash
- Gemini 3 Flash
- Gemini 2.5 Flash
- Gemini 2.5 Flash Lite

Embedding model dropdown options:

- Gemini Embedding 2
- Gemini Embedding 1

## UI Rules

- If AI status is red, show the model dropdowns disabled and show a message asking the user to provide Google AI configuration.
- If AI status is green, enable the dropdowns.
- Show the active source of AI configuration: admin saved settings or environment fallback.
- The one click workflow should use the selected generation model for Q and A and knowledge point creation.
- The one click workflow should use the selected embedding model for embedding or semantic retrieval steps when available.
- Save selected model preferences in admin settings so the selection persists after refresh.

## One Click Flow Reminder

When the user clicks one click:

1. Check PDF exists. If not, stop and show a clear message.
2. Check AI status from admin settings or environment fallback. If missing, stop and show a clear message.
3. If green, allow the user selected models to be used.
4. Create Q and A.
5. Create knowledge points.
6. Sync knowledge points to admin management.
7. Sync to student frontend publishing state.
8. Create chapters last.

## Acceptance Criteria

- Green AI status shows enabled model dropdowns.
- Red AI status shows disabled model dropdowns.
- Model choices persist after refresh.
- One click workflow reads the selected models.
- Generation and embedding models are separated.
- Typecheck and build pass for AI-adm-D1 and AI-Stu-R1.

## Final Report

Please report in Traditional Chinese with success, failure, blocker, permission-halt, branch, commit SHA, changed files, verification results, and git status.
