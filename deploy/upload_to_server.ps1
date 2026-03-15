# =====================================================
# Script Upload Code lên Server (Windows PowerShell)
# =====================================================
# Chạy script này trong PowerShell với quyền Admin
# .\deploy\upload_to_server.ps1
# =====================================================

param(
    [string]$ServerIP = "172.16.60.25",
    [string]$User = "root",
    [string]$ProjectPath = "/root/vpn-gaming"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📤 UPLOAD CODE LÊN SERVER $ServerIP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Lấy đường dẫn hiện tại
$LocalPath = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "📁 Local Path: $LocalPath" -ForegroundColor Yellow
Write-Host "🖥️  Server: $User@$ServerIP:$ProjectPath" -ForegroundColor Yellow

# Kiểm tra OpenSSH client
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ OpenSSH chưa được cài đặt!" -ForegroundColor Red
    Write-Host "Đang cài đặt OpenSSH Client..." -ForegroundColor Yellow
    
    Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
    
    Write-Host "✅ OpenSSH đã cài đặt" -ForegroundColor Green
}

# Kiểm tra scp
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SCP không khả dụng!" -ForegroundColor Red
    Write-Host "Vui lòng cài Git for Windows hoặc OpenSSH" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Các file sẽ upload:" -ForegroundColor Cyan
Write-Host "   - BE_vpn/ (Backend)"
Write-Host "   - FE_vpn/ (Frontend)"
Write-Host "   - deploy/ (Scripts)"
Write-Host "   - docker-compose.yml"
Write-Host "   - .env.production"
Write-Host "   - README.md"

Write-Host ""
Write-Host "⚠️  Password SSH: Cg@2026#" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Tiếp tục upload? (y/N)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Đã hủy." -ForegroundColor Red
    exit 0
}

# Copy .env.production thành .env
Write-Host ""
Write-Host "1️⃣ Chuẩn bị file .env..." -ForegroundColor Cyan
$envProd = Join-Path $LocalPath ".env.production"
$envFile = Join-Path $LocalPath ".env"
if (Test-Path $envProd) {
    Copy-Item $envProd $envFile -Force
    Write-Host "   ✅ Đã copy .env.production -> .env" -ForegroundColor Green
}

# Tạo thư mục trên server
Write-Host ""
Write-Host "2️⃣ Tạo thư mục trên server..." -ForegroundColor Cyan
ssh "${User}@${ServerIP}" "mkdir -p $ProjectPath"
Write-Host "   ✅ Đã tạo $ProjectPath" -ForegroundColor Green

# Upload files
Write-Host ""
Write-Host "3️⃣ Upload files (có thể mất vài phút)..." -ForegroundColor Cyan

$items = @(
    "BE_vpn",
    "FE_vpn", 
    "deploy",
    "docker-compose.yml",
    ".env",
    ".env.production",
    "README.md",
    "DEPLOY_GUIDE.md"
)

foreach ($item in $items) {
    $itemPath = Join-Path $LocalPath $item
    if (Test-Path $itemPath) {
        Write-Host "   📤 Uploading $item..." -ForegroundColor Yellow
        scp -r $itemPath "${User}@${ServerIP}:${ProjectPath}/"
        Write-Host "   ✅ $item uploaded" -ForegroundColor Green
    }
    else {
        Write-Host "   ⚠️ $item không tồn tại, bỏ qua" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ UPLOAD HOÀN THÀNH!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 BƯỚC TIẾP THEO:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SSH vào server:" -ForegroundColor White
Write-Host "   ssh root@$ServerIP" -ForegroundColor Cyan
Write-Host "   Password: Cg@2026#" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "2. Chạy deploy:" -ForegroundColor White
Write-Host "   cd $ProjectPath" -ForegroundColor Cyan
Write-Host "   chmod +x deploy/deploy_production.sh" -ForegroundColor Cyan
Write-Host "   bash deploy/deploy_production.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Truy cập website:" -ForegroundColor White
Write-Host "   http://$ServerIP" -ForegroundColor Cyan
Write-Host ""
