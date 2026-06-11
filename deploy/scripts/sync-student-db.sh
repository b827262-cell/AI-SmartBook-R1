#!/usr/bin/env bash
# Build the student bundle + a published-only student.db, then push to the
# 1GB target. Run from the repo root on the build machine.
set -euo pipefail

TARGET="${1:-user@small-pc}"
ADMIN_DB="${ADMIN_DB:-packages/db/data/ai-smartbook-r1.db}"
EXPORT_JSON="exports/student-sync.json"
STUDENT_DB="exports/student.db"

mkdir -p exports

echo "==> Building student frontend (dist) and server bundle (dist-server)"
pnpm --filter AI-Stu-R1 build
pnpm --filter AI-Stu-R1 server:build

echo "==> Exporting published books from ${ADMIN_DB}"
pnpm --filter @ai-smartbook/sync exec tsx src/cli.ts export "../../${ADMIN_DB}" "../../${EXPORT_JSON}"

echo "==> Building clean ${STUDENT_DB}"
rm -f "${STUDENT_DB}"
pnpm --filter @ai-smartbook/sync exec tsx src/cli.ts import "../../${STUDENT_DB}" "../../${EXPORT_JSON}"

echo "==> rsync to ${TARGET}"
rsync -av apps/AI-Stu-R1/dist/ "${TARGET}:/opt/AI-Stu-R1/dist/"
rsync -av apps/AI-Stu-R1/dist-server/ "${TARGET}:/opt/AI-Stu-R1/dist-server/"
rsync -av "${STUDENT_DB}" "${TARGET}:/opt/AI-Stu-R1/data/student.db"

echo "==> Done. Restart on target: sudo systemctl restart ai-stu-r1"
