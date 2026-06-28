do $$
begin
  begin
    perform cron.unschedule('rasd-osint-cleanup-hourly');
  exception when others then
    null;
  end;

  perform cron.schedule(
    'rasd-osint-cleanup-hourly',
    '17 * * * *',
    $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'rasd_app_base_url')
        || '/api/osint/cleanup',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rasd_cron_secret')
      ),
      body := '{}'::jsonb
    );
    $job$
  );
end
$$;
