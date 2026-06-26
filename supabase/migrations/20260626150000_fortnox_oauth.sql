create extension if not exists pgcrypto;

create table if not exists public.fortnox_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade unique,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
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

create policy "Company admins view Fortnox sync status"
on public.fortnox_invoice_syncs
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = fortnox_invoice_syncs.company_id
      and ur.role = 'admin'
  )
);

create policy "Company admins view Fortnox customer mappings"
on public.fortnox_customer_mappings
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = fortnox_customer_mappings.company_id
      and ur.role = 'admin'
  )
);

create index if not exists fortnox_states_expiry_idx on public.fortnox_oauth_states (expires_at);
create index if not exists fortnox_sync_status_idx on public.fortnox_invoice_syncs (company_id, status);

comment on table public.fortnox_connections is 'AES-GCM encrypted Fortnox OAuth credentials; accessible only through service-role edge functions.';
