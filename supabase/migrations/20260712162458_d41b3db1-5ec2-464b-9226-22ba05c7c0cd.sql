alter table public.invoices add column if not exists lines jsonb not null default '[]'::jsonb;
alter table public.assignments add column if not exists route_sequence integer;
alter table public.companies add column if not exists public_booking_slug text;

update public.companies c set public_booking_slug = 'aurora-transport'
from public.settings s where s.company_id = c.id and c.public_booking_slug is null
  and lower(s.company_name) like '%aurora%transport%';
update public.companies set public_booking_slug = trim(both '-' from lower(
  regexp_replace(translate(name, 'ÅÄÖåäö', 'AAOaao'), '[^a-zA-Z0-9]+', '-', 'g')))
where public_booking_slug is null;

create index if not exists companies_public_booking_slug_idx
  on public.companies (public_booking_slug) where public_booking_slug is not null;

create or replace function public.create_invoice_with_lines(
  p_invoice_number integer, p_customer_id uuid, p_assignment_ids uuid[], p_status text,
  p_invoice_date date, p_due_date date, p_total_ex_vat numeric, p_vat_amount numeric,
  p_total_inc_vat numeric, p_reference text default null, p_message text default null,
  p_lines jsonb default '[]'::jsonb
) returns public.invoices language plpgsql security invoker set search_path = public as $$
declare v_company_id uuid; v_invoice public.invoices;
begin
  select company_id into v_company_id from public.profiles where id = auth.uid();
  if v_company_id is null then raise exception 'Ingen företagskoppling finns för användaren'; end if;
  if not exists (select 1 from public.customers where id = p_customer_id and company_id = v_company_id) then
    raise exception 'Kunden tillhör inte företaget'; end if;
  if coalesce(array_length(p_assignment_ids, 1), 0) > 0 and exists (
    select 1 from public.assignments where id = any(p_assignment_ids) and company_id is distinct from v_company_id
  ) then raise exception 'Ett eller flera uppdrag tillhör inte företaget'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Fakturan måste innehålla minst en fakturarad'; end if;
  insert into public.invoices (invoice_number, customer_id, assignment_ids, status, invoice_date, due_date, total_ex_vat, vat_amount, total_inc_vat, reference, message, company_id, lines)
  values (p_invoice_number, p_customer_id, coalesce(p_assignment_ids, '{}'::uuid[]), coalesce(nullif(p_status, ''), 'draft'), p_invoice_date, p_due_date, p_total_ex_vat, p_vat_amount, p_total_inc_vat, p_reference, p_message, v_company_id, p_lines)
  returning * into v_invoice;
  if coalesce(array_length(p_assignment_ids, 1), 0) > 0 then
    update public.assignments set invoiced = true where id = any(p_assignment_ids) and company_id = v_company_id; end if;
  return v_invoice;
end; $$;
grant execute on function public.create_invoice_with_lines(integer, uuid, uuid[], text, date, date, numeric, numeric, numeric, text, text, jsonb) to authenticated;

create or replace function public.assign_public_booking_company()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_brand text; v_company_id uuid;
begin
  if new.company_id is not null then return new; end if;
  v_brand := nullif(trim(split_part(split_part(coalesce(new.description, ''), E'\n', 1), ':', 2)), '');
  if v_brand is not null then
    select c.id into v_company_id from public.companies c
    left join public.settings s on s.company_id = c.id
    where lower(c.name) = lower(v_brand) or lower(s.company_name) = lower(v_brand) or lower(s.company_name) like '%' || lower(v_brand) || '%'
    order by case when lower(c.name) = lower(v_brand) then 0 when lower(s.company_name) = lower(v_brand) then 1 else 2 end limit 1;
  end if;
  if v_company_id is null and lower(coalesce(new.description, '')) like '%publik bokningssida: aurora transport%' then
    select c.id into v_company_id from public.companies c
    left join public.settings s on s.company_id = c.id
    where c.public_booking_slug = 'aurora-transport' or lower(c.name) like '%aurora%transport%' or lower(s.company_name) like '%aurora%transport%' limit 1;
  end if;
  if v_company_id is null then raise exception 'Bokningssidan är inte kopplad till något företag'; end if;
  new.company_id := v_company_id;
  return new;
end; $$;
drop trigger if exists booking_requests_assign_company on public.booking_requests;
create trigger booking_requests_assign_company before insert on public.booking_requests
for each row execute function public.assign_public_booking_company();

