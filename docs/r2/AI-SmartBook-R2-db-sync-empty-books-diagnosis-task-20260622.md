# AI-SmartBook-R2 db sync empty books diagnosis (2026-06-22)

## 背景
- 在 R2 API 看到 `{"books":[]}`，推測並非同步失敗，而是 API 實際讀到錯誤 DB。
- R1 的資料庫有 13 本書，應回傳非空；若 API 讀到空檔案則會回傳空陣列。

## 觀察到的現象
- `.env` 當前為相對路徑（初始）：
  - `DATABASE_URL=file:./data/ai-smartbook-r1.db`
  - `SQLITE_PATH=./data/ai-smartbook-r1.db`
  - `STU_DB_PATH=./data/ai-smartbook-r1.db`
- `AI-adm-D1` 資料庫解析邏輯（`@ai-smartbook/db`）：有 `SQLITE_PATH` 或 `DATABASE_URL` 就 `resolve()`。
- `resolveDbPath()` 會取絕對化後的路徑。

## 驗證結果
- 主目錄 DB：`/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db`
  - `PRAGMA integrity_check;` => `ok`
  - `SELECT count(*) FROM books;` => `13`
- 錯誤 DB：`/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/ai-smartbook-r1.db`
  - 大小僅 `4096`
  - `SELECT count(*) FROM books;` => `0`
- API 在 4300 仍回 `{"books":[]}`。

## 已做修正
### 1) 備份 `.env`
```bash
cp -av .env .env.bak.$(date +%Y%m%d-%H%M%S)
```

### 2) 將三個 DB 環境變數改為絕對路徑
```bash
sed -i 's#^DATABASE_URL=.*#DATABASE_URL=file:/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db#' .env
sed -i 's#^SQLITE_PATH=.*#SQLITE_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db#' .env
sed -i 's#^STU_DB_PATH=.*#STU_DB_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db#' .env
```

更新後驗證：
```bash
grep -nEi 'DATABASE_URL|SQLITE_PATH|STU_DB_PATH' .env
```

### 3) 盤點資料庫檔
```bash
find /home/b827262/project/AI-SmartBook-R2 -type f \
  \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" \) -ls
```

確認到 `apps/AI-adm-D1/data/ai-smartbook-r1.db` 是可疑空 DB，需要保留備份。

## 關鍵結論
- 問題核心是**服務仍有舊實例讀到 `apps/AI-adm-D1/data/...`**，並非 R1 同步內容本身不存在。
- 主 R1 DB 已有 13 筆資料；空結果是因為讀到另一個空 DB。

## 建議後續（本次修復驗證重點）
1. 停掉舊 R2 node 進程（尤其是監聽 4300 的實例）。
2. 確認 API 啟動 log `db:` 指向：`/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db`。
3. 重新測試：
   ```bash
   curl -s http://127.0.0.1:4300/api/admin/books | head -c 1000
   ```
4. 若仍是空值，再檢查啟動環境是否真的注入到實際啟動命令。

## R2 來源資料庫核對（補充）
- `AI-SmartBook-R1`：
  - `/home/b827262/project/AI-SmartBook-R1/data/ai-smartbook-r1.db`
  - `SELECT count(*) AS books FROM books;` => `13`

## 補充測試（證明修正有效）
- 以 `ADMIN_API_PORT=4301` 使用顯式絕對 DB 路徑啟動測試實例，log 顯示：
  - `db: /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db`
- API 回傳：`books` 非空。
