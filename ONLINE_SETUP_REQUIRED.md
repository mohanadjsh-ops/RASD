# Rasd Online Status

The project is deployed, connected to Supabase, connected to OpenAI, and connected to Telegram.

## Already Completed

- GitHub push: `https://github.com/mohanadjsh-ops/RASD`
- Vercel production deploy: `https://files-mentioned-by-the-user-you-snowy.vercel.app`
- Vercel project linked under team `rasd`
- Supabase production environment variables are present in Vercel.
- Supabase migrations were applied to the live project.
- Supabase Cron is scheduled to call ingestion every minute.
- OpenAI API is configured for the newsroom generation route.
- Telegram bot alerts are configured and a direct Telegram test message was sent.
- The admin account is ready: `mohannadaljashi@gmail.com`.
- One-click local launcher: `Start-Rasd-Local.bat`

## Operational Notes

All required production environment variables are present in Vercel. Rotate the OpenAI and Telegram secrets from their provider dashboards if they are ever shared outside the deployment workflow.
