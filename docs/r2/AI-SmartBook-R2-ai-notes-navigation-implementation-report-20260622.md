# AI-SmartBook-R2 AI Notes Navigation — Implementation Report

Date: 2026-06-22

## Status

**success**

---

## Branch

`feat/r2-ai-notes-navigation`

Base branch: `feat/ai-smartbook-r2-modular-imports`

Independent from Branch A and Branch B — no cross-branch dependency.

---

## Changed Files

| File | Change |
|------|--------|
| `apps/AI-adm-D1/src/server/index.ts` | Added `GET /api/student/books/:bookId/notes/:noteId/navigate` endpoint |
| `apps/AI-Stu-R1/src/studentClient.ts` | Added `navigateNote(bookId, noteId)` client method |
| `apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx` | Added `onNavigate?: (note: SmartBookNote) => void` prop; added "定位" button per note |
| `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | Added `SmartBookNote` type import; added `handleNoteNavigate(note)` function; passed `onNavigate` to both SmartNotesPanel instances (desktop + mobile) |
| `docs/r2/AI-SmartBook-R2-ai-notes-navigation-implementation-report-20260622.md` | NEW — this report |

---

## API Changes

### New endpoint

```
GET /api/student/books/:bookId/notes/:noteId/navigate
```

**Response:**
```json
{
  "noteId": "note_xxx",
  "bookId": "book_xxx",
  "chapterId": "chapter_xxx | null",
  "pageNumber": 42,
  "sourceMessageId": null,
  "anchor": true,
  "fallback": null
}
```

- `anchor: true` — note has navigation data (pageNumber or chapterId is set)
- `anchor: false` — note has no navigation data; `fallback` contains a user-facing message
- Returns `404` if bookId or noteId not found

---

## UI Behavior

### SmartNotesPanel changes

- Added optional `onNavigate?: (note: SmartBookNote) => void` prop (fully backward-compatible — no change when omitted)
- Each note row now shows a **「定位」** button when the note has `pageNumber != null` OR `chapterId != null`
- Button `title` shows `"跳至第 N 頁"` or `"跳至章節"` on hover
- Clicking calls `onNavigate(note)` — the parent BookReaderPage handles the actual page jump

### BookReaderPage changes

- Added `handleNoteNavigate(note: SmartBookNote)` function:
  1. If `note.pageNumber != null` → `jumpToPage(note.pageNumber)` + close mobile notes panel
  2. Else if `note.chapterId` is set → find chapter by ID from `chapters[]`, `jumpToPage(chapter.pageStart)` if available; else show non-blocking notice
  3. Fallback: `setMobileNoticeMessage("此筆記的章節無法定位（缺少頁碼）")`
- Passed `onNavigate={handleNoteNavigate}` to both SmartNotesPanel instances:
  - Desktop right panel (line ~1224)
  - Mobile notes sheet (line ~1314)

---

## Backward Compatibility

- `smart_book_notes` table schema: **unchanged** — no new columns, no migration required
- All existing fields (`chapterId`, `pageNumber`, `sourceMessageId`) already existed in the table and schema
- `SmartNotesPanel` `onNavigate` prop is optional — existing usages without it continue to work
- Notes without navigation data display normally; only the "定位" button is hidden
- No changes to note create/update/delete behavior

---

## Scope Mapping Logic

The `handleNoteNavigate` function resolves navigation in priority order:

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | `note.pageNumber != null` | `jumpToPage(note.pageNumber)` |
| 2 | `note.chapterId` set, chapter has `pageStart` | `jumpToPage(chapter.pageStart)` |
| 3 | `note.chapterId` set but no `pageStart` | `setMobileNoticeMessage(fallback)` |
| 4 | Neither pageNumber nor chapterId | button not shown |

---

## Typecheck Result

| Package | Result |
|---------|--------|
| `@ai-smartbook/schema` | **PASS** (pre-existing, no changes) |
| `@ai-smartbook/db` | **PASS** (pre-existing, no changes) |
| `AI-adm-D1` (server) | **PASS** (tsc --noEmit, 0 errors) |
| `AI-Stu-R1` (student app) | **PASS** (tsc --noEmit, 0 errors) |

---

## Build Result

### Admin frontend (AI-adm-D1)

```
vite v8.0.16 building client environment for production...
✓ 138 modules transformed.
dist/assets/index.js   400.69 kB │ gzip: 115.43 kB
✓ built in 241ms
```

**PASS**

### Student frontend (AI-Stu-R1)

```
vite v8.0.16 building client environment for production...
✓ built in 432ms
dist/assets/index.js   763.90 kB (pdf.worker included)
```

**PASS** (chunk size warning is pre-existing, not introduced by this branch)

---

## Runtime Verification

Server: `AI-adm-D1` on port 4300, DB: `data/ai-smartbook-r1.db`

| # | Test | Result |
|---|------|--------|
| T1 | `GET /api/admin/books` → 13 books returned | **PASS** |
| T2 | `GET /api/student/.../notes/:noteId/navigate` with pageNumber=42 | `anchor:true, pageNumber:42, fallback:null` — **PASS** |
| T3 | `GET navigate` for note with no pageNumber/chapterId | `anchor:false, fallback:"此筆記沒有頁碼或章節資訊"` — **PASS** |
| T4 | `GET navigate` for nonexistent noteId | `404 {"error":"note not found"}` — **PASS** |
| T5 | Student frontend port 5173 | HTTP 200 — **PASS** |
| T6 | `GET /api/admin/books` non-empty | 13 books — **PASS** |

---

## Known Limitations

1. **sourceMessageId navigation not implemented** — if a note has `sourceMessageId`, the API returns it but the UI does not scroll to the related chat message. Implementing this requires a chat panel ref or scroll-to mechanism; deferred.
2. **"定位" button hidden when no navigation data** — notes without `pageNumber` or `chapterId` show no button. There is no user-visible message on the note itself; the fallback only appears on mobile as a notice toast.
3. **No fuzzy chapterTitle matching** — notes with only `chapterTitle` (and no `chapterId`) cannot be navigated to via button; `chapterId` must be set for chapter-based navigation.
4. **No DB migration needed** — all required fields already existed; no new SQLite tables or columns were added.

---

## `git status --short`

```
M apps/AI-adm-D1/src/server/index.ts
M apps/AI-Stu-R1/src/studentClient.ts
M apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx
M apps/AI-Stu-R1/src/pages/BookReaderPage.tsx
? docs/r2/AI-SmartBook-R2-ai-notes-navigation-implementation-report-20260622.md
```

---

## .env and DB Files

- `.env` committed: **No**
- SQLite `.db` files committed: **No**
- Logs, uploads, backups: **No**

---

## Commit SHA

See git log after push.

## Push Result

See push command output.
