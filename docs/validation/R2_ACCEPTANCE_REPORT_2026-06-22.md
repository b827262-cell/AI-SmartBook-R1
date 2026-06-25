# AI-SmartBook-R2 Acceptance Report

Date: 2026-06-22

Repository: `AI-SmartBook-R2`

Branch at time of validation: `feat/r2-question-bank-json-import`

## Scope

This report covers the requested seven validation categories:

1. Basic service connectivity
2. Book data availability
3. Branch A: Question Bank JSON Import
4. Branch B: Smart Solve JSON Import
5. Branch C: AI Notes Navigation
6. Regression checks
7. SQLite and safety checks

## Environment Constraint

This Codex execution environment does not allow local processes to bind to listen ports. Attempts to start the expected services on ports `4300`, `4310`, `5173`, and `5174` failed with `listen EPERM: operation not permitted`.

Because of that restriction, browser-driven and live HTTP acceptance steps could not be completed in this environment. Validation was therefore limited to:

- repository route and API inspection
- SQLite verification
- ignore-rule and workspace safety verification
- TypeScript validation where possible
- comparison between expected acceptance criteria and the code currently present in this working tree

## Summary

### Passed

- SQLite integrity and table-count checks
- Git ignore coverage for `.env`, `.db`, and `.log`
- Admin app TypeScript check

### Failed or Blocked

- Basic service connectivity: blocked by environment listen-port restriction
- Browser/manual UI acceptance: blocked by environment listen-port restriction
- Branch A/B/C feature acceptance: current working tree does not expose the routes and APIs described in the requested acceptance criteria
- Student app TypeScript check: fails in `BookReaderPage.tsx`

## 0. Basic Service Connectivity

Requested endpoints:

- API: `http://E500_IP:4300`
- Admin: `http://E500_IP:5174`
- Student web: `http://E500_IP:5173/books`
- Student API: `http://E500_IP:4310`

Requested local checks:

```bash
curl -I http://127.0.0.1:5174/
curl -I http://127.0.0.1:5173/books
curl -s http://127.0.0.1:4300/api/admin/books | head -c 1000
```

Result:

- Could not complete service connectivity validation in this environment
- Starting any of the local services failed with `listen EPERM: operation not permitted`
- Therefore no live HTTP `200` verification was possible here

Status: Blocked by environment

## 1. Book Data Availability

Direct browser verification could not be executed because the frontend services could not be started in this environment.

However, SQLite verification confirmed that:

- `books` table exists and is readable
- `books` row count is `13`

This supports the expectation that book data is present in the DB, but does not replace live UI validation of:

- admin books list rendering
- student `/books` rendering
- cover fallback behavior
- reader entry flow

Status: Data present in SQLite, UI acceptance blocked

## 2. Branch A: Question Bank JSON Import

Expected acceptance items included:

- page route under admin
- JSON upload handling
- malformed JSON error handling
- partial-row validation
- import history
- `question_bank_import_jobs` write verification

### What was found

The current admin router does not include a dedicated Question Bank import page route. Current routes are limited to the standard admin pages and book detail flows.

Reference:

