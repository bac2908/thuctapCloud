# Usage: open PowerShell in d:\ThuctapCloud\BE_vpn and run
# .\scripts\setup_backend.ps1

Write-Host "Stopping any process listening on port 8000 (if any)..." -ForegroundColor Cyan
$p = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($p) { $p | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }

Write-Host "Removing existing .venv (if present)..." -ForegroundColor Cyan
if (Test-Path .venv) { Remove-Item -Recurse -Force .venv }

Write-Host "Creating virtualenv using Python 3.10 (py -3.10)..." -ForegroundColor Cyan
py -3.10 -m venv .venv

Write-Host "Upgrading pip and installing requirements..." -ForegroundColor Cyan
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

Write-Host "Starting uvicorn (backend) in background..." -ForegroundColor Cyan
Start-Process -FilePath '.\.venv\Scripts\python.exe' -ArgumentList '-m', 'uvicorn', 'app.main:app', '--reload', '--app-dir', 'app', '--port', '8000' -NoNewWindow

Write-Host "Backend started. Check http://127.0.0.1:8000/health" -ForegroundColor Green
