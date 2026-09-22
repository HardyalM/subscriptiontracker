-- Phase 8 — the daily alert run.
--
-- pg_cron fires the job inside Postgres; pg_net makes the HTTP call out to
-- the Edge Function, because Postgres cannot invoke one directly.
--
-- Authentication uses the project's own service_role key, read from Vault at
-- call time rather than written into the job definition — cron.job is a
-- readable table, and a key pasted into it would sit there in plaintext.
-- Create the secret once before this job can do anything:
--
--   select vault.create_secret('<service_role_key>', 'service_role_key');
--
-- Until it exists the job still fires, is rejected with a 401, and sends
-- nothing. That is the intended failure: no secret, no email.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-daily-alerts',
  '0 8 * * *',   -- 08:00 UTC daily. The window is 48h, so one missed run is not fatal.
  $job$
  select net.http_post(
    url     := 'https://ikciulwowowqqftwajss.supabase.co/functions/v1/send-alerts',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
        ''
      )
    )
  );
  $job$
);
