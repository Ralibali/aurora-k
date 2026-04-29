-- SaaS layer: notification outbox + public booking attachment bucket.
-- You can later connect Resend/push workers to notification_outbox without changing the app UI.

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

alter table public.notification_outbox enable row level security;

create index if not exists notification_outbox_status_idx on public.notification_outbox(status, created_at);
create index if not exists notification_outbox_company_idx on public.notification_outbox(company_id, created_at desc);

-- Public booking form can enqueue a limited notification for admins/workers.
drop policy if exists "Public can enqueue booking notifications" on public.notification_outbox;
create policy "Public can enqueue booking notifications"
on public.notification_outbox
for insert
to anon, authenticated
with check (
  channel in ('email', 'push')
  and type in ('booking_request_created', 'booking_request_customer_confirmation')
  and status = 'pending'
  and jsonb_typeof(payload) = 'object'
);

-- Authenticated users can read notification rows for their company.
drop policy if exists "Company users can read notification outbox" on public.notification_outbox;
create policy "Company users can read notification outbox"
on public.notification_outbox
for select
to authenticated
using (
  company_id is null
  or company_id in (select company_id from public.profiles where id = auth.uid())
);

-- Storage bucket for customer-submitted booking attachments.
insert into storage.buckets (id, name, public)
values ('booking-attachments', 'booking-attachments', false)
on conflict (id) do nothing;

-- Allow public uploads into booking-attachments. Files are private by default.
drop policy if exists "Public can upload booking attachments" on storage.objects;
create policy "Public can upload booking attachments"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'booking-attachments'
  and lower((storage.foldername(name))[1]) = 'public'
);

-- Authenticated company users may read booking attachments for review.
drop policy if exists "Authenticated can read booking attachments" on storage.objects;
create policy "Authenticated can read booking attachments"
on storage.objects
for select
to authenticated
using (bucket_id = 'booking-attachments');
