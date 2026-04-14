#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

"${BASE_DIR}/scripts/backup.sh"

find "${BASE_DIR}/backups" -maxdepth 1 -type f -name "backup_*.sql*" -mtime +"${RETENTION_DAYS}" -print -delete

echo "[INFO] Auto backup done. Retention: ${RETENTION_DAYS} days"
