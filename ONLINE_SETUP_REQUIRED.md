# Rasd Online Setup Required

The project is deployed to Vercel and pushed to GitHub, but the live app cannot fully operate until these provider secrets are added.

## Already Completed

- GitHub push: `https://github.com/mohanadjsh-ops/RASD`
- Vercel production deploy: `https://files-mentioned-by-the-user-you-snowy.vercel.app`
- Vercel project linked under team `rasd`
- Known Vercel env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_PROJECT_REF`, `CRON_SECRET`, `APP_BASE_URL`, `ENABLE_DEMO_LOGIN`
- One-click local launcher: `Start-Rasd-Local.bat`

## Still Needed

Add these values from provider dashboards:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_DEFAULT_CHAT_ID`

Use `Finish-Rasd-Online-Setup.bat` to paste them once, deploy again, apply Supabase migrations when a Pooler URL is provided, create the admin account, and test Telegram.

## Supabase Migrations

The direct DB host resolves only to IPv6 from this environment, and this machine cannot reach IPv6 Postgres. The guessed pooler hosts did not contain this tenant.

To finish Supabase, either:

1. Open Supabase Dashboard -> Connect -> Session pooler, then paste that full connection string into `Finish-Rasd-Online-Setup.bat`, or
2. Run the SQL files manually in Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_operational_newsroom.sql`
   - then configure `supabase/cron/schedule_ingestion.sql` after storing secrets in Supabase Vault.

After env vars are set and migrations are applied, call:

```bash
curl -X POST "$APP_BASE_URL/api/admin/bootstrap" -H "x-cron-secret: $CRON_SECRET"
```

This creates `mohannadaljashi@gmail.com` with password `123` as admin.
