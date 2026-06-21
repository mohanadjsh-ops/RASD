# Rasd Project Status

## Architecture

- Next.js App Router with locale routes under `/ar` and `/en`.
- Supabase Auth protects dashboard routes through middleware and server-side guards.
- Supabase Postgres stores profiles, sources, raw articles, story clusters, media links, alerts, summaries, settings, audit logs, notification channels, and fetch runs.
- RLS is enabled with role-aware source management, user-owned settings/summaries, admin-only audit/fetch visibility, and authenticated media/story reads.
- RSS ingestion is server-side only and protected through `CRON_SECRET`.
- Supabase Cron can call `/api/ingest/run` every minute using `supabase/cron/schedule_ingestion.sql`.
- Telegram is the active alert channel; email alerts are disabled.
- Newsroom output first gathers supporting sources, then generates the reference-format Arabic output with OpenAI structured JSON and saves it to `summaries`.

## Completed Phases

1. Project foundation: Next.js, TypeScript, Tailwind, config, scripts, environment example.
2. Bilingual routing and layout: `/ar`, `/en`, RTL/LTR, translation files, language switcher.
3. Authentication and protected dashboard: Supabase login, middleware, server guards, admin/viewer role checks.
4. Database migrations and RLS: base schema plus operational migration for media, fetch runs, seeded sources, and alert fields.
5. Sources management: sources page, admin-only source creation route, seeded free RSS sources.
6. RSS ingestion and clustering: resilient RSS parser, dedupe by URL/hash, media extraction, source-count verification.
7. Verification and confidence scoring: trusted-only Telegram alert rule.
8. Telegram alerts: Bot API provider, ingestion-triggered alerts, manual test route.
9. Newsroom tool: source lookup, reference-format output, OpenAI JSON output, save to history.
10. Admin user management: protected user list/create UI and API.
11. Documentation, security review, and deployment readiness.

## Pending Hardening

- Apply Supabase migrations and run the protected admin bootstrap after real Supabase credentials are configured.
- Add full edit/delete source forms and client-side settings persistence UI.
- Add automated tests for ingestion and Telegram once service credentials are available.
- Add a Supabase Edge Function version of ingestion if preferred over the protected Next.js route.

## Commands Run

- Created app directories and source files.
- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Added `supabase/migrations/002_operational_newsroom.sql`.
- Added `supabase/cron/schedule_ingestion.sql`.

## Issues Found And Fixed

- Added pnpm build-script approval for `sharp` and `unrs-resolver`.
- Added the bundled Node runtime to PATH for package postinstall scripts.
- Fixed strict TypeScript cookie adapter types for Supabase SSR.
- Updated Next config from deprecated `experimental.typedRoutes` to top-level `typedRoutes`.
- Disabled email alert route and replaced the notification provider with Telegram.
- Added source/media extraction and resilient per-source RSS failure handling.

## Notes

The system intentionally reports confidence and source basis. It does not claim independent absolute truth.
