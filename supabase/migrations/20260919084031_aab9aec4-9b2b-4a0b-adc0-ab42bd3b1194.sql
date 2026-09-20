create table if not exists public.inbound_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  filename text not null,
  content_type text not null default '',
  size_bytes integer not null default 0,
  storage_path text,
  document_type text not null default 'unknown' check (document_type in ('transport_order','pod','cmr','unknown')),
  status text not null default 'new' check (status in ('new','reviewed','linked','error')),
  parsed_payload jsonb not null default '{}'::jsonb,
  confidence integer not null default 0 check (confidence between 0 and 100),
  field_confidence jsonb not null default '{}'::jsonb,
  signature_detected boolean not null default false,
  assignment_id uuid references public.assignments(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.inbound_documents to authenticated;
grant all on public.inbound_documents to service_role;

alter table public.inbound_documents enable row level security;

create index if not exists inbound_documents_company_created_idx
  on public.inbound_documents (company_id, created_at desc);
create index if not exists inbound_documents_company_status_idx
  on public.inbound_documents (company_id, status);

create policy "Company admins manage inbound documents"
on public.inbound_documents
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = inbound_documents.company_id
      and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = inbound_documents.company_id
      and ur.role = 'admin'
  )
);

create trigger update_inbound_documents_updated_at
before update on public.inbound_documents
for each row execute function public.update_updated_at_column();

create policy "Company admins upload order inbox files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'order-inbox'
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
      and ur.company_id::text = (storage.foldername(name))[1]
  )
);

comment on table public.inbound_documents is
  'Uploaded transport documents (orders, POD, CMR) per company with parsed payload and optional assignment link.';