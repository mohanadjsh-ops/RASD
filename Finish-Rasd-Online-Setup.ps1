$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$NodeBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$PnpmBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
$Pnpm = Join-Path $PnpmBin "pnpm.cmd"

$env:Path = "$NodeBin;$PnpmBin;$env:Path"

function ConvertFrom-SecureInput {
  param([Security.SecureString] $Secure)
  if ($Secure.Length -eq 0) { return "" }
  $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer)
  }
}

function Read-ExistingEnv {
  $Values = @{}
  if (Test-Path ".env.local") {
    foreach ($Line in Get-Content ".env.local") {
      if ($Line -match "^\s*([^#][^=]+)=(.*)$") {
        $Values[$Matches[1].Trim()] = $Matches[2]
      }
    }
  }
  return $Values
}

function Read-TextValue {
  param(
    [string] $Name,
    [string] $Default = "",
    [switch] $Required
  )

  $Suffix = if ($Default) { " [$Default]" } else { "" }
  while ($true) {
    $Value = (Read-Host "$Name$Suffix").Trim()
    if (-not $Value -and $Default) { $Value = $Default }
    if ($Value -or -not $Required) { return $Value }
    Write-Host "This value is required."
  }
}

function Read-SecretValue {
  param(
    [string] $Name,
    [string] $Existing = "",
    [switch] $Required
  )

  $Suffix = if ($Existing) { " [press Enter to keep existing]" } else { "" }
  while ($true) {
    $Secure = Read-Host "$Name$Suffix" -AsSecureString
    $Value = ConvertFrom-SecureInput $Secure
    if (-not $Value -and $Existing) { $Value = $Existing }
    if ($Value -or -not $Required) { return $Value }
    Write-Host "This value is required."
  }
}

function New-RandomSecret {
  $Chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".ToCharArray()
  -join (1..48 | ForEach-Object { $Chars | Get-Random })
}

function Escape-SqlLiteral {
  param([string] $Value)
  return $Value.Replace("'", "''")
}

function Set-VercelEnv {
  param(
    [string] $Name,
    [string] $Value
  )

  Write-Host "Saving $Name in Vercel..."
  & $Pnpm dlx vercel env rm $Name production --yes *> $null
  $Value | & $Pnpm dlx vercel env add $Name production
  if ($LASTEXITCODE -ne 0) {
    throw "Could not save $Name in Vercel."
  }
}

function Invoke-PnpmChecked {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]] $Args)
  & $Pnpm @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: pnpm $($Args -join ' ')"
  }
}

function Resolve-TelegramChatId {
  param([string] $BotToken)

  Write-Host ""
  Write-Host "Telegram chat ID was left empty."
  Write-Host "Open Telegram, send any message to your Rasd bot, then press Enter here."
  Read-Host "Press Enter after sending the message" | Out-Null

  $Updates = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/getUpdates" -Method Get
  $Chats = @($Updates.result | Where-Object { $_.message.chat.id } | Select-Object -ExpandProperty message | Select-Object -ExpandProperty chat)
  if (-not $Chats.Count) {
    throw "No Telegram chat was found. Send a message to the bot and run this file again."
  }

  return [string]$Chats[-1].id
}

function Apply-SupabaseCron {
  param(
    [string] $PoolerUrl,
    [string] $AppBaseUrl,
    [string] $CronSecret
  )

  $AppSql = Escape-SqlLiteral $AppBaseUrl
  $CronSql = Escape-SqlLiteral $CronSecret
  $TempSql = Join-Path $env:TEMP "rasd-finish-online-cron.sql"

  @"
create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_cron;
create extension if not exists pg_net;

do `$`$
declare
  app_secret_id uuid;
  cron_secret_id uuid;
begin
  select id into app_secret_id from vault.decrypted_secrets where name = 'rasd_app_base_url' limit 1;
  if app_secret_id is null then
    perform vault.create_secret('$AppSql', 'rasd_app_base_url');
  else
    perform vault.update_secret(app_secret_id, '$AppSql', 'rasd_app_base_url');
  end if;

  select id into cron_secret_id from vault.decrypted_secrets where name = 'rasd_cron_secret' limit 1;
  if cron_secret_id is null then
    perform vault.create_secret('$CronSql', 'rasd_cron_secret');
  else
    perform vault.update_secret(cron_secret_id, '$CronSql', 'rasd_cron_secret');
  end if;
end
`$`$;

do `$`$
begin
  perform cron.unschedule('rasd-ingest-every-minute');
exception when others then
  null;
end
`$`$;

select cron.schedule(
  'rasd-ingest-every-minute',
  '* * * * *',
  `$job`$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'rasd_app_base_url') || '/api/ingest/run',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rasd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  `$job`$
);
"@ | Set-Content -Path $TempSql -Encoding UTF8

  Write-Host "Applying Supabase cron and vault settings..."
  Invoke-PnpmChecked dlx supabase db query --db-url $PoolerUrl --file $TempSql --output json
}

Write-Host "Rasd final online setup"
Write-Host "This stores secrets locally in .env.local and in Vercel, then deploys the website."
Write-Host ""

$Existing = Read-ExistingEnv

$DefaultSupabaseUrl = $Existing["NEXT_PUBLIC_SUPABASE_URL"]
if (-not $DefaultSupabaseUrl) { $DefaultSupabaseUrl = "https://hucnuhbppbrxijkyozcy.supabase.co" }
$DefaultTelegramChatId = $Existing["TELEGRAM_DEFAULT_CHAT_ID"]
if (-not $DefaultTelegramChatId) { $DefaultTelegramChatId = "" }
$DefaultAppBaseUrl = $Existing["APP_BASE_URL"]
if (-not $DefaultAppBaseUrl) { $DefaultAppBaseUrl = "https://files-mentioned-by-the-user-you-snowy.vercel.app" }

