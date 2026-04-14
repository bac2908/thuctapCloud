#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BASE_DIR}/backups"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-vpn_user}"
DB_NAME="${DB_NAME:-vpn_app}"
DB_PASSWORD="${DB_PASSWORD:-change-this-db-password}"

mkdir -p "${BACKUP_DIR}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

export PGPASSWORD="${DB_PASSWORD}"

echo "[INFO] Creating backup ${OUT_FILE}"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --no-password > "${OUT_FILE}"

if command -v gzip >/dev/null 2>&1; then
  gzip -f "${OUT_FILE}"
  OUT_FILE="${OUT_FILE}.gz"
fi

echo "[INFO] Backup completed: ${OUT_FILE}"
unset PGPASSWORD
