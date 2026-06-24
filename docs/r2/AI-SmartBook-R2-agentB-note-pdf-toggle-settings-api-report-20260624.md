# AI-SmartBook-R2｜Agent B Note / PDF Toggle Settings API Report

> Branch: `fix/r2-note-pdf-toggle-settings-api`  
> Base: `fix/r2-smart-features-final-integration`  
> Commit: `f161d76`  
> Date: 2026-06-24  
> Executor: Claude Sonnet 4.6

---

## Agent Report

### Status
- **success:** 全部完成
- **failure:** 無
- **blocker:** 無
- **permission-halt:** 無

---

### Git
- **branch:** `fix/r2-note-pdf-toggle-settings-api`
- **commit SHA:** `f161d76`
- **changed files:**
  - `apps/AI-adm-D1/src/server/index.ts` — 新增 ReaderFeatureSettings 型別、readReaderFeatureSettings()、GET/PUT admin routes、GET student route
  - `apps/AI-adm-D1/src/pages/ReaderFeaturesPage.tsx` — 新增（後台開關管理頁）
  - `apps/AI-adm-D1/src/App.tsx` — 新增 import + `/admin/settings/reader-features` route
  - `apps/AI-adm-D1/src/navigation/adminNav.ts` — 新增「閱讀器功能開關」nav 入口

---

### Implemented Scope

| 項目 | 說明 |
|---|---|
| Schema | `NoteFeatureSettings`（4 欄位）+ `PdfToolSettings`（7 欄位）+ `ReaderFeatureSettings` 組合型別 |
| 儲存方式 | `app_settings` key=`reader_feature_settings`，JSON，無 DB migration |
| 預設值 | 全部 `true`，不破壞既有學生端功能 |
| Fallback | `readReaderFeatureSettings()` 讀取失敗時回傳 DEFAULT，缺欄位以 spread 補齊 |
| Admin GET API | `GET /api/admin/settings/reader-features` |
| Admin PUT API | `PUT /api/admin/settings/reader-features`（需 auth guard，dev 模式略過） |
| Student GET API | `GET /api/student/settings/reader-features`（read-only，無 auth） |
| 後台 UI | `ReaderFeaturesPage.tsx`：4 個筆記開關 + 7 個 PDF 工具開關，點擊即時儲存 |
| Route | `/admin/settings/reader-features` 已在 App.tsx 註冊 |
| Nav 入口 | 「閱讀器功能開關」加入「管理後台」群組，路徑獨立不與其他 nav 重複 |

---

### API Contract（供 Agent C 使用）

**Endpoint:**

```
GET  /api/admin/settings/reader-features   → ReaderFeatureSettings
PUT  /api/admin/settings/reader-features   → ReaderFeatureSettings（寫入）
GET  /api/student/settings/reader-features → ReaderFeatureSettings（學生端讀取）
```

**Response schema:**

```json
{
  "noteFeatures": {
    "smartNotesEnabled": true,
    "pasteBackNotesEnabled": true,
    "pasteBackAiNotesEnabled": true,
    "screenshotAskAiEnabled": true
  },
  "pdfTools": {
    "highlightEnabled": true,
    "penEnabled": true,
    "lineEnabled": true,
    "rectangleEnabled": true,
    "circleEnabled": true,
    "stickyNoteEnabled": true,
    "eraserEnabled": true
  }
}
```

**PUT request body:** 接受 partial（只送要更新的欄位），server 端 spread 合併既有設定。

**Agent C fallback 建議：**
- 若 `GET /api/student/settings/reader-features` 失敗或 timeout，以全部 `true` 作為 fallback，不可讓學生端白畫面。
- 若回傳欄位缺失，以 `true` 作為缺失欄位的 fallback 值。

---

### Verification

| 項目 | 結果 |
|---|---|
| AI-adm-D1 typecheck | ✅ 0 errors |
| AI-adm-D1 build | ✅ 459.85 kB |
| Runtime probe — GET 預設值 | ✅ 全部 `true` |
| Runtime probe — PUT disable smartNotes + highlight | ✅ 持久化 `false` |
| Runtime probe — GET after PUT（確認持久化） | ✅ `smartNotesEnabled: False, highlightEnabled: False` |
| Runtime probe — student endpoint | ✅ 回傳與 admin 同步（`smartNotesEnabled: False`） |
| Runtime probe — 還原設定 | ✅ PUT 還原後 GET 確認 `true` |
| env tracking | ✅ `.env.example` 僅範例，無 API key |
| secret scan | ✅ clean |

---

### Persistence 驗證流程

```bash
# 1. 初始狀態：全部 true
GET /api/admin/settings/reader-features → all true ✅

# 2. 關閉 smartNotes + highlight
PUT {"noteFeatures":{"smartNotesEnabled":false},"pdfTools":{"highlightEnabled":false}}
→ {"noteFeatures":{"smartNotesEnabled":false,...},"pdfTools":{"highlightEnabled":false,...}} ✅

# 3. 重新讀取（模擬重整後台）
GET /api/admin/settings/reader-features
→ smartNotesEnabled: False, highlightEnabled: False ✅

# 4. 學生端讀取
GET /api/student/settings/reader-features
→ student sees smartNotesEnabled: False ✅

# 5. 還原
PUT {"noteFeatures":{"smartNotesEnabled":true},"pdfTools":{"highlightEnabled":true}}
→ restored: True True ✅
```

---

### Remaining Risks
- **risk 1:** Auth guard 在 `ADMIN_SECRET` 未設定時略過，生產環境需設定 env var
- **risk 2:** 學生端讀取為 read-only GET，不需 auth，若未來需要每書本獨立開關需擴充 schema
- **risk 3:** Agent C 需在整合分支對齊 type 定義（建議直接 fetch API 而非 import shared type，避免跨分支 TS 衝突）

---

### Final Decision
- **ready for integration**
- **reason:** API 3 routes 全通過 runtime probe，持久化確認，typecheck/build 0 error，不破壞既有功能（全 true 預設），API contract 清楚供 Agent C 使用。
