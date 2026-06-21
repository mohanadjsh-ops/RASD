@echo off
setlocal
title Rasd Local

cd /d "%~dp0"

set "NODE_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
set "PATH=%NODE_BIN%;%PNPM_BIN%;%PATH%"

if not exist ".env.local" (
  echo ENABLE_DEMO_LOGIN=true>.env.local
  echo DEMO_ADMIN_USER=mohannadaljashi@gmail.com>>.env.local
  echo DEMO_ADMIN_PASSWORD=123>>.env.local
)

if not exist "node_modules" (
  echo Installing project packages...
  call pnpm install --config.confirmModulesPurge=false
  if errorlevel 1 pause & exit /b 1
)

echo Starting Rasd on http://localhost:3002/ar/login
start "" "http://localhost:3002/ar/login"
call pnpm exec next dev -p 3002

pause