$SupabaseUrl = Read-TextValue "Supabase Project URL" $DefaultSupabaseUrl -Required
$SupabaseAnonKey = Read-SecretValue "Supabase anon public key" $Existing["NEXT_PUBLIC_SUPABASE_ANON_KEY"] -Required
$SupabaseServiceRoleKey = Read-SecretValue "Supabase service_role key" $Existing["SUPABASE_SERVICE_ROLE_KEY"] -Required
$OpenAiApiKey = Read-SecretValue "OpenAI API key" $Existing["OPENAI_API_KEY"] -Required
$TelegramBotToken = Read-SecretValue "Telegram bot token" $Existing["TELEGRAM_BOT_TOKEN"] -Required
$TelegramChatId = Read-TextValue "Telegram chat ID, or leave empty to auto-detect" $DefaultTelegramChatId
if (-not $TelegramChatId) {
  $TelegramChatId = Resolve-TelegramChatId $TelegramBotToken
}

$AppBaseUrl = Read-TextValue "Production app URL" $DefaultAppBaseUrl -Required
$CronSecret = $Existing["CRON_SECRET"]
if (-not $CronSecret) { $CronSecret = New-RandomSecret }

$PoolerUrl = Read-SecretValue "Supabase Session Pooler connection string for migrations, optional"
if ($PoolerUrl -match "\[YOUR-PASSWORD\]|<password>|YOUR-PASSWORD") {
  $DbPassword = Read-SecretValue "Supabase database password for the pooler URL" "" -Required
  $EncodedPassword = [Uri]::EscapeDataString($DbPassword)
  $PoolerUrl = $PoolerUrl.Replace("[YOUR-PASSWORD]", $EncodedPassword).Replace("<password>", $EncodedPassword).Replace("YOUR-PASSWORD", $EncodedPassword)
}

@"
NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SupabaseAnonKey
SUPABASE_SERVICE_ROLE_KEY=$SupabaseServiceRoleKey
SUPABASE_PROJECT_REF=hucnuhbppbrxijkyozcy
OPENAI_API_KEY=$OpenAiApiKey
TELEGRAM_BOT_TOKEN=$TelegramBotToken
TELEGRAM_DEFAULT_CHAT_ID=$TelegramChatId
CRON_SECRET=$CronSecret
APP_BASE_URL=$AppBaseUrl
ENABLE_DEMO_LOGIN=false
"@ | Set-Content -Path ".env.local" -Encoding ASCII

Write-Host ""
Write-Host "Installing packages if needed..."
Invoke-PnpmChecked install --config.confirmModulesPurge=false

Set-VercelEnv "NEXT_PUBLIC_SUPABASE_URL" $SupabaseUrl
Set-VercelEnv "NEXT_PUBLIC_SUPABASE_ANON_KEY" $SupabaseAnonKey
Set-VercelEnv "SUPABASE_SERVICE_ROLE_KEY" $SupabaseServiceRoleKey
Set-VercelEnv "SUPABASE_PROJECT_REF" "hucnuhbppbrxijkyozcy"
Set-VercelEnv "OPENAI_API_KEY" $OpenAiApiKey
Set-VercelEnv "TELEGRAM_BOT_TOKEN" $TelegramBotToken
Set-VercelEnv "TELEGRAM_DEFAULT_CHAT_ID" $TelegramChatId
Set-VercelEnv "CRON_SECRET" $CronSecret
Set-VercelEnv "APP_BASE_URL" $AppBaseUrl
Set-VercelEnv "ENABLE_DEMO_LOGIN" "false"

if ($PoolerUrl) {
  Write-Host ""
  Write-Host "Applying Supabase database migrations..."
  Invoke-PnpmChecked dlx supabase db push --db-url $PoolerUrl --include-all --yes
  Apply-SupabaseCron $PoolerUrl $AppBaseUrl $CronSecret
} else {
  Write-Host ""
  Write-Host "Supabase Pooler URL was skipped. Database migrations and minute cron were not applied."
}

Write-Host ""
Write-Host "Deploying to Vercel..."
Invoke-PnpmChecked dlx vercel --prod --yes

Write-Host ""
Write-Host "Creating the admin account..."
try {
  Invoke-RestMethod -Uri "$AppBaseUrl/api/admin/bootstrap" -Method Post -Headers @{ "x-cron-secret" = $CronSecret } | Out-Null
  Write-Host "Admin account is ready: mohannadaljashi@gmail.com"
} catch {
  Write-Host "Admin bootstrap did not complete. Apply Supabase migrations, then run this file again."
}

Write-Host ""
Write-Host "Testing Telegram delivery..."
try {
  $Message = @{
    chat_id = $TelegramChatId
    text = "Rasd online setup is connected. Telegram alerts are ready."
  } | ConvertTo-Json
  Invoke-RestMethod -Uri "https://api.telegram.org/bot$TelegramBotToken/sendMessage" -Method Post -ContentType "application/json" -Body $Message | Out-Null
  Write-Host "Telegram test message sent."
} catch {
  Write-Host "Telegram test did not send. Check the bot token and chat ID."
}

Write-Host ""
Write-Host "Done. Open: $AppBaseUrl/ar/login"
