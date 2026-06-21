$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$nodeBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$pnpmBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
$env:PATH = "$nodeBin;$pnpmBin;$env:PATH"

if (-not (Test-Path -LiteralPath ".env.local")) {
  @"
ENABLE_DEMO_LOGIN=true
DEMO_ADMIN_USER=mohannadaljashi@gmail.com
DEMO_ADMIN_PASSWORD=123
"@ | Set-Content -LiteralPath ".env.local" -Encoding UTF8
}

if (-not (Test-Path -LiteralPath "node_modules")) {
  pnpm install --config.confirmModulesPurge=false
}

Start-Process "http://localhost:3002/ar/login"
pnpm exec next dev -p 3002
