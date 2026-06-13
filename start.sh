#!/bin/bash
set -e

echo "================================================"
echo "  FileServer — One-Click Startup"
echo "================================================"
echo ""

# Install dependencies
echo "[1/4] Installing root dependencies..."
npm install --silent

echo "[2/4] Installing server dependencies..."
npm --prefix server install --silent

echo "[3/4] Installing client dependencies..."
npm --prefix client install --silent

# Build
echo "[4/4] Building..."
npm run build

echo ""
echo "================================================"
echo "  Starting FileServer"
echo "  -> http://localhost:3000"
echo "  -> Storage: ./file_storage"
echo "================================================"
echo ""

npm start
