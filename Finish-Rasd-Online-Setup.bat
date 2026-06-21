@echo off
setlocal
title Finish Rasd Online Setup

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Finish-Rasd-Online-Setup.ps1"

pause
