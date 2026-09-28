-- Repair companies whose missing defaults block assignment creation.
-- Does not change existing settings or per-driver overrides, or send notifications.
begin;
set local lock_timeout = '5s';
lock table public.driver_settings in share row exclusive mode;
with inserted as (
  insert into public.driver_settings (company_id)
  select c.id from public.companies c
  where not exists (
    select 1 from public.driver_settings s where s.company_id = c.id
  )
  returning id
)
select count(*) as initialized_companies from inserted;
commit;
