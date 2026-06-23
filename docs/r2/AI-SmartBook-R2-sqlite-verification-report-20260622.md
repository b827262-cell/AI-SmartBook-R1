# AI-SmartBook-R2 SQLite 寫入驗證報告

Date: 2026-06-22

---

## 驗證目的

確認三個 R2 設計分支的資料是否可正確寫入 SQLite，包含 table 建立、資料格式、型別與約束條件。

---

## 資料庫資訊

| 項目 | 值 |
|------|-----|
| 資料庫路徑 | `/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db` |
| 引擎 | SQLite（`better-sqlite3`，sync API）|
| migration 方式 | `runMigrations()` — `CREATE TABLE IF NOT EXISTS`（冪等）|
| 驗證時間 | 2026-06-22 |

---

## Table 總覽（共 14 個）

| Table 名稱 | 來源分支 | 狀態 |
|-----------|---------|------|
| `books` | 既有 | ✅ |
| `book_files` | 既有 | ✅ |
| `book_contents` | 既有 | ✅ |
| `book_chapters` | 既有 | ✅ |
| `chat_sessions` | 既有 | ✅ |
| `chat_messages` | 既有 | ✅ |
| `pdf_access_logs` | 既有 | ✅ |
| `book_ai_jobs` | 既有 | ✅ |
| `book_qa_logs` | 既有 | ✅ |
| `app_settings` | 既有 | ✅ |
| `smart_book_notes` | 既有（Branch C 沿用）| ✅ |
| `question_bank_import_jobs` | **Branch A** | ✅ 新建 |
| `smart_solve_import_jobs` | **Branch B** | ✅ 新建 |
| `smart_solve_import_items` | **Branch B** | ✅ 新建 |

---

## Branch A — Question Bank JSON Import

### Table：`question_bank_import_jobs`

**寫入筆數：2 筆**

| 欄位 | 說明 | 驗證結果 |
|------|------|---------|
| `id` | `qbi_` 前綴 UUID | ✅ |
| `file_name` | 上傳檔案名稱 | ✅ |
| `status` | `pending / done / failed` | ✅ 兩筆均為 `done` |
| `total_records` | 總筆數 | ✅ |
| `valid_records` | 驗證通過筆數 | ✅ |
| `invalid_records` | 驗證失敗筆數 | ✅ |
| `result_json` | JSON 字串摘要 | ✅ |
| `error_message` | 錯誤訊息（可 null）| ✅ |
| `created_at` | ISO 8601 時間戳 | ✅ |

**直查結果：**

```
qbi_c7154b4c-4d13-4f  status=done  (valid JSON array)
qbi_41fc4fe0-e86b-48  status=done  (valid JSON array)
```

**結論：Branch A 資料可正確寫入 SQLite ✅**

---

## Branch B — Smart Solve JSON Import

### Table：`smart_solve_import_jobs`

**寫入筆數：2 筆**

| 欄位 | 說明 | 驗證結果 |
|------|------|---------|
| `id` | `ssi_` 前綴 UUID | ✅ |
| `book_id` | 關聯書籍 ID | ✅ |
| `file_name` | 上傳檔案名稱 | ✅ |
| `status` | `pending / done / failed` | ✅ 兩筆均為 `done` |
| `total_records` | 總筆數 | ✅ |
| `valid_records` | 有效筆數 | ✅ |
| `mapped_records` | 已映射章節筆數 | ✅ |
| `unmapped_records` | 未映射章節筆數 | ✅ |
| `invalid_records` | 無效筆數 | ✅ |
| `result_json` | JSON 摘要字串 | ✅ |
| `error_message` | 錯誤訊息（可 null）| ✅ |
| `created_at` / `updated_at` | ISO 8601 時間戳 | ✅ |

**直查結果：**

| ID | 檔案 | status | mapped | unmapped |
|----|------|--------|--------|----------|
| `ssi_7e18b84f...` | `ss_array.json` | `done` | 0 | 3 |
| `ssi_daeed080...` | `ss_wrapper.json` | `done` | 0 | 1 |

