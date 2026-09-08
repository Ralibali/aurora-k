-- Verify the scheduler credential without exposing Vault data to the Edge worker.
-- The credential itself is provisioned separately inside the database.
create or replace function public.validate_notification_cron_secret(p_secret text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if p_secret is null or pg_catalog.length(p_secret) not between 32 and 256 then
    return false;
  end if;

  if pg_catalog.to_regclass('vault.decrypted_secrets') is null then
    return false;
  end if;

  select s.decrypted_secret into v_secret
  from vault.decrypted_secrets as s
  where s.name = 'aurora_notification_cron_secret'
  limit 1;

  return coalesce(
    pg_catalog.sha256(pg_catalog.convert_to(v_secret, 'UTF8'))
      = pg_catalog.sha256(pg_catalog.convert_to(p_secret, 'UTF8')),
    false
  );
end;
$$;

revoke all on function public.validate_notification_cron_secret(text) from public, anon, authenticated;
grant execute on function public.validate_notification_cron_secret(text) to service_role;

notify pgrst, 'reload schema';
