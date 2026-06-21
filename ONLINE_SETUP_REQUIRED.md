# Rasd Online Status

The project is deployed, connected to Supabase, and the primary admin account has been created.

## Already Completed

- GitHub push: `https://github.com/mohanadjsh-ops/RASD`
- Vercel production deploy: `https://files-mentioned-by-the-user-you-snowy.vercel.app`
- Vercel project linked under team `rasd`
- Supabase production environment variables are present in Vercel.
- Supabase migrations were applied to the live project.
- Supabase Cron is scheduled to call ingestion every minute.
- The admin account is ready: `mohannadaljashi@gmail.com`.
- One-click local launcher: `Start-Rasd-Local.bat`

## Still Needed

Add these values from provider dashboards to enable AI editing and Telegram alerts:

- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_DEFAULT_CHAT_ID`

Use `Finish-Rasd-Online-Setup.bat` to paste them once and deploy again, or add them directly in Vercel production environment variables.
