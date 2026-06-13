#!/usr/bin/env pwsh
<#
.SYNOPSIS
  FileServer — One-Click Startup (Windows)
.DESCRIPTION
  Installs dependencies, builds server and client, then starts FileServer.
  Requires Node.js and PowerShell 7+ (pwsh).
#>
$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  FileServer — One-Click Startup (Windows)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# [1/4] Install root dependencies
Write-Host "[1/4] Installing root dependencies..." -ForegroundColor Yellow
npm install --silent
if ($LASTEXITCODE -ne 0) { throw "Root npm install failed" }

# [2/4] Install server dependencies
Write-Host "[2/4] Installing server dependencies..." -ForegroundColor Yellow
Push-Location server
npm install --silent
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Server npm install failed" }
Pop-Location

# [3/4] Install client dependencies
Write-Host "[3/4] Installing client dependencies..." -ForegroundColor Yellow
Push-Location client
npm install --silent
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Client npm install failed" }
Pop-Location

# [4/4] Build
Write-Host "[4/4] Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Starting FileServer" -ForegroundColor Green
Write-Host "  -> http://localhost:3000" -ForegroundColor Green
Write-Host "  -> Storage: .\file_storage" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

npm start
