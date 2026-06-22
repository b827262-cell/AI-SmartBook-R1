# TUF ASUS 筆電舊服務停用任務

> 執行對象：TUF ASUS / TUF A16 Linux 筆電  
> 目的：在建立新的專案分類與乾淨開發環境前，先停用舊的背景服務與開發服務。  
> 執行者：Codex CLI 或 AGY  
> 重要原則：**只停用，不刪除資料；保留 SSH；不刪專案、不刪資料庫、不清 Docker volume。**

---

## 1. 任務目標

請在 TUF ASUS 筆電上完成以下事項：

1. 確認 SSH 服務仍然啟用並可遠端連線。
2. 停止舊的 Node / npm / pnpm / Vite / tsx / ts-node 開發服務。
3. 停止 PM2 舊服務。
4. 停止 Docker 舊容器，並取消容器 restart policy。
5. 停用可能殘留的舊背景服務，例如 MySQL、MariaDB、Redis、Qdrant、Ollama、OpenWebUI、Nginx、Cloudflared、Hermes、OpenClaw。
6. 驗證舊服務常用 port 已無監聽。
7. 保留所有資料、專案檔案、資料庫檔案、Docker volume。

---

## 2. 禁止事項

請嚴格遵守：

- 不要刪除 `~/project`。
- 不要執行 `rm -rf` 清除專案或資料。
- 不要刪除 Docker volume。
- 不要刪除 MySQL / SQLite / Qdrant / Chroma / Redis 資料。
- 不要停止或停用 SSH。
- 不要修改 GitHub repo 原始碼。
- 不要 commit / push 任何程式碼變更。
- 本任務只處理本機服務停用與驗證。

---

## 3. 建議執行前資訊蒐集

請先執行以下指令，記錄目前主機與服務狀態：

```bash
set -u

mkdir -p ~/project/_logs
LOG_FILE="$HOME/project/_logs/tuf_asus_old_services_shutdown_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "===== HOST INFO ====="
whoami
hostname
date
uname -a

echo "===== IP INFO ====="
ip -4 addr show | grep inet || true
tailscale ip -4 2>/dev/null || echo "no tailscale"

echo "===== SSH STATUS ====="
systemctl status ssh --no-pager 2>/dev/null || systemctl status sshd --no-pager 2>/dev/null || true

echo "===== LISTEN PORTS BEFORE ====="
sudo ss -ltnp | grep -E ':(3000|3002|4300|4310|5000|5173|5174|8000|8080|11434|3306|3307|6333|6379|18789|18790|18000)\b' || true

echo "===== NODE / PNPM / VITE BEFORE ====="
pgrep -af 'node|pnpm|npm|vite|tsx|ts-node' || true

echo "===== DOCKER BEFORE ====="
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' 2>/dev/null || echo "Docker not available or not running"

echo "===== PM2 BEFORE ====="
pm2 list 2>/dev/null || echo "PM2 not available"

echo "===== SYSTEMD OLD SERVICES BEFORE ====="
systemctl --type=service --state=running --no-pager | grep -Ei 'docker|mysql|mariadb|redis|qdrant|ollama|open-webui|nginx|cloudflared|hermes|openclaw|pm2|smartbook|tutor|ai' || true
```

---

## 4. 確保 SSH 不被停用

執行任何停用動作前，請先確認 SSH 是啟用狀態：

```bash
sudo systemctl enable --now ssh 2>/dev/null || sudo systemctl enable --now sshd 2>/dev/null || true
systemctl status ssh --no-pager 2>/dev/null || systemctl status sshd --no-pager 2>/dev/null || true
```

驗收條件：

- SSH / sshd 至少其中一個應為 `active (running)`。
- 若 SSH 無法啟用，請停止後續停用任務，並回報原因。

---

## 5. 停止舊 Node / Vite / pnpm 開發服務

```bash
pkill -f "pnpm.*dev" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "tsx" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true
pkill -f "node dist/index.js" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

echo "===== NODE / PNPM / VITE AFTER STOP ====="
pgrep -af 'node|pnpm|npm|vite|tsx|ts-node' || echo "Node/Vite/pnpm old processes stopped"
```

注意：

- 若仍有 Node process，請判斷是否為系統工具或目前執行中的 Codex/AGY 相關程序。
- 不要誤殺 Codex/AGY 自身執行程序。

---

## 6. 停止 PM2 舊服務

```bash
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 save --force 2>/dev/null || true

echo "===== PM2 AFTER STOP ====="
pm2 list 2>/dev/null || echo "PM2 not available"
```

