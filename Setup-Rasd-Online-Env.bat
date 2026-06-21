@echo off
setlocal
title Rasd Online Environment Setup

cd /d "%~dp0"

set "NODE_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
set "PATH=%NODE_BIN%;%PNPM_BIN%;%PATH%"

echo This setup stores secrets in Vercel and writes .env.local for local testing.
echo Paste values from Supabase, OpenAI, and Telegram when asked.
echo.

set /p NEXT_PUBLIC_SUPABASE_URL=Supabase Project URL [https://hucnuhbppbrxijkyozcy.supabase.co]:
if "%NEXT_PUBLIC_SUPABASE_URL%"=="" set "NEXT_PUBLIC_SUPABASE_URL=https://hucnuhbppbrxijkyozcy.supabase.co"
set /p NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase anon public key:
set /p SUPABASE_SERVICE_ROLE_KEY=Supabase service_role key:
set /p OPENAI_API_KEY=OpenAI API key:
set /p TELEGRAM_BOT_TOKEN=Telegram bot token:
set /p TELEGRAM_DEFAULT_CHAT_ID=Telegram chat ID:
set /p APP_BASE_URL=Production app URL [https://files-mentioned-by-the-user-you-snowy.vercel.app]:
if "%APP_BASE_URL%"=="" set "APP_BASE_URL=https://files-mentioned-by-the-user-you-snowy.vercel.app"

for /f "delims=" %%A in ('powershell -NoProfile -Command "-join ((48..57+65..90+97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})"') do set "CRON_SECRET=%%A"

(
echo NEXT_PUBLIC_SUPABASE_URL=%NEXT_PUBLIC_SUPABASE_URL%
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%NEXT_PUBLIC_SUPABASE_ANON_KEY%
echo SUPABASE_SERVICE_ROLE_KEY=%SUPABASE_SERVICE_ROLE_KEY%
echo OPENAI_API_KEY=%OPENAI_API_KEY%
echo TELEGRAM_BOT_TOKEN=%TELEGRAM_BOT_TOKEN%
echo TELEGRAM_DEFAULT_CHAT_ID=%TELEGRAM_DEFAULT_CHAT_ID%
echo CRON_SECRET=%CRON_SECRET%
echo APP_BASE_URL=%APP_BASE_URL%
echo SUPABASE_PROJECT_REF=hucnuhbppbrxijkyozcy
echo ENABLE_DEMO_LOGIN=false
) > .env.local

call :addenv NEXT_PUBLIC_SUPABASE_URL "%NEXT_PUBLIC_SUPABASE_URL%"
call :addenv NEXT_PUBLIC_SUPABASE_ANON_KEY "%NEXT_PUBLIC_SUPABASE_ANON_KEY%"
call :addenv SUPABASE_SERVICE_ROLE_KEY "%SUPABASE_SERVICE_ROLE_KEY%"
call :addenv OPENAI_API_KEY "%OPENAI_API_KEY%"
call :addenv TELEGRAM_BOT_TOKEN "%TELEGRAM_BOT_TOKEN%"
call :addenv TELEGRAM_DEFAULT_CHAT_ID "%TELEGRAM_DEFAULT_CHAT_ID%"
call :addenv CRON_SECRET "%CRON_SECRET%"
call :addenv APP_BASE_URL "%APP_BASE_URL%"
call :addenv SUPABASE_PROJECT_REF "hucnuhbppbrxijkyozcy"
call :addenv ENABLE_DEMO_LOGIN "false"

echo.
echo Deploying to Vercel...
call pnpm dlx vercel --prod --yes

echo.
echo Done. Now run Supabase migrations from the dashboard SQL editor or provide the pooler connection string.
pause
exit /b 0

:addenv
echo Setting %~1
call pnpm dlx vercel env rm %~1 production --yes >nul 2>nul
echo %~2| call pnpm dlx vercel env add %~1 production
exit /b 0
