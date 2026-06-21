-- Run after storing rasd_app_base_url and rasd_cron_secret in Supabase Vault.
-- Sends four daily digest reports at 00:00, 06:00, 12:00, and 18:00 UTC+3.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('rasd-email-digest-every-six-hours');
exception when others then
  null;
end $$;

select cron.schedule(
  'rasd-email-digest-every-six-hours',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'rasd_app_base_url') || '/api/reports/email-digest',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rasd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
