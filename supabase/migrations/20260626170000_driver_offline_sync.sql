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

alter table public.driver_sync_operations enable row level security;

create policy "Drivers view their own sync operations"
on public.driver_sync_operations
for select
to authenticated
using (user_id = auth.uid());

create index if not exists driver_sync_assignment_idx
  on public.driver_sync_operations (assignment_id, created_at desc);

comment on table public.driver_sync_operations is
  'Idempotency ledger for status changes and delivery evidence uploaded after offline use.';
