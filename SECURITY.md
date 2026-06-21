# Security

## Authentication

Supabase Auth handles email/password login. Dashboard pages are protected by middleware and server-side guards. The app supports `admin` and `viewer` roles through the `profiles` table.

## Secrets

Service-role, OpenAI, Telegram, and cron secrets must remain server-side environment variables. The browser receives only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## RLS Policies

All user-facing tables have RLS enabled in the migrations.

- `profiles`: users read their own profile; admins can read/update.
- `sources`: authenticated users read; only admins insert/update/delete.
- `raw_articles`, `story_clusters`, `cluster_sources`, `alerts`, `media_links`: authenticated read access.
- `summaries`: users read their own summaries; admins can read all; users insert their own.
- `user_settings`: users manage their own settings; admins can inspect/update when operationally needed.
- `audit_logs` and `fetch_runs`: admin read only.
- `notification_channels`: users manage their own channels.

## Rate Limiting

Sensitive routes use an in-memory limiter. For multi-region production, replace this with Redis, Upstash, or Vercel KV.

## Known Risks

- RSS source trust must be curated by an admin.
- The confidence score is rule-based and transparent, not absolute truth.
- OpenAI output must be reviewed before publication.
- Telegram Bot tokens can send external messages and must be rotated if exposed.
- The requested initial password `123` is weak and should be changed before sensitive production use.
