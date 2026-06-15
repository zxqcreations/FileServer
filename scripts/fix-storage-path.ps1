$ErrorActionPreference = "Stop"
$nssm = "D:\ENV\nssm\nssm-2.24\win64\nssm.exe"

if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: Must run as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "Stopping FileServer service..."
Stop-Service FileServer -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Setting environment variables..."
$envVars = @"
PORT=3000
HOST=0.0.0.0
FILE_STORAGE_ROOT=D:\ENV\FileServer\file_storage
"@

& $nssm set FileServer AppEnvironmentExtra $envVars
Write-Host "Env vars set."

Write-Host "Starting FileServer service..."
Start-Service FileServer
Start-Sleep -Seconds 3

$svc = Get-Service FileServer
Write-Host "Service status: $($svc.Status)"

# Test
try {
    $r = Invoke-RestMethod -Uri "http://localhost:3000/api/files" -UseBasicParsing -TimeoutSec 5
    Write-Host ""
    Write-Host "API result: success=$($r.success), items=$($r.data.items.Count)" -ForegroundColor Green
    $r.data.items | ForEach-Object { Write-Host "  - $($_.name)" }
} catch {
    Write-Host "API test FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