- [apps/AI-adm-D1/src/App.tsx](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/App.tsx#L19)

Server-side route inspection also did not find a Question Bank import API. Existing import-related endpoints are:

- JSON index upload
- reader TOC import
- QA markdown import

References:

- [apps/AI-adm-D1/src/server/index.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/server/index.ts#L1308)
- [apps/AI-adm-D1/src/server/index.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/server/index.ts#L1403)
- [apps/AI-adm-D1/src/server/index.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/server/index.ts#L1767)

### SQLite observation

`question_bank_import_jobs` contains `2` rows.

### Assessment

The database table exists and contains data, but the Question Bank import UI/API described in the acceptance criteria is not present in this working tree.

Status: Not accepted against requested criteria

## 3. Branch B: Smart Solve JSON Import

Expected acceptance items included:

- page route under admin
- book-scoped Smart Solve JSON upload
- scope mapping and unmapped handling
- import history and job detail
- `smart_solve_import_jobs` and `smart_solve_import_items` write verification

### What was found

The current admin router does not include a dedicated Smart Solve import page route.

Reference:

- [apps/AI-adm-D1/src/App.tsx](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/App.tsx#L19)

Server-side route inspection did not find a Smart Solve import API in the current working tree.

### SQLite observation

- `smart_solve_import_jobs` contains `2` rows
- `smart_solve_import_items` contains `4` rows

### Assessment

The database tables exist and contain data, but the Smart Solve import UI/API described in the acceptance criteria is not present in this working tree.

Status: Not accepted against requested criteria

## 4. Branch C: AI Notes Navigation

Expected acceptance items included:

- note list retrieval
- note navigation endpoint
- click note and jump reader to matching PDF page
- graceful behavior for notes without page anchor

### What was found

The current student notes API supports only:

- list notes
- create note
- update note
- delete note

References:

- [apps/AI-adm-D1/src/server/index.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/server/index.ts#L1898)
- [apps/AI-Stu-R1/src/studentClient.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-Stu-R1/src/studentClient.ts#L95)

No `/api/student/books/:bookId/notes/:noteId/navigate` endpoint was found in the current working tree.

In the UI, `SmartNotesPanel` currently provides:

- note display
- note delete action
- canvas preview modal

It does not implement click-to-navigate behavior for notes.

Reference:

- [apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx](/home/b827262/project/AI-SmartBook-R2/apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx#L343)

### SQLite observation

`smart_book_notes` contains `4` rows.

### Assessment

The underlying notes table exists and has data, but the note navigation API and note-click jump behavior required by the acceptance criteria are not present in this working tree.

Status: Not accepted against requested criteria

## 5. Regression Checks

Live regression testing of the following could not be completed due to the environment restriction on starting local services:

- admin books list
- admin book detail
- PDF file list
- reader TOC
- student `/books`
- enter reader
- PDF page navigation
- chat panel
- smart notes toggle
- mobile frontend behavior

### Static validation

Admin TypeScript:

- Passed

Student TypeScript:

- Failed

Errors were reported in `BookReaderPage.tsx`, including nullability and ref typing issues.

Status: Blocked for live regression; static check indicates student-side risk

## 6. SQLite Validation

Executed checks produced:

```text
ok
books|13
question_bank_import_jobs|2
smart_solve_import_jobs|2
smart_solve_import_items|4
smart_book_notes|4
```

Assessment:

- `integrity_check = ok`
- `books = 13`
- `question_bank_import_jobs >= 2`
- `smart_solve_import_jobs >= 2`
- `smart_solve_import_items >= 4`
- `smart_book_notes >= 4`

Status: Passed

## 7. Safety Checks

### Git status

`git status --short` returned:

```text
?? .claude/
```

This indicates the worktree is otherwise clean except for a local untracked `.claude/` directory outside the scope of this report.

### Ignore rules

Verified:

- `.env` is ignored
- `*.db` is ignored
- `*.log` is ignored

Examples confirmed:

- `.env`
- `data/ai-smartbook-r1.db`
- `apps/AI-adm-D1/data/ai-smartbook-r1.db`
- `r2-api.log`
- `r2-admin.log`
- `r2-stu-api.log`
- `r2-student.log`

Status: Passed

## Supporting References

- [apps/AI-adm-D1/src/App.tsx](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/App.tsx#L19)
- [apps/AI-adm-D1/src/server/index.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/server/index.ts#L1308)
- [apps/AI-adm-D1/src/server/index.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/server/index.ts#L1403)
- [apps/AI-adm-D1/src/server/index.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/server/index.ts#L1767)
- [apps/AI-adm-D1/src/server/index.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/src/server/index.ts#L1898)
- [apps/AI-Stu-R1/src/studentClient.ts](/home/b827262/project/AI-SmartBook-R2/apps/AI-Stu-R1/src/studentClient.ts#L95)
- [apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx](/home/b827262/project/AI-SmartBook-R2/apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx#L343)
- [packages/db/src/client.ts](/home/b827262/project/AI-SmartBook-R2/packages/db/src/client.ts#L37)

## Final Assessment

Within this Codex environment:

- SQLite and ignore-rule validation passed
- live service and browser acceptance could not be performed because local listen sockets are blocked
- the current working tree does not expose the Branch A/B/C routes and APIs described in the requested acceptance criteria
- the student app still has TypeScript errors, so reader-related regression risk remains

This report should therefore be treated as a constrained environment audit, not as a full end-to-end acceptance signoff on E500.
