-- Förarkollen pilot: private documents, internal review and opt-in expiry emails.
-- Migration must run before the frontend and notification dispatcher changes.
alter table public.companies
  add column if not exists driver_document_reminders_enabled boolean not null default false;

alter table public.driver_documents
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists review_status text not null default 'pending',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

alter table public.driver_documents
  drop constraint if exists driver_documents_review_status_check;
alter table public.driver_documents
  add constraint driver_documents_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));

alter table public.driver_documents
  drop constraint if exists driver_documents_storage_path_check;
alter table public.driver_documents
  add constraint driver_documents_storage_path_check
  check (storage_path is null or
    (storage_path like (company_id::text || '/' || driver_id::text || '/' || id::text || '/%')
     and storage_path !~ '/\.\./'));

-- Any materially changed document must be reviewed again. Reviews are audit-stamped
-- by the database, rather than trusting client-provided reviewer timestamps.
create or replace function public.driver_document_review_guard()
returns trigger language plpgsql security invoker set search_path = '' as $
begin
  if new.driver_id is distinct from old.driver_id
     or new.doc_type is distinct from old.doc_type
     or new.expires_at is distinct from old.expires_at
     or new.storage_path is distinct from old.storage_path then
    new.review_status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.review_notes := null;
  elsif new.review_status is distinct from old.review_status then
    if new.review_status <> 'pending' and new.storage_path is null then
      raise exception 'Bilaga krävs för intern granskning';
    end if;
    new.reviewed_at := case when new.review_status = 'pending' then null else now() end;
    new.reviewed_by := case when new.review_status = 'pending' then null else auth.uid() end;
  end if;
  return new;
end $;
revoke all on function public.driver_document_review_guard()
  from public, anon, authenticated;
drop trigger if exists driver_document_review_guard on public.driver_documents;
create trigger driver_document_review_guard
before update on public.driver_documents
for each row execute function public.driver_document_review_guard();

-- The driver must belong to the same company as the document, not merely exist.
drop policy if exists "Admins full access on driver_documents" on public.driver_documents;
create policy "Admins full access on driver_documents"
on public.driver_documents for all to authenticated
using (
  company_id = public.get_my_company_id()
  and public.has_role(auth.uid(), 'admin')
)
with check (
  company_id = public.get_my_company_id()
  and public.has_role(auth.uid(), 'admin')
  and exists (
    select 1 from public.profiles p
    where p.id = driver_id and p.company_id = driver_documents.company_id
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-compliance', 'driver-compliance', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- All storage policies validate the document's *database* tenant and driver
-- rather than trusting path segments or user-controlled metadata alone.
drop policy if exists "Forarkollen read attachments" on storage.objects;
create policy "Forarkollen read attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'driver-compliance'
  and exists (
    select 1 from public.driver_documents d
    where (d.storage_path = storage.objects.name
           or (d.storage_path is null and public.has_role(auth.uid(), 'admin')))
      and d.company_id::text = split_part(storage.objects.name, '/', 1)
      and d.driver_id::text = split_part(storage.objects.name, '/', 2)
      and d.id::text = split_part(storage.objects.name, '/', 3)
      and d.company_id = public.get_my_company_id()
      and (
        public.has_role(auth.uid(), 'admin')
        or d.driver_id = auth.uid()
      )
  )
);

drop policy if exists "Forarkollen upload attachments" on storage.objects;
create policy "Forarkollen upload attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'driver-compliance'
  and public.has_role(auth.uid(), 'admin')
  and exists (
    select 1 from public.driver_documents d
    where d.company_id::text = split_part(storage.objects.name, '/', 1)
      and d.driver_id::text = split_part(storage.objects.name, '/', 2)
      and d.id::text = split_part(storage.objects.name, '/', 3)
      and d.company_id = public.get_my_company_id()
      and d.storage_path is null
  )
);

drop policy if exists "Forarkollen delete attachments" on storage.objects;
create policy "Forarkollen delete attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-compliance'
  and public.has_role(auth.uid(), 'admin')
  and exists (
    select 1 from public.driver_documents d
    where d.company_id::text = split_part(storage.objects.name, '/', 1)
      and d.driver_id::text = split_part(storage.objects.name, '/', 2)
      and d.id::text = split_part(storage.objects.name, '/', 3)
      and (d.storage_path = storage.objects.name or d.storage_path is null)
      and d.company_id = public.get_my_company_id()
  )
);

-- Called exclusively by the trusted existing dispatch-notifications worker.
-- No historical messages are replayed. Each milestone is idempotent per date.
create or replace function public.queue_due_driver_document_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare queued integer := 0; today_se date := (now() at time zone 'Europe/Stockholm')::date;
begin
  insert into public.notification_outbox
    (company_id, recipient_email, channel, type, payload, event_key)
  select d.company_id,
    coalesce(
      nullif(btrim(s.email), ''),
      (select p.email from public.user_roles ur
       join public.profiles p on p.id = ur.user_id and p.company_id = ur.company_id
       where ur.company_id = d.company_id and ur.role = 'admin'
         and nullif(btrim(p.email), '') is not null
       order by p.id limit 1)
    ),
    'email', 'driver-document-expiry',
    jsonb_build_object('driverName', p.full_name, 'docType', d.doc_type,
      'docLabel', d.label, 'expiresAt', d.expires_at::text,
      'daysLeft', d.expires_at - today_se, 'documentId', d.id),
    'driver-document/' || d.id::text || '/' || d.expires_at::text ||
      '/' || (d.expires_at - today_se)::text
  from public.driver_documents d
  join public.companies c on c.id = d.company_id
  join public.profiles p on p.id = d.driver_id and p.company_id = d.company_id
  left join public.settings s on s.company_id = d.company_id
  where c.driver_document_reminders_enabled = true
    and coalesce(c.org_nr, '') not in ('556000-0001','556000-0002')
    and d.expires_at - today_se in (90, 30, 7)
    and coalesce(
      nullif(btrim(s.email), ''),
      (select p2.email from public.user_roles ur2
       join public.profiles p2 on p2.id = ur2.user_id and p2.company_id = ur2.company_id
       where ur2.company_id = d.company_id and ur2.role = 'admin'
         and nullif(btrim(p2.email), '') is not null
       order by p2.id limit 1)
    ) is not null
  on conflict (event_key) do nothing;
  get diagnostics queued = row_count;
  return queued;
end $$;

revoke all on function public.queue_due_driver_document_reminders()
  from public, anon, authenticated;
grant execute on function public.queue_due_driver_document_reminders() to service_role;
