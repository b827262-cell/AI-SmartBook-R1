#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-user@small-pc}"
rsync -av apps/AI-Stu-R1/dist/ "$TARGET:/opt/AI-Stu-R1/dist/"
rsync -av exports/student.db "$TARGET:/opt/AI-Stu-R1/data/student.db"
