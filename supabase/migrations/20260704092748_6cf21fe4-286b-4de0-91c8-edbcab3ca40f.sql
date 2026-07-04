create table if not exists public.driver_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null,
  updated_at timestamptz not null default now()
);

create index if not exists driver_push_tokens_user_id_idx on public.driver_push_tokens(user_id);
create index if not exists driver_push_tokens_updated_at_idx on public.driver_push_tokens(updated_at desc);

grant select, insert, update, delete on public.driver_push_tokens to authenticated;
grant all on public.driver_push_tokens to service_role;

alter table public.driver_push_tokens enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='driver_push_tokens' and policyname='driver_push_tokens_insert_own') then
    create policy "driver_push_tokens_insert_own" on public.driver_push_tokens
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='driver_push_tokens' and policyname='driver_push_tokens_update_own') then
    create policy "driver_push_tokens_update_own" on public.driver_push_tokens
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='driver_push_tokens' and policyname='driver_push_tokens_delete_own') then
    create policy "driver_push_tokens_delete_own" on public.driver_push_tokens
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;