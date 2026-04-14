# =====================================================
# Database Management Script - Windows PowerShell
# Legacy compatibility entrypoint (preferred scripts are in ./scripts)
# =====================================================
# Usage:
#   .\database.ps1 -Action init          # Initialize database
#   .\database.ps1 -Action seed          # Load seed data
#   .\database.ps1 -Action backup        # Backup database
#   .\database.ps1 -Action restore -File backup.sql
#   .\database.ps1 -Action drop          # Drop database (CAREFUL!)

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('init', 'seed', 'backup', 'restore', 'drop', 'stats', 'help')]
    [string]$Action,
    
    [Parameter(Mandatory = $false)]
    [string]$File,
    
    [Parameter(Mandatory = $false)]
    [string]$DbHost = 'localhost',
    
    [Parameter(Mandatory = $false)]
    [int]$DbPort = 5432,
    
    [Parameter(Mandatory = $false)]
    [string]$DbUser = $env:DB_USER,
    
    [Parameter(Mandatory = $false)]
    [string]$DbName = $env:DB_NAME,
    
    [Parameter(Mandatory = $false)]
    [string]$DbPassword = $env:DB_PASSWORD
)

# Set script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackupDir = Join-Path $ScriptDir "backups"

# Fallback defaults when env vars are not provided
if ([string]::IsNullOrWhiteSpace($DbUser)) { $DbUser = 'vpn_user' }
if ([string]::IsNullOrWhiteSpace($DbName)) { $DbName = 'vpn_app' }
if ([string]::IsNullOrWhiteSpace($DbPassword)) { $DbPassword = 'change-this-db-password' }

# Color output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if psql is available
function Test-PsqlAvailable {
    try {
        $null = psql --version
        return $true
    }
    catch {
        return $false
    }
}

# Check database connection
function Test-DbConnection {
    $env:PGPASSWORD = $DbPassword
    try {
        $output = psql -h $DbHost -U $DbUser -d postgres -c "SELECT 1" 2>&1
        $env:PGPASSWORD = $null
        return $true
    }
    catch {
        $env:PGPASSWORD = $null
        return $false
    }
}

# Create database if not exists
function Ensure-Database {
    $env:PGPASSWORD = $DbPassword
    try {
        $result = psql -h $DbHost -U $DbUser -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DbName'" 2>&1
        if ($result -notcontains "1") {
            Write-Warn "Database '$DbName' does not exist. Creating..."
            psql -h $DbHost -U $DbUser -d postgres -c "CREATE DATABASE $DbName;" --no-password
            Write-Info "Database created."
        }
    }
    finally {
        $env:PGPASSWORD = $null
    }
}

# Initialize database schema
function Invoke-DbInit {
    Write-Info "Initializing database schema..."
    
    if (-not (Test-Path "$ScriptDir\init.sql")) {
        Write-Error-Custom "init.sql not found in $ScriptDir"
        exit 1
    }
    
    Ensure-Database
    
    $env:PGPASSWORD = $DbPassword
    try {
        psql -h $DbHost -U $DbUser -d $DbName -f "$ScriptDir\init.sql"
        Write-Info "Database schema initialized successfully."
    }
    finally {
        $env:PGPASSWORD = $null
    }
}

# Load seed data
function Invoke-DbSeed {
    Write-Info "Loading seed data..."
    
    if (-not (Test-Path "$ScriptDir\seeds\seed.sql")) {
        Write-Error-Custom "seeds\seed.sql not found in $ScriptDir"
        exit 1
    }
    
    $env:PGPASSWORD = $DbPassword
    try {
        psql -h $DbHost -U $DbUser -d $DbName -f "$ScriptDir\seeds\seed.sql"
        Write-Info "Seed data loaded successfully."
    }
    finally {
        $env:PGPASSWORD = $null
    }
}

# Backup database
function Invoke-DbBackup {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = Join-Path $BackupDir "backup_$timestamp.sql"
    
    Write-Info "Backing up database to $backupFile..."
    
    $env:PGPASSWORD = $DbPassword
    try {
        pg_dump -h $DbHost -U $DbUser -d $DbName > $backupFile
        
        if (Test-Path $backupFile) {
            $fileSize = (Get-Item $backupFile).Length / 1MB
            Write-Info "Backup completed: $backupFile ($([math]::Round($fileSize, 2)) MB)"
            
            # Compress with 7zip if available
            if (Get-Command 7z -ErrorAction SilentlyContinue) {
                7z a -tgzip "$backupFile.gz" $backupFile | Out-Null
                Remove-Item $backupFile
                Write-Info "Compressed to ${backupFile}.gz"
            }
        }
        else {
            Write-Error-Custom "Backup failed."
            exit 1
        }
    }
    finally {
        $env:PGPASSWORD = $null
    }
}

