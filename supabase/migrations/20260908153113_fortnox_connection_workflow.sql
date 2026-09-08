-- Backend-only OAuth state, credentials and per-company serialization.
alter table public.fortnox_oauth_states add column expected_org_number text;
create table public.fortnox_operation_locks (
  company_id uuid primary key references public.companies(id) on delete cascade,
  owner uuid not null,
  expires_at timestamptz not null
);
alter table public.fortnox_operation_locks enable row level security;
revoke all on public.fortnox_operation_locks, public.fortnox_connections, public.fortnox_oauth_states from anon, authenticated;
grant all on public.fortnox_operation_locks, public.fortnox_connections, public.fortnox_oauth_states,
  public.fortnox_invoice_syncs, public.fortnox_customer_mappings to service_role;

create or replace function public.read_fortnox_tokens(p_company_id uuid)
returns table(access_token text, refresh_token text, token_expires_at timestamptz, scopes text[], status text)
language sql security definer set search_path = '' as $$
  select a.decrypted_secret, r.decrypted_secret, c.token_expires_at, c.scopes, c.status
  from public.fortnox_connections c
  join vault.decrypted_secrets a on a.id = c.access_token_secret_id
  join vault.decrypted_secrets r on r.id = c.refresh_token_secret_id
  where c.company_id = p_company_id;
$$;

create function public.claim_fortnox_operation(p_company_id uuid, p_owner uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.fortnox_operation_locks(company_id,owner,expires_at)
  values(p_company_id,p_owner,now()+interval '2 minutes')
  on conflict(company_id) do update set owner=excluded.owner,expires_at=excluded.expires_at
  where public.fortnox_operation_locks.expires_at < now();
  return found;
end; $$;

create function public.disconnect_fortnox(p_company_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.fortnox_connections;
begin
  select * into c from public.fortnox_connections where company_id=p_company_id for update;
  if not found then return; end if;
  delete from vault.secrets where id in(c.access_token_secret_id,c.refresh_token_secret_id);
  delete from public.fortnox_connections where company_id=p_company_id;
  delete from public.fortnox_oauth_states where company_id=p_company_id;
  -- Keep export history to prevent duplicates after reconnection.
end; $$;

revoke all on function public.read_fortnox_tokens(uuid), public.claim_fortnox_operation(uuid,uuid), public.disconnect_fortnox(uuid) from public, anon, authenticated;
grant execute on function public.read_fortnox_tokens(uuid), public.claim_fortnox_operation(uuid,uuid), public.disconnect_fortnox(uuid) to service_role;
