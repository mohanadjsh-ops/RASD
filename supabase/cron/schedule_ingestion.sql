-- Run this after setting secrets in Supabase Vault:
-- select vault.create_secret('https://YOUR_APP_DOMAIN', 'rasd_app_base_url');
-- select vault.create_secret('YOUR_CRON_SECRET', 'rasd_cron_secret');
--
-- This calls the protected Next.js ingestion route every minute.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'rasd-ingest-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'rasd_app_base_url') || '/api/ingest/run',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rasd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