# Restore database
function Invoke-DbRestore {
    if ([string]::IsNullOrEmpty($File)) {
        Write-Error-Custom "Usage: database.ps1 -Action restore -File <backup_file>"
        exit 1
    }
    
    if (-not (Test-Path $File)) {
        Write-Error-Custom "Backup file not found: $File"
        exit 1
    }
    
    Write-Warn "WARNING: This will overwrite the existing database!"
    $confirmation = Read-Host "Continue? (yes/no)"
    
    if ($confirmation -ne 'yes') {
        Write-Info "Restore cancelled."
        return
    }
    
    Write-Info "Restoring database from $File..."
    
    $env:PGPASSWORD = $DbPassword
    try {
        if ($File -like "*.gz") {
            Get-Content $File | & "$env:ProgramFiles\Git\usr\bin\gunzip.exe" -c | psql -h $DbHost -U $DbUser -d $DbName --no-password
        }
        else {
            psql -h $DbHost -U $DbUser -d $DbName -f $File --no-password
        }
        Write-Info "Database restored successfully."
    }
    finally {
        $env:PGPASSWORD = $null
    }
}

# Drop database
function Invoke-DbDrop {
    Write-Warn "WARNING: This will DROP all tables and data!"
    $confirmation = Read-Host "Type 'DROP' to confirm"
    
    if ($confirmation -eq 'DROP') {
        $env:PGPASSWORD = $DbPassword
        try {
            psql -h $DbHost -U $DbUser -d $DbName -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" --no-password
            Write-Info "All tables dropped."
        }
        finally {
            $env:PGPASSWORD = $null
        }
    }
    else {
        Write-Info "Operation cancelled."
    }
}

# Show database statistics
function Show-DbStats {
    Write-Info "Database statistics:"
    
    $env:PGPASSWORD = $DbPassword
    try {
        psql -h $DbHost -U $DbUser -d $DbName --no-password -c @"
            SELECT 
                tablename,
                pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size('public.'||tablename) DESC;
"@
    }
    finally {
        $env:PGPASSWORD = $null
    }
}

# Show help
function Show-Help {
    Write-Host @"
VPN Gaming Platform - Database Management Script (Windows)

Usage: .\database.ps1 -Action <command> [options]

Commands:
  init            Initialize database schema
  seed            Load seed/initial data
  backup          Backup database
  restore         Restore from backup file (use -File parameter)
  drop            Drop all tables (CAREFUL!)
  stats           Show database statistics
  help            Show this help message

Parameters:
  -Action         Command to execute (required)
  -File           Backup file path (for restore action)
  -DbHost         Database host (default: localhost)
  -DbPort         Database port (default: 5432)
  -DbUser         Database user (default: vpn_user)
  -DbName         Database name (default: vpn_app)
    -DbPassword     Database password (default: change-this-db-password or DB_PASSWORD env)

Examples:
    # Full setup (schema + seed)
  .\database.ps1 -Action init
  .\database.ps1 -Action seed

  # Backup
  .\database.ps1 -Action backup

  # Restore
    .\database.ps1 -Action restore -File "backups/backup_20260315_120000.sql"

  # Show stats
  .\database.ps1 -Action stats
"@
}

# =====================================================
# Main
# =====================================================

if (-not (Test-PsqlAvailable)) {
    Write-Error-Custom "PostgreSQL client (psql) not found. Please install PostgreSQL."
    exit 1
}

if (-not (Test-DbConnection)) {
    Write-Error-Custom "Cannot connect to database at $DbHost`:$DbPort"
    exit 1
}

switch ($Action) {
    'init' { Invoke-DbInit }
    'seed' { Invoke-DbSeed }
    'backup' { Invoke-DbBackup }
    'restore' { Invoke-DbRestore }
    'drop' { Invoke-DbDrop }
    'stats' { Show-DbStats }
    'help' { Show-Help }
    default { Show-Help }
}
