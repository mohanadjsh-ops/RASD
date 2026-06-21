# Rasd

Rasd / رصد is a private bilingual breaking-news monitoring dashboard for newsroom intelligence, source-based confidence scoring, Telegram alerts, and Arabic newsroom-ready outputs.

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000/ar` or `http://localhost:3000/en`.

On Windows, double-click `Start-Rasd-Local.bat` to start the local version on `http://localhost:3002/ar/login`.

For online setup, use `Setup-Rasd-Online-Env.bat` after copying the missing keys from Supabase, OpenAI, and Telegram.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Required Services

- Supabase Auth and Postgres.
- Supabase SQL migrations in `supabase/migrations`.
- Supabase Cron using `supabase/cron/schedule_ingestion.sql`.
- Telegram Bot API for alerts.
- OpenAI API for the protected newsroom tool.

## First Admin

After configuring Supabase environment variables and `CRON_SECRET`, create the first admin account with a protected bootstrap call:

```bash
curl -X POST "$APP_BASE_URL/api/admin/bootstrap" -H "x-cron-secret: $CRON_SECRET"
```

This creates or updates `mohannadaljashi@gmail.com` with password `123` and role `admin`. Change the password before sensitive production use.
