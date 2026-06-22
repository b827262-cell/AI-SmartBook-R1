# AI-SmartBook-R2 服務啟動與驗證報告 (2026-06-22)

## 1. 基本資訊
- **狀態 (Status)**: 已阻礙 (Blocked) - 預設埠口衝突
- **分支 (Branch)**: `feat/ai-smartbook-r2-modular-imports`
- **原始碼變更**: 否 (No)
- **環境設定檔 (`.env`) 狀態**: 已確認存在
- **資料庫路徑**: `data/ai-smartbook-r1.db` (已確認存在)

## 2. 啟動前檢查
### A. Git 狀態
```
## feat/ai-smartbook-r2-modular-imports...origin/feat/ai-smartbook-r2-modular-imports
```

### B. 埠口占用檢查 (`ss -ltnp`)
檢查發現預設埠口 `4300` 與 `4310` 已被 `AI-SmartBook-R1` 專案之服務占用：
```
LISTEN 0      511                              *:4310             *:*    users:(("node",pid=1623387,fd=35))
LISTEN 0      511                              *:4300             *:*    users:(("node",pid=1601961,fd=38))
```

### C. SQLite 資料庫完整性檢查
執行 `sqlite3 data/ai-smartbook-r1.db "PRAGMA integrity_check;"` 結果：
```
ok
```

---

## 3. 服務啟動狀態與阻礙分析
由於 `AI-SmartBook-R1` 的服務正在運行並占用了核心 API 埠口，本專案 (R2) 服務無法於預設埠口正常啟動。

| 服務名稱 | 預設埠口 | 當前狀態 | 阻礙原因 |
| :--- | :--- | :--- | :--- |
| **Admin/main API** | 4300 | 未啟動 / 受阻 | 埠口 `4300` 已被 PID 1601961 占用 (R1 專案服務) |
| **Admin Frontend** | 5174 | 未啟動 / 受阻 | 後端 API 埠口衝突，故未啟動前端以避免對接錯誤 |
| **Student Frontend** | 5173 | 未啟動 / 受阻 | 後端 API 埠口衝突，故未啟動前端以避免對接錯誤 |

### 建議替代埠口方案
若需同時啟動 R2 服務，建議於 `.env` 中調整以下埠口設定：
- **Admin/main API**: `4301` 或 `14300`
- **Student API / Runtime**: `4311` 或 `14310`

---

## 4. Curl 測試結果 (針對當前占用埠口之服務)
由於埠口已被占用，對該埠口進行的 curl 測試實際上導向了正在運行的 R1 服務：

1. **API - 取得書籍列表 (`http://127.0.0.1:4300/api/admin/books`)**:
   - 狀態：成功回應 (來自 R1 服務，資料庫共享)
   - 回傳範例：`{"books":[{"id":"book_0d9fbaf1-93ea-4b42-899d-b00c614c390c", ...}]}`

2. **API - 取得外觀設定 (`http://127.0.0.1:4300/api/appearance-settings`)**:
   - 狀態：成功回應
   - 回傳範例：`{"settings":{"dashboardNavLabel":"首頁","systemName":"iBrain 智匯", ...}}`

3. **Admin 前端 (`http://127.0.0.1:5174/`)**:
   - 狀態：連線失敗 (Connection refused) - 該埠口未有服務啟動。

4. **Student 前端書籍列表 (`http://127.0.0.1:5173/books`)**:
   - 狀態：連線失敗 (Connection refused) - 該埠口未有服務啟動。