alter table public.booking_requests enable row level security;
drop policy if exists "Public can create booking requests" on public.booking_requests;
create policy "Public can create booking requests" on public.booking_requests
for insert to anon, authenticated
with check (
  status = 'pending' and customer_name is not null and length(trim(customer_name)) between 2 and 160
  and title is not null and length(trim(title)) between 2 and 220
  and (customer_email is null or length(trim(customer_email)) <= 254)
  and (customer_phone is null or length(trim(customer_phone)) <= 60)
  and (preferred_date is null or preferred_date >= (current_date - interval '1 day'))
  and (description is null or length(description) <= 6000)
);

create extension if not exists pgcrypto;
alter table public.assignments
  add column if not exists tracking_token uuid not null default gen_random_uuid(),
  add column if not exists tracking_enabled boolean not null default true;
create unique index if not exists assignments_tracking_token_key on public.assignments (tracking_token);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null,
  recipient_email text null,
  recipient_phone text null,
  recipient_user_id uuid null,
  channel text not null check (channel in ('email', 'push', 'sms')),
  type text not null,
  subject text null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  sent_at timestamptz null
);
grant select, insert on public.notification_outbox to anon, authenticated;
grant update on public.notification_outbox to authenticated;
grant all on public.notification_outbox to service_role;
alter table public.notification_outbox enable row level security;
create index if not exists notification_outbox_status_idx on public.notification_outbox(status, created_at);
create index if not exists notification_outbox_company_idx on public.notification_outbox(company_id, created_at desc);
drop policy if exists "Public can enqueue booking notifications" on public.notification_outbox;
create policy "Public can enqueue booking notifications" on public.notification_outbox
for insert to anon, authenticated
with check (channel in ('email','push') and type in ('booking_request_created','booking_request_customer_confirmation') and status='pending' and jsonb_typeof(payload)='object');
drop policy if exists "Company users can read notification outbox" on public.notification_outbox;
create policy "Company users can read notification outbox" on public.notification_outbox
for select to authenticated
using (company_id is null or company_id in (select company_id from public.profiles where id = auth.uid()));

drop policy if exists "Public can upload booking attachments" on storage.objects;
create policy "Public can upload booking attachments" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'booking-attachments' and lower((storage.foldername(name))[1]) = 'public');
drop policy if exists "Authenticated can read booking attachments" on storage.objects;
create policy "Authenticated can read booking attachments" on storage.objects
for select to authenticated using (bucket_id = 'booking-attachments');

create table if not exists public.order_inbox_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  inbox_key uuid not null default gen_random_uuid() unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);
grant select, insert, update, delete on public.order_inbox_channels to authenticated;
grant all on public.order_inbox_channels to service_role;
alter table public.order_inbox_channels enable row level security;
drop policy if exists "Company admins manage order inbox channels" on public.order_inbox_channels;
create policy "Company admins manage order inbox channels" on public.order_inbox_channels
for all to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.company_id = order_inbox_channels.company_id and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.company_id = order_inbox_channels.company_id and ur.role = 'admin'));

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
grant select, insert, update, delete on public.inbound_order_emails to authenticated;
grant all on public.inbound_order_emails to service_role;
create index if not exists inbound_order_emails_company_received_idx on public.inbound_order_emails (company_id, received_at desc);
create index if not exists inbound_order_emails_company_status_idx on public.inbound_order_emails (company_id, status);
alter table public.inbound_order_emails enable row level security;
drop policy if exists "Company admins read inbound order emails" on public.inbound_order_emails;
create policy "Company admins read inbound order emails" on public.inbound_order_emails
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.company_id = inbound_order_emails.company_id and ur.role = 'admin'));
drop policy if exists "Company admins update inbound order emails" on public.inbound_order_emails;
create policy "Company admins update inbound order emails" on public.inbound_order_emails
for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.company_id = inbound_order_emails.company_id and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.company_id = inbound_order_emails.company_id and ur.role = 'admin'));

