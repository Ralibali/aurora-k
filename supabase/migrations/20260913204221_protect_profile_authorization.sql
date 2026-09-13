-- A profile is a display mirror, not a client-writable authorization source.
-- Keep the current RLS policies: this guard only narrows permitted writes.
create or replace function public.protect_profile_authorization()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Invoker security preserves the database role of trusted Auth/registration
  -- functions, while a normal REST client remains anon/authenticated here.
  if current_user in ('postgres', 'supabase_admin', 'service_role')
    or public.is_platform_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.company_id is distinct from old.company_id
      or new.role is distinct from old.role then
      raise exception using errcode = '42501',
        message = 'Profile identity, company and role require a trusted server operation';
    end if;
  elsif tg_op = 'INSERT' then
    -- Do not turn DELETE + INSERT into an alternate role grant or tenant move.
    -- A company profile may only mirror an already protected membership for
    -- this exact identity, tenant and role. The lookup also obeys caller RLS.
    if new.company_id is null then
      if new.id is distinct from auth.uid() or new.role is distinct from 'driver' then
        raise exception using errcode = '42501',
          message = 'Profile insertion requires a matching protected membership';
      end if;
    elsif not exists (
      select 1 from public.user_roles r
      where r.user_id = new.id
        and r.company_id = new.company_id
        and r.role::text = new.role
    ) then
      raise exception using errcode = '42501',
        message = 'Profile insertion requires a matching protected membership';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_authorization() from public, anon, authenticated;
drop trigger if exists protect_profile_authorization on public.profiles;
create trigger protect_profile_authorization
before insert or update on public.profiles
for each row execute function public.protect_profile_authorization();
