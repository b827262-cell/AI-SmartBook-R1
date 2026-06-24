# AI-SmartBook-R2 服務重啟與埠口驗證報告 (2026-06-22)

## 1. 基本資訊與狀態
- **狀態**: 成功 (Success)
- **R2 分支**: `feat/ai-smartbook-r2-modular-imports`
- **是否修改原始碼**: 否 (No)
- **是否提交 `.env` / 資料庫檔**: 否 (No)
- **SQLite 完整性檢查結果**: `ok`

---

## 2. 停止 AI-SmartBook-R1 服務
### A. 偵測到之 R1 進程 (PIDs)
經檢查，以下 Node 進程運作於 `/home/b827262/project/AI-SmartBook-R1` 目錄下：
- **埠口 4300 (Admin API)**: PID `1601961`
- **埠口 4310 (Student API)**: PID `1623387`
- **其餘 R1 背景殘留進程**: PIDs `1187139`, `1187140`, `1187188`, `1187195`

### B. 進程停止確認
- 使用 `kill` 指令成功停止上述所有確認屬於 R1 專案之進程。
- 停止後驗證 `ss -ltnp`，確認預設埠口 `4300`, `4310`, `5173`, `5174` 已被完全釋放。

---

## 3. 啟動 AI-SmartBook-R2 服務
由於系統中未安裝 `tmux`，為確保服務正常於背景執行且不因終端機中斷而被 SIGHUP 訊號終止，改以 `nohup ... & disown` 方式啟動各項服務並進行日誌分流：

| 服務名稱 | 啟動指令 | 運作埠口 | 日誌檔案 |
| :--- | :--- | :--- | :--- |
| **Admin/main API** | `pnpm --filter AI-adm-D1 server:dev` | 4300 | `r2-api.log` |
| **Student API** | `pnpm --filter AI-Stu-R1 server:dev` | 4310 | `r2-stu-api.log` |
| **Admin Frontend** | `pnpm --filter AI-adm-D1 dev` | 5174 | `r2-admin.log` |
| **Student Frontend** | `pnpm --filter AI-Stu-R1 dev` | 5173 | `r2-student.log` |

---

## 4. 服務啟動後埠口狀態 (`ss -ltnp`)
R2 服務成功啟動，埠口監聽狀態如下：
```
LISTEN 0      511                        0.0.0.0:5174       0.0.0.0:*    users:(("node",pid=1921250,fd=21))
LISTEN 0      511                        0.0.0.0:5173       0.0.0.0:*    users:(("node",pid=1921274,fd=21))
LISTEN 0      511                              *:4310             *:*    users:(("node",pid=1921289,fd=32))
LISTEN 0      511                              *:4300             *:*    users:(("node",pid=1921301,fd=35))
```

---

## 5. Curl 驗證測試結果
對 R2 服務進行的 curl 測試結果如下：

1. **書籍列表 API (`http://127.0.0.1:4300/api/admin/books`)**:
   - 狀態：`HTTP/1.1 200 OK`
   - 回傳內容：`{"books":[]}`

2. **外觀設定 API (`http://127.0.0.1:4300/api/appearance-settings`)**:
   - 狀態：`HTTP/1.1 200 OK`
   - 回傳內容：`{"settings":{"dashboardNavLabel":"首頁","systemName":"iBrain 智匯", ...}}`

3. **管理員前端 (`http://127.0.0.1:5174/`)**:
   - 狀態：`HTTP/1.1 200 OK`

4. **學生端前端 (`http://127.0.0.1:5173/books`)**:
   - 狀態：`HTTP/1.1 200 OK`
