@echo off
setlocal

cd /d "%~dp0"

set "NODE_BIN=C:\Users\Mohanad\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "TOOL_BIN=C:\Users\Mohanad\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
set "PNPM=%TOOL_BIN%\pnpm.cmd"

if not exist "%PNPM%" (
  echo Could not find the local pnpm runtime.
  echo Please open this project in Codex once, then try again.
  pause
  exit /b 1
)

set "PATH=%NODE_BIN%;%TOOL_BIN%;%PATH%"

if not exist "node_modules" (
  echo Installing project packages...
  "%PNPM%" install
  if errorlevel 1 (
    echo Package installation failed.
    pause
    exit /b 1
  )
)

start "" "http://localhost:3002/ar/login"
echo Starting Rasd on http://localhost:3002/ar/login
"%PNPM%" dev -- --hostname 0.0.0.0 --port 3002

pause
