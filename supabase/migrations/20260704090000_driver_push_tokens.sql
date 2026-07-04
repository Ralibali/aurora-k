create table if not exists public.driver_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null,
  updated_at timestamptz not null default now()
);

create index if not exists driver_push_tokens_user_id_idx on public.driver_push_tokens(user_id);
create index if not exists driver_push_tokens_updated_at_idx on public.driver_push_tokens(updated_at desc);

alter table public.driver_push_tokens enable row level security;

create policy "driver_push_tokens_insert_own"
  on public.driver_push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "driver_push_tokens_update_own"
  on public.driver_push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "driver_push_tokens_delete_own"
  on public.driver_push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);