> `mapped=0` 為正確結果——測試書籍沒有對應章節 scope，所有 items 記為 `unmapped`（非錯誤）。

---

### Table：`smart_solve_import_items`

**寫入筆數：4 筆**

| 欄位 | 說明 | 驗證結果 |
|------|------|---------|
| `id` | `ssii_` 前綴 UUID | ✅ |
| `job_id` | 關聯 job ID | ✅ |
| `book_id` | 關聯書籍 ID | ✅ |
| `external_id` | 外部來源 ID（可 null）| ✅ |
| `prompt` | 題目文字（必填）| ✅ |
| `solution` | 解答（可 null）| ✅ |
| `explanation` | 說明（可 null）| ✅ |
| `skill` | 技能標籤（可 null）| ✅ |
| `difficulty` | 難度（可 null）| ✅ |
| `scope_json` | Scope JSON 字串（可 null）| ✅ |
| `tags_json` | Tags JSON 字串（可 null）| ✅ |
| `metadata_json` | Metadata JSON 字串（可 null）| ✅ |
| `status` | `mapped / unmapped / invalid` | ✅ 四筆均為 `unmapped` |
| `error_json` | 錯誤 JSON（可 null）| ✅ |
| `created_at` / `updated_at` | ISO 8601 時間戳 | ✅ |

**直查結果（前 4 筆）：**

| ID | prompt | status |
|----|--------|--------|
| `ssii_c6c5f04e...` | Solve for x: 2x + 3 = 7 | `unmapped` |
| `ssii_63c3c628...` | What is the derivative of x²? | `unmapped` |
| `ssii_fe810d72...` | Simplify √(16) | `unmapped` |
| `ssii_05b1831a...` | What is the integral of 2x? | `unmapped` |

**結論：Branch B 資料可正確寫入 SQLite ✅**

---

## Branch C — AI Notes Navigation

### Table：`smart_book_notes`（既有 table，沿用）

Branch C 未新增 table，使用既有 `smart_book_notes`，所有欄位已預先包含導覽所需欄位：

| 欄位 | 說明 | 狀態 |
|------|------|------|
| `chapter_id` | 筆記所屬章節 ID | ✅ 已存在 |
| `page_number` | 筆記對應頁碼 | ✅ 已存在 |
| `source_message_id` | 來源聊天訊息 ID | ✅ 已存在 |

**寫入筆數：4 筆（含導覽測試資料）**

| 標題 | type | page_number | 說明 |
|------|------|------------|------|
| 代數推導 | `text` | **42** | 導覽測試：有頁碼，`anchor=true` ✅ |
| 無定位筆記 | `text` | null | 導覽測試：無頁碼，`anchor=false` ✅ |
| Canvas Note | `canvas` | null | 既有手寫筆記 ✅ |
| Test Note | `text` | null | 既有文字筆記 ✅ |

**Navigate API 驗證：**

```json
GET /api/student/books/:bookId/notes/:noteId/navigate

// 有頁碼的筆記
{"anchor": true, "pageNumber": 42, "fallback": null}

// 無定位資訊的筆記
{"anchor": false, "pageNumber": null, "fallback": "此筆記沒有頁碼或章節資訊"}
```

**結論：Branch C 資料可正確從 SQLite 讀取並導覽 ✅**

---

## 綜合驗證結果

| 分支 | Table | 寫入筆數 | 結果 |
|------|-------|---------|------|
| Branch A | `question_bank_import_jobs` | 2 | **✅ PASS** |
| Branch B | `smart_solve_import_jobs` | 2 | **✅ PASS** |
| Branch B | `smart_solve_import_items` | 4 | **✅ PASS** |
| Branch C | `smart_book_notes`（沿用）| 4 | **✅ PASS** |

**所有三個分支的資料均可正確寫入並讀取 SQLite。**

---

## 安全性確認

| 項目 | 狀態 |
|------|------|
| SQLite `.db` 檔案已提交至 Git | **否（正確）** |
| `.env` 已提交至 Git | **否（正確）** |
| `runMigrations()` 冪等（可重複執行）| **是（正確）** |
| 舊有資料相容性 | **完全相容，無破壞性變更** |
