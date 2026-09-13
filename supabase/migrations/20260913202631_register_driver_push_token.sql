-- A push token is a secret device credential, not a company-owned address.
-- On a shared device a new authenticated driver must replace stale ownership
-- atomically, including after the previous account's offline logout.
-- Existing table policies/grants are intentionally unchanged.
create schema if not exists private;

create or replace function private.register_driver_push_token(
  p_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := p_token;
begin
  if v_uid is null or public.get_my_company_id() is null or
     not public.has_role(v_uid, 'driver'::public.app_role) then
    raise exception 'Logga in som förare för att registrera enheten' using errcode = '42501';
  end if;
  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'Ogiltig plattform för pushregistrering' using errcode = '22023';
  end if;

  -- APNs explicitly has variable length; FCM exposes an opaque string without
  -- a fixed public length contract. Do not require exactly 64/152/163 characters.
  -- 2048 bytes is a generous application/storage guard below the existing
  -- B-tree token index's entry limit, not a claimed provider token length.
  if p_token is null or octet_length(p_token) not between 1 and 2048 or
     p_token ~ '[[:space:][:cntrl:]]' then
    raise exception 'Ogiltig enhetstoken' using errcode = '22023';
  end if;
  if p_platform = 'ios' then
    -- Capacitor encodes APNs Data as uppercase pairs of hexadecimal digits.
    if p_token !~ '^([0-9A-Fa-f]{2})+$' then
      raise exception 'Ogiltig enhetstoken' using errcode = '22023';
    end if;
    v_token := upper(p_token);
  end if;

  -- There is no caller-supplied owner, timestamp, row ID, or conflict target.
  -- No prior owner's identity or token data is returned to the caller.
  insert into public.driver_push_tokens (user_id, token, platform, updated_at)
  values (v_uid, v_token, p_platform, statement_timestamp())
  on conflict (token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function private.register_driver_push_token(text, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.register_driver_push_token(text, text) to authenticated;

-- Only the invoker wrapper is in the Data API's exposed public schema.
create or replace function public.register_driver_push_token(p_token text, p_platform text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.register_driver_push_token(p_token, p_platform);
$$;

revoke all on function public.register_driver_push_token(text, text) from public, anon;
grant execute on function public.register_driver_push_token(text, text) to authenticated;

notify pgrst, 'reload schema';
