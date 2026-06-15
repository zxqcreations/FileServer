# FileServer Backend Service Setup Script
# Run this script as Administrator to install the FileServer Node backend as a Windows service
# Usage: Right-click → Run with PowerShell (as Administrator)
# Or from an elevated terminal: powershell -File setup-fileserver-service.ps1

$ErrorActionPreference = "Stop"

$ServiceName = "FileServer"
$NodePath = "C:\Program Files\nodejs\node.exe"
$ServerDir = "D:\ENV\FileServer\server"
$NssmPath = "D:\ENV\nssm\nssm-2.24\win64\nssm.exe"

Write-Host "=== FileServer Backend Service Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator', then re-run this script." -ForegroundColor Yellow
    exit 1
}

# Stop any existing node processes running the FileServer
Write-Host "[1/4] Stopping any existing FileServer processes..." -ForegroundColor Gray
$existing = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*FileServer*" }
if ($existing) {
    Stop-Process -Id $existing.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "  Stopped existing FileServer node process." -ForegroundColor Green
} else {
    Write-Host "  No existing FileServer process found." -ForegroundColor Green
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
Write-Host "[3/4] Installing FileServer backend as a Windows service..." -ForegroundColor Gray
& $NssmPath install $ServiceName $NodePath "dist/main.js"
& $NssmPath set $ServiceName DisplayName "FileServer Backend"
& $NssmPath set $ServiceName Description "FileServer Fastify API backend on port 3000"
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath set $ServiceName AppDirectory $ServerDir
& $NssmPath set $ServiceName AppExit Default Restart
& $NssmPath set $ServiceName AppRestartDelay 5000

# Set standard output/error to log files for troubleshooting
& $NssmPath set $ServiceName AppStdout "$ServerDir\logs\service-out.log"
& $NssmPath set $ServiceName AppStderr "$ServerDir\logs\service-err.log"
# Ensure logs directory exists
New-Item -ItemType Directory -Force -Path "$ServerDir\logs" | Out-Null

# Set environment variables
$envVars = @"
PORT=3000
HOST=0.0.0.0
FILE_STORAGE_ROOT=D:\ENV\FileServer\file_storage
"@
& $NssmPath set $ServiceName AppEnvironmentExtra $envVars

Write-Host "  Service installed successfully." -ForegroundColor Green

# Start the service
Write-Host "[4/4] Starting the service..." -ForegroundColor Gray
Start-Service $ServiceName
Start-Sleep -Seconds 3

# Verify
$svc = Get-Service $ServiceName
Write-Host ""
Write-Host "=== Service Status ===" -ForegroundColor Cyan
Write-Host "  Name:       $($svc.Name)"
Write-Host "  Display:    $($svc.DisplayName)"
Write-Host "  Status:     $($svc.Status)"
Write-Host "  StartType:  $($svc.StartType)"

# Test the API endpoint
Write-Host ""
Write-Host "=== API Health Check ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "  Port 3000: OK (HTTP $($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "  Port 3000: FAILED — $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Checking service log for errors..." -ForegroundColor Yellow
    if (Test-Path "$ServerDir\logs\service-err.log") {
        Write-Host "  Recent errors:" -ForegroundColor Yellow
        Get-Content "$ServerDir\logs\service-err.log" -Tail 10
    }
}

Write-Host ""
Write-Host "Setup complete! FileServer backend will start automatically on boot." -ForegroundColor Green
Write-Host ""
Write-Host "Service management commands:" -ForegroundColor Yellow
Write-Host "  Start:   Start-Service $ServiceName"
Write-Host "  Stop:    Stop-Service $ServiceName"
Write-Host "  Restart: Restart-Service $ServiceName"
Write-Host "  Status:  Get-Service $ServiceName"
Write-Host "  Remove:  & `"$NssmPath`" remove $ServiceName confirm"
