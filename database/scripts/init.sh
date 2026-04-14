#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-vpn_user}"
DB_NAME="${DB_NAME:-vpn_app}"
DB_PASSWORD="${DB_PASSWORD:-change-this-db-password}"
SEED_DATA="${SEED_DATA:-true}"

export PGPASSWORD="${DB_PASSWORD}"

echo "[INFO] Initializing schema from ${BASE_DIR}/init.sql"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "${BASE_DIR}/init.sql"

if [[ "${SEED_DATA}" == "true" ]]; then
  echo "[INFO] Loading seed from ${BASE_DIR}/seeds/seed.sql"
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "${BASE_DIR}/seeds/seed.sql"
else
  echo "[INFO] Skip seed (SEED_DATA=${SEED_DATA})"
fi

echo "[INFO] Database initialization completed"
unset PGPASSWORD