---

## 7. 停止 Docker 舊容器，但不刪除資料

先停止容器並取消自動重啟：

```bash
docker ps -q 2>/dev/null | xargs -r docker stop
docker ps -aq 2>/dev/null | xargs -r docker update --restart=no
```

若本次目標是讓 Docker 服務本身也不要開機啟動，才執行：

```bash
sudo systemctl disable --now docker 2>/dev/null || true
sudo systemctl disable --now containerd 2>/dev/null || true
```

再次強調：

- 不要執行 `docker system prune`。
- 不要執行 `docker volume rm`。
- 不要刪除任何 volume。

---

## 8. 停用舊資料 / AI 背景服務

```bash
sudo systemctl disable --now mysql 2>/dev/null || true
sudo systemctl disable --now mariadb 2>/dev/null || true
sudo systemctl disable --now redis-server 2>/dev/null || true
sudo systemctl disable --now qdrant 2>/dev/null || true
sudo systemctl disable --now ollama 2>/dev/null || true
sudo systemctl disable --now open-webui 2>/dev/null || true
sudo systemctl disable --now nginx 2>/dev/null || true
sudo systemctl disable --now cloudflared 2>/dev/null || true
sudo systemctl disable --now hermes 2>/dev/null || true
sudo systemctl disable --now openclaw 2>/dev/null || true
```

說明：

- `nginx` 停用後，若舊專案曾使用 80/443，本機將不再提供該入口。
- 若未來新專案需要 Nginx，請重新設計後再啟用。

---

## 9. 最終驗證

```bash
echo "===== SSH MUST STILL RUN ====="
systemctl status ssh --no-pager 2>/dev/null || systemctl status sshd --no-pager 2>/dev/null || true

echo "===== LISTEN PORTS AFTER ====="
sudo ss -ltnp | grep -E ':(3000|3002|4300|4310|5000|5173|5174|8000|8080|11434|3306|3307|6333|6379|18789|18790|18000)\b' || echo "No old project ports listening"

echo "===== NODE PROCESSES AFTER ====="
pgrep -af 'node|pnpm|npm|vite|tsx|ts-node' || echo "No old Node dev processes"

echo "===== DOCKER CONTAINERS AFTER ====="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "Docker stopped or unavailable"

echo "===== RUNNING OLD SYSTEMD SERVICES AFTER ====="
systemctl --type=service --state=running --no-pager | grep -Ei 'docker|mysql|mariadb|redis|qdrant|ollama|open-webui|nginx|cloudflared|hermes|openclaw|pm2|smartbook|tutor|ai' || echo "No obvious old services running"

echo "===== LOG FILE ====="
echo "$LOG_FILE"
```

---

## 10. 驗收標準

請在回報中提供以下內容：

1. 主機名稱與帳號。
2. SSH 是否仍為 `active (running)`。
3. 停止前有哪些舊 port 正在監聽。
4. 停止後是否還有以下 port：
   - `3000`
   - `3002`
   - `4300`
   - `4310`
   - `5000`
   - `5173`
   - `5174`
   - `8000`
   - `8080`
   - `11434`
   - `3306`
   - `3307`
   - `6333`
   - `6379`
   - `18789`
   - `18790`
   - `18000`
5. Docker 是否已停止，或容器是否全數 stopped。
6. 是否仍有 Node / Vite / pnpm 舊程序。
7. log 檔案位置。
8. 若有無法停用的服務，列出服務名稱與原因。

---

## 11. 建議給 Codex / AGY 的執行提示

可以直接把以下提示交給 Codex CLI 或 AGY：

```text
請依照 docs/TUF_ASUS_OLD_SERVICES_SHUTDOWN_TASK.md 在 TUF ASUS Linux 筆電上執行舊服務停用任務。

限制：
1. 只停用服務，不刪資料。
2. 不刪除 ~/project。
3. 不刪除 Docker volume。
4. 不修改程式碼。
5. 不 commit / push。
6. 必須保留 SSH active running。
7. 完成後回報停用前/後 port、Node process、Docker、systemd 舊服務狀態與 log 檔位置。
```

---

## 12. 後續任務，不在本次執行

以下項目不屬於本次停用任務：

- 建立新的專案分類目錄。
- clone GitHub repo。
- 啟動 AI-SmartBook-R1。
- 啟動 tw-legal-flow。
- 設定 Nginx。
- 建立 systemd 新服務。
- 建立 Docker Compose 新架構。

請等舊服務停用驗收完成後，再進入下一階段。
