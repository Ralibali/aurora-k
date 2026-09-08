-- Run after dispatch-notifications and its credential-validation RPC are deployed.
-- The credential lives only in Vault. This never replays legacy outbox entries.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
  if not exists(select 1 from vault.secrets where name='aurora_notification_cron_secret') then
    raise exception 'Configure the notification scheduler secret first';
  end if;
end $$;
select cron.schedule('aurora-notification-outbox','* * * * *',$job$
  select net.http_post(
    url := 'https://dqjwtnziasqtveuwnalx.supabase.co/functions/v1/dispatch-notifications',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='aurora_notification_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 120000
  );
$job$);
select cron.schedule('aurora-mail-rate-limit-cleanup','17 3 * * *',$job$
  delete from public.mail_rate_limits where window_started_at < now()-interval '2 days';
$job$);