drop policy if exists "Company admins read order inbox files" on storage.objects;
create policy "Company admins read order inbox files" on storage.objects
for select to authenticated
using (bucket_id = 'order-inbox' and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin' and ur.company_id::text = (storage.foldername(name))[1]));

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
grant select on public.fortnox_connections to authenticated;
grant all on public.fortnox_connections to service_role;
alter table public.fortnox_connections enable row level security;

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
grant all on public.fortnox_oauth_states to service_role;
alter table public.fortnox_oauth_states enable row level security;

create table if not exists public.fortnox_customer_mappings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  fortnox_customer_number text not null,
  updated_at timestamptz not null default now(),
  unique (company_id, customer_id),
  unique (company_id, fortnox_customer_number)
);
grant select on public.fortnox_customer_mappings to authenticated;
grant all on public.fortnox_customer_mappings to service_role;
alter table public.fortnox_customer_mappings enable row level security;
drop policy if exists "Company admins view Fortnox customer mappings" on public.fortnox_customer_mappings;
create policy "Company admins view Fortnox customer mappings" on public.fortnox_customer_mappings for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.company_id = fortnox_customer_mappings.company_id and ur.role = 'admin'));

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
grant select on public.fortnox_invoice_syncs to authenticated;
grant all on public.fortnox_invoice_syncs to service_role;
alter table public.fortnox_invoice_syncs enable row level security;
drop policy if exists "Company admins view Fortnox sync status" on public.fortnox_invoice_syncs;
create policy "Company admins view Fortnox sync status" on public.fortnox_invoice_syncs for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.company_id = fortnox_invoice_syncs.company_id and ur.role = 'admin'));

create or replace function public.store_fortnox_tokens(
  p_company_id uuid, p_user_id uuid, p_access_token text, p_refresh_token text, p_expires_at timestamptz, p_scopes text[]
) returns void language plpgsql security definer set search_path = public, vault as $$
declare v_access_id uuid; v_refresh_id uuid;
begin
  select access_token_secret_id, refresh_token_secret_id into v_access_id, v_refresh_id
  from public.fortnox_connections where company_id = p_company_id;
  if v_access_id is null then
    select vault.create_secret(p_access_token, 'fortnox-access-' || p_company_id::text) into v_access_id;
    select vault.create_secret(p_refresh_token, 'fortnox-refresh-' || p_company_id::text) into v_refresh_id;
  else
    perform vault.update_secret(v_access_id, p_access_token);
    perform vault.update_secret(v_refresh_id, p_refresh_token);
  end if;
  insert into public.fortnox_connections (company_id, access_token_secret_id, refresh_token_secret_id, token_expires_at, scopes, status, connected_by, connected_at, updated_at, last_error)
  values (p_company_id, v_access_id, v_refresh_id, p_expires_at, coalesce(p_scopes, '{}'), 'connected', p_user_id, now(), now(), null)
  on conflict (company_id) do update set
    access_token_secret_id = excluded.access_token_secret_id,
    refresh_token_secret_id = excluded.refresh_token_secret_id,
    token_expires_at = excluded.token_expires_at,
    scopes = excluded.scopes, status='connected', connected_by = excluded.connected_by, updated_at = now(), last_error = null;
end; $$;

create or replace function public.read_fortnox_tokens(p_company_id uuid)
returns table (access_token text, refresh_token text, token_expires_at timestamptz, scopes text[], status text)
language sql security definer set search_path = public, vault as $$
  select access_secret.secret, refresh_secret.secret, connection.token_expires_at, connection.scopes, connection.status
  from public.fortnox_connections connection
  join vault.decrypted_secrets access_secret on access_secret.id = connection.access_token_secret_id
  join vault.decrypted_secrets refresh_secret on refresh_secret.id = connection.refresh_token_secret_id
  where connection.company_id = p_company_id;
$$;

revoke all on function public.store_fortnox_tokens(uuid, uuid, text, text, timestamptz, text[]) from public, anon, authenticated;
revoke all on function public.read_fortnox_tokens(uuid) from public, anon, authenticated;
grant execute on function public.store_fortnox_tokens(uuid, uuid, text, text, timestamptz, text[]) to service_role;
grant execute on function public.read_fortnox_tokens(uuid) to service_role;

create index if not exists fortnox_states_expiry_idx on public.fortnox_oauth_states (expires_at);
create index if not exists fortnox_sync_status_idx on public.fortnox_invoice_syncs (company_id, status);

create table if not exists public.driver_sync_operations (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  company_id uuid references public.companies(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_type text not null check (operation_type in ('delivery_proof','assignment_status')),
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select on public.driver_sync_operations to authenticated;
grant all on public.driver_sync_operations to service_role;
alter table public.driver_sync_operations enable row level security;
drop policy if exists "Drivers view their own sync operations" on public.driver_sync_operations;
create policy "Drivers view their own sync operations" on public.driver_sync_operations for select to authenticated using (user_id = auth.uid());
create index if not exists driver_sync_assignment_idx on public.driver_sync_operations (assignment_id, created_at desc);