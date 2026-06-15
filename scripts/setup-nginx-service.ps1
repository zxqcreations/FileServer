# FileServer Nginx Service Setup Script
# Run this script as Administrator to install nginx as a Windows service
# Usage: Right-click → Run with PowerShell (as Administrator)
# Or from an elevated terminal: powershell -File setup-nginx-service.ps1

$ErrorActionPreference = "Stop"

$ServiceName = "NginxServer"
$NginxPath = "D:\ENV\nginx-1.30.2\nginx.exe"
$NginxDir = "D:\ENV\nginx-1.30.2"
$NssmPath = "D:\ENV\nssm\nssm-2.24\win64\nssm.exe"

Write-Host "=== FileServer Nginx Service Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator', then re-run this script." -ForegroundColor Yellow
    exit 1
}

# Stop any existing nginx process
Write-Host "[1/4] Stopping any existing nginx processes..." -ForegroundColor Gray
$existing = Get-Process -Name "nginx" -ErrorAction SilentlyContinue
if ($existing) {
    Stop-Process -Name "nginx" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "  Stopped existing nginx processes." -ForegroundColor Green
} else {
    Write-Host "  No existing nginx processes found." -ForegroundColor Green
}

# Remove existing service if it exists
Write-Host "[2/4] Removing existing service if present..." -ForegroundColor Gray
$existingSvc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingSvc) {
    & $NssmPath remove $ServiceName confirm 2>&1 | Out-Null
    Write-Host "  Removed existing service." -ForegroundColor Green
} else {
    Write-Host "  No existing service found." -ForegroundColor Green
}

# Install the service with NSSM
Write-Host "[3/4] Installing nginx as a Windows service..." -ForegroundColor Gray
& $NssmPath install $ServiceName $NginxPath
& $NssmPath set $ServiceName DisplayName "Nginx Server"
& $NssmPath set $ServiceName Description "Nginx HTTP server - hosts FileServer and other sites"
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath set $ServiceName AppDirectory $NginxDir
& $NssmPath set $ServiceName AppExit Default Restart
& $NssmPath set $ServiceName AppRestartDelay 5000
Write-Host "  Service installed successfully." -ForegroundColor Green

# Start the service
Write-Host "[4/4] Starting the service..." -ForegroundColor Gray
Start-Service $ServiceName
Start-Sleep -Seconds 2

# Verify
$svc = Get-Service $ServiceName
Write-Host ""
Write-Host "=== Service Status ===" -ForegroundColor Cyan
Write-Host "  Name:       $($svc.Name)"
Write-Host "  Display:    $($svc.DisplayName)"
Write-Host "  Status:     $($svc.Status)"
Write-Host "  StartType:  $($svc.StartType)"

# Test the endpoint
Write-Host ""
Write-Host "=== Connectivity Test ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9800/" -UseBasicParsing -TimeoutSec 5
    Write-Host "  Port 9800: OK (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  Port 9800: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Setup complete! nginx will start automatically on boot." -ForegroundColor Green
Write-Host ""
Write-Host "Service management commands:" -ForegroundColor Yellow
Write-Host "  Start:   Start-Service $ServiceName"
Write-Host "  Stop:    Stop-Service $ServiceName"
Write-Host "  Restart: Restart-Service $ServiceName"
Write-Host "  Status:  Get-Service $ServiceName"
Write-Host "  Remove:  & `"$NssmPath`" remove $ServiceName confirm"
Write-Host ""
Write-Host "To reload nginx config after changes:" -ForegroundColor Yellow
Write-Host "  cd $NginxDir ; .\nginx.exe -s reload"
