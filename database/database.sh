#!/bin/bash
# =====================================================
# Database Initialization & Management Script
# Legacy compatibility entrypoint (preferred scripts are in ./scripts)
# For: Linux/macOS
# =====================================================
# Usage:
#   ./database.sh init          # Initialize database
#   ./database.sh seed          # Load seed data
#   ./database.sh backup        # Backup database
#   ./database.sh restore FILE  # Restore from backup
#   ./database.sh drop          # Drop all tables (CAREFUL!)

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-vpn_user}
DB_NAME=${DB_NAME:-vpn_app}
DB_PASSWORD=${DB_PASSWORD:-change-this-db-password}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Export password for non-interactive login
export PGPASSWORD=$DB_PASSWORD

# =====================================================
# Functions
# =====================================================

function log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

function log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function check_psql() {
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL client (psql) not found. Please install PostgreSQL."
        exit 1
    fi
}

function check_database() {
    if ! psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1; then
        log_warn "Database '$DB_NAME' does not exist. Creating..."
        psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
        log_info "Database created."
    fi
}

function init_database() {
    log_info "Initializing database schema..."
    check_database
    
    if [ ! -f "$SCRIPT_DIR/init.sql" ]; then
        log_error "init.sql not found in $SCRIPT_DIR"
        exit 1
    fi
    
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/init.sql"
    log_info "Database schema initialized successfully."
}

function seed_data() {
    log_info "Loading seed data..."
    
    if [ ! -f "$SCRIPT_DIR/seeds/seed.sql" ]; then
        log_error "seeds/seed.sql not found in $SCRIPT_DIR"
        exit 1
    fi
    
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/seeds/seed.sql"
    log_info "Seed data loaded successfully."
}

function backup_database() {
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "Backing up database to $BACKUP_FILE..."
    
    pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --no-password > "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        log_info "Backup completed: $BACKUP_FILE"
        
        # Compress if gzip available
        if command -v gzip &> /dev/null; then
            gzip "$BACKUP_FILE"
            log_info "Compressed to ${BACKUP_FILE}.gz"
        fi
    else
        log_error "Backup failed."
        exit 1
    fi
}

function restore_database() {
    BACKUP_FILE=$1
    
    if [ -z "$BACKUP_FILE" ]; then
        log_error "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_info "Restoring database from $BACKUP_FILE..."
    log_warn "WARNING: This will overwrite the existing database!"
    read -p "Continue? (yes/no): " -r
    echo
    
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        # Handle compressed files
        if [[ $BACKUP_FILE == *.gz ]]; then
            gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --no-password
        else
            psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" --no-password
        fi
        log_info "Database restored successfully."
    else
        log_info "Restore canceled."
        exit 0
    fi
}

function drop_database() {
    log_warn "WARNING: This will DROP all tables and data!"
    read -p "Type 'DROP' to confirm: " -r
    echo
    
    if [[ $REPLY == "DROP" ]]; then
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" --no-password
        log_info "All tables dropped."
    else
        log_info "Operation cancelled."
        exit 0
    fi
}

function show_stats() {
    log_info "Database statistics:"
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --no-password -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    "
}

# =====================================================
# Main
# =====================================================

check_psql

COMMAND=${1:-help}

case $COMMAND in
    init)
        init_database
        ;;
    seed)
        seed_data
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    drop)
        drop_database
        ;;
    stats)
        show_stats
        ;;
    help|*)
        echo "VPN Gaming Platform - Database Management Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  init            Initialize database schema"
        echo "  seed            Load seed/initial data"
        echo "  backup          Backup database"
        echo "  restore FILE    Restore from backup file"
        echo "  drop            Drop all tables (CAREFUL!)"
        echo "  stats           Show database statistics"
        echo "  help            Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  DB_HOST=$DB_HOST"
        echo "  DB_PORT=$DB_PORT"
        echo "  DB_USER=$DB_USER"
        echo "  DB_NAME=$DB_NAME"
        echo ""
        echo "Examples:"
        echo "  # Full setup (schema + seed)"
        echo "  $0 init"
        echo "  $0 seed"
        echo ""
        echo "  # Backup"
        echo "  $0 backup"
        echo ""
        echo "  # Restore"
        echo "  $0 restore backups/backup_20260315_120000.sql"
        ;;
esac

# Cleanup password from environment
unset PGPASSWORD
