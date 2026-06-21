# Deployment

## Vercel

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Set all required environment variables from `.env.example`.
4. Set `APP_BASE_URL` to the production Vercel URL.
5. Do not use Vercel Hobby Cron for minute-by-minute monitoring; use Supabase Cron below.

## Supabase

1. Create a Supabase project.
2. Enable email/password Auth.
3. Run all SQL files in `supabase/migrations`.
4. Store `APP_BASE_URL` and `CRON_SECRET` in Supabase Vault as shown in `supabase/cron/schedule_ingestion.sql`.
5. Run `supabase/cron/schedule_ingestion.sql` to call ingestion every minute.
6. Call `POST /api/admin/bootstrap` with `x-cron-secret` to create `mohannadaljashi@gmail.com / 123` as admin.
7. Confirm RLS is enabled on all user-facing tables.

## Telegram

1. Create a bot through BotFather.
2. Set `TELEGRAM_BOT_TOKEN`.
3. Send a message to the bot or add it to the target chat/channel.
4. Set `TELEGRAM_DEFAULT_CHAT_ID`.
5. Use the Alerts page test button to verify delivery.

## Production Checklist

- Use a strong `CRON_SECRET`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`.
- Do not expose `OPENAI_API_KEY` or `TELEGRAM_BOT_TOKEN`.
- Change the initial admin password before sensitive use.
- Confirm admin account MFA policy outside this app if required.
- Review audit logs after first source and settings changes.
