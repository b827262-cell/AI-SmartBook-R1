# AI-Stu-R1 1GB systemd Deployment

The student frontend is the only thing that runs on the 1GB host.

**Use:** Nginx · Node.js 22 · SQLite · systemd
**Do not use:** PM2 · Docker · MySQL · Redis · Qdrant · Ollama · `pnpm dev` ·
PDF parsing · full RAG (those all stay on the admin/build machine).

## Runtime modes (`STU_RUNTIME_MODE`)

- `static` — built-in demo data, no DB.
- `sqlite-api` — read a synced `student.db`, keyword chat. **Default for 1GB.**
- `remote-api` — proxy a central admin API (future).

## Build (on the build machine, not the 1GB host)

```bash
pnpm install
pnpm --filter AI-Stu-R1 build         # -> apps/AI-Stu-R1/dist        (static SPA)
pnpm --filter AI-Stu-R1 server:build  # -> apps/AI-Stu-R1/dist-server/stu-api.mjs (bundled)
```

`server:build` bundles the API + `@ai-smartbook/*` into one ESM file with
esbuild, keeping `better-sqlite3` external (a native module installed on the host).

## Provision the 1GB host

```bash
sudo mkdir -p /opt/AI-Stu-R1/{dist,dist-server,data}
# ship dist/, dist-server/, and student.db (see deploy/scripts/sync-student-db.sh)
cd /opt/AI-Stu-R1 && npm init -y && npm install better-sqlite3   # only native dep
sudo bash deploy/scripts/install-student-systemd.sh
```

## Environment (`/etc/ai-stu-r1/student.env`)

```bash
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=128
STU_RUNTIME_MODE=sqlite-api
STU_DB_PATH=/opt/AI-Stu-R1/data/student.db
STU_API_PORT=4310
STU_PUBLIC_DIR=/opt/AI-Stu-R1/dist
STU_READONLY_MODE=true
STU_CHAT_MODE=keyword
```

## systemd guard rails (`deploy/systemd/ai-stu-r1.service`)

- `ExecStart=/usr/bin/node /opt/AI-Stu-R1/dist-server/stu-api.mjs`
- `EnvironmentFile=/etc/ai-stu-r1/student.env`
- `NODE_OPTIONS=--max-old-space-size=128`
- `MemoryHigh=200M`, `MemoryMax=256M`
- `Restart=always`

## Nginx (`deploy/nginx/ai-stu-r1.conf`)

Serves `/opt/AI-Stu-R1/dist` and proxies `/api/student/` → `127.0.0.1:4310`.

## Scripts

- `deploy/scripts/install-student-systemd.sh` — install + enable the unit.
- `deploy/scripts/sync-student-db.sh` — build bundle + publish `student.db` + rsync.
- `deploy/scripts/healthcheck-student.sh` — `curl /api/student/books`.
