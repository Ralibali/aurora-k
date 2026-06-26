create extension if not exists pgcrypto;

create table if not exists public.order_inbox_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inbox_key uuid not null default gen_random_uuid() unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);

create table if not exists public.inbound_order_emails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel_id uuid references public.order_inbox_channels(id) on delete set null,
  provider text not null default 'resend',
  provider_email_id text not null unique,
  message_id text,
  from_address text not null,
  to_addresses text[] not null default '{}',
  subject text not null default '',
  text_body text,
  html_body text,
  attachments jsonb not null default '[]'::jsonb,
  parsed_payload jsonb,
  parse_confidence integer not null default 0 check (parse_confidence between 0 and 100),
  status text not null default 'received' check (status in ('received','processing','ready','needs_review','converted','failed','ignored')),
  error_message text,
  received_at timestamptz not null default now(),
  reviewed_at timestamptz,
  converted_assignment_id uuid references public.assignments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inbound_order_emails_company_received_idx
  on public.inbound_order_emails (company_id, received_at desc);
create index if not exists inbound_order_emails_company_status_idx
  on public.inbound_order_emails (company_id, status);

alter table public.order_inbox_channels enable row level security;
alter table public.inbound_order_emails enable row level security;

create policy "Company admins manage order inbox channels"
on public.order_inbox_channels
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = order_inbox_channels.company_id
      and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = order_inbox_channels.company_id
      and ur.role = 'admin'
  )
);

create policy "Company admins read inbound order emails"
on public.inbound_order_emails
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = inbound_order_emails.company_id
      and ur.role = 'admin'
  )
);

create policy "Company admins update inbound order emails"
on public.inbound_order_emails
for update
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = inbound_order_emails.company_id
      and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = inbound_order_emails.company_id
      and ur.role = 'admin'
  )
);

insert into storage.buckets (id, name, public)
values ('order-inbox', 'order-inbox', false)
on conflict (id) do update set public = false;

create policy "Company admins read order inbox files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'order-inbox'
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
      and ur.company_id::text = (storage.foldername(name))[1]
  )
);

comment on table public.inbound_order_emails is
  'Verified inbound emails and privately stored attachments awaiting conversion into transport assignments.';
