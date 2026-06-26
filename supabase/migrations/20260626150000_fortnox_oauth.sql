create extension if not exists pgcrypto;
create extension if not exists supabase_vault with schema vault;

create table if not exists public.fortnox_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade unique,
  access_token_secret_id uuid not null,
  refresh_token_secret_id uuid not null,
  token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','expired','revoked','error')),
  fortnox_company_name text,
  fortnox_organization_number text,
  last_error text,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fortnox_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_after text not null default '/admin/settings',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.fortnox_customer_mappings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  fortnox_customer_number text not null,
  updated_at timestamptz not null default now(),
  unique (company_id, customer_id),
  unique (company_id, fortnox_customer_number)
);

create table if not exists public.fortnox_invoice_syncs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  fortnox_document_number text,
  status text not null default 'pending' check (status in ('pending','synced','failed')),
  idempotency_key uuid not null default gen_random_uuid() unique,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_id)
);

alter table public.fortnox_connections enable row level security;
alter table public.fortnox_oauth_states enable row level security;
alter table public.fortnox_customer_mappings enable row level security;
alter table public.fortnox_invoice_syncs enable row level security;

create or replace function public.store_fortnox_tokens(
  p_company_id uuid,
  p_user_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_scopes text[]
) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_access_id uuid;
  v_refresh_id uuid;
begin
  select access_token_secret_id, refresh_token_secret_id
  into v_access_id, v_refresh_id
  from public.fortnox_connections
  where company_id = p_company_id;

  if v_access_id is null then
    select vault.create_secret(p_access_token, 'fortnox-access-' || p_company_id::text) into v_access_id;
    select vault.create_secret(p_refresh_token, 'fortnox-refresh-' || p_company_id::text) into v_refresh_id;
  else
    perform vault.update_secret(v_access_id, p_access_token);
    perform vault.update_secret(v_refresh_id, p_refresh_token);
  end if;

  insert into public.fortnox_connections (
    company_id, access_token_secret_id, refresh_token_secret_id,
    token_expires_at, scopes, status, connected_by, connected_at, updated_at, last_error
  ) values (
    p_company_id, v_access_id, v_refresh_id,
    p_expires_at, coalesce(p_scopes, '{}'), 'connected', p_user_id, now(), now(), null
  )
  on conflict (company_id) do update set
    access_token_secret_id = excluded.access_token_secret_id,
    refresh_token_secret_id = excluded.refresh_token_secret_id,
    token_expires_at = excluded.token_expires_at,
    scopes = excluded.scopes,
    status = 'connected',
    connected_by = excluded.connected_by,
    updated_at = now(),
    last_error = null;
end;
$$;

create or replace function public.read_fortnox_tokens(p_company_id uuid)
returns table (
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  status text
)
language sql
security definer
set search_path = public, vault
as $$
  select access_secret.secret, refresh_secret.secret,
         connection.token_expires_at, connection.scopes, connection.status
  from public.fortnox_connections connection
  join vault.decrypted_secrets access_secret on access_secret.id = connection.access_token_secret_id
  join vault.decrypted_secrets refresh_secret on refresh_secret.id = connection.refresh_token_secret_id
  where connection.company_id = p_company_id;
$$;

revoke all on function public.store_fortnox_tokens(uuid, uuid, text, text, timestamptz, text[]) from public, anon, authenticated;
revoke all on function public.read_fortnox_tokens(uuid) from public, anon, authenticated;
grant execute on function public.store_fortnox_tokens(uuid, uuid, text, text, timestamptz, text[]) to service_role;
grant execute on function public.read_fortnox_tokens(uuid) to service_role;

create policy "Company admins view Fortnox sync status"
on public.fortnox_invoice_syncs for select to authenticated
using (exists (
  select 1 from public.user_roles ur
  where ur.user_id = auth.uid()
    and ur.company_id = fortnox_invoice_syncs.company_id
    and ur.role = 'admin'
));

create policy "Company admins view Fortnox customer mappings"
on public.fortnox_customer_mappings for select to authenticated
using (exists (
  select 1 from public.user_roles ur
  where ur.user_id = auth.uid()
    and ur.company_id = fortnox_customer_mappings.company_id
    and ur.role = 'admin'
));

create index if not exists fortnox_states_expiry_idx on public.fortnox_oauth_states (expires_at);
create index if not exists fortnox_sync_status_idx on public.fortnox_invoice_syncs (company_id, status);

comment on table public.fortnox_connections is 'Fortnox OAuth metadata. Access and refresh tokens are encrypted in Supabase Vault.';
