# AI-SmartBook-R2 Codex-Spark Report Task

Date: 2026-06-22

## Purpose

Create a documentation-only architecture report for evolving `AI-SmartBook-R1` into `AI-SmartBook-R2`.

The current project uses SQLite. The three reference branches come from a MySQL-oriented project flow, so they must be treated as feature references only, not as direct merge targets.

## Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

## Target Project

Repository:

```text
b827262-cell/AI-SmartBook-R1
```

Default branch:

```text
master
```

Recommended working branch:

```text
feat/ai-smartbook-r2-modular-imports
```

## Reference Features

Use these only as functional references:

```text
1. question-bank-json-import
2. smart-solve-json-import
3. fix-ai-notes-navigation
```

Feature meaning:

```text
question-bank-json-import
=> Question Bank JSON import.

smart-solve-json-import
=> Smart Solve JSON import and Smart Book / tutor scope flow.

fix-ai-notes-navigation
=> AI Notes / Smart Book notes navigation correction.
```

## Critical Rule

```text
Do not directly merge MySQL-oriented branches into AI-SmartBook-R1.
Do not introduce MySQL dependency.
Do not modify source code in this round.
Do not create migrations in this round.
Only create the architecture Markdown report.
```

## Required Output File

Create this file in AI-SmartBook-R1:

```text
docs/r2/AI-SmartBook-R2-modular-import-plan-20260622.md
```

## Required Report Sections

The report must include:

```text
1. Executive Summary
2. Why Direct Merge Is Not Allowed
3. R1 Current Architecture Assumption
4. R2 Target Architecture
5. SQLite Adaptation Strategy
6. Module Boundary Design
7. Module 1: Question Bank JSON Import
8. Module 2: Smart Solve JSON Import
9. Module 3: AI Notes Navigation
10. Proposed Folder Structure
11. Proposed SQLite Tables
12. API Boundary Proposal
13. Frontend Integration Proposal
14. Implementation Order
15. Risk Notes
16. Validation Checklist
17. Recommended Next Codex-Spark Task
```

## Module Design Direction

### Question Bank JSON Import

Design as a SQLite-compatible module for importing external JSON question banks.

Possible responsibilities:

```text
validate JSON structure, store questions, choices, answers, explanations, metadata, book/chapter/page mapping
```

Suggested module name:

```text
question-bank-import
```

### Smart Solve JSON Import

Design as a SQLite-compatible module for Smart Solve items and tutor scope mapping.

Possible responsibilities:

```text
import Smart Solve JSON, map items to book/chapter/page/scope, prepare data for smart solving or Q&A
```

Suggested module name:

```text
smart-solve-import
```

### AI Notes Navigation

Design as a student reader navigation improvement.

Possible responsibilities:

```text
connect AI notes to PDF page, chapter, selected text anchors, and jump back to the correct reader location
```

Suggested module name:

```text
reader-notes-navigation
```

## Proposed SQLite Table Names To Discuss

The report should propose, not implement, tables such as:

```text
QuestionBankImportJob
QuestionItem
QuestionChoice
QuestionSourceMap
SmartSolveImportJob
SmartSolveItem
SmartSolveKnowledgePoint
SmartSolveBookScope
ReaderNote
ReaderNoteAnchor
ReaderNoteConversation
ReaderNoteSource
```

## Recommended Implementation Order

```text
1. R2 architecture report
2. SQLite schema proposal
3. question-bank-import
4. smart-solve-import
5. reader-notes-navigation
6. admin UI tabs
7. student reader verification
8. build and acceptance testing
```

## Required Risk Notes

The report must mention:

```text
MySQL schema cannot be copied directly into SQLite.
Direct merge may break R1.
Reference branches may contain unrelated changes.
Reader and notes changes may conflict with existing student reader UI.
Import modules must validate JSON strictly.
Large branch diffs should be ported by feature, not by merge.
```

## Required Validation Checklist

Include checks for:

```text
build passes
SQLite schema is valid
admin import page loads
invalid JSON returns clear error
valid question bank JSON imports correctly
Smart Solve JSON maps to book/chapter/page correctly
student reader notes jump to correct page
existing R1 upload and reader flow still works
```

## Commit Requirement

After creating the report, stage only:

```text
docs/r2/AI-SmartBook-R2-modular-import-plan-20260622.md
```

Commit message:

```text
docs: add AI SmartBook R2 modular import plan
```

Push to:

```text
origin feat/ai-smartbook-r2-modular-imports
```

## Required Final Reply

Final report must be in Traditional Chinese and include:

```text
狀態：success / failure / blocker / permission-halt
建立檔案路徑
分支
Commit SHA
Push 結果
git status --short
是否修改原始碼：否
下一步建議
```
