#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/restore.sh <backup_file.sql|backup_file.sql.gz>"
  exit 1
fi

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-vpn_user}"
DB_NAME="${DB_NAME:-vpn_app}"
DB_PASSWORD="${DB_PASSWORD:-change-this-db-password}"
RESTORE_FORCE="${RESTORE_FORCE:-false}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  if [[ -f "${BASE_DIR}/${BACKUP_FILE}" ]]; then
    BACKUP_FILE="${BASE_DIR}/${BACKUP_FILE}"
  else
    echo "[ERROR] Backup file not found: $1"
    exit 1
  fi
fi

if [[ "${RESTORE_FORCE}" != "true" ]]; then
  read -r -p "Restore will overwrite data in ${DB_NAME}. Continue? (yes/no): " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    echo "[INFO] Restore cancelled"
    exit 0
  fi
fi

export PGPASSWORD="${DB_PASSWORD}"

echo "[INFO] Restoring from ${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 --no-password
else
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "${BACKUP_FILE}" --no-password
fi

echo "[INFO] Restore completed"
unset PGPASSWORD
