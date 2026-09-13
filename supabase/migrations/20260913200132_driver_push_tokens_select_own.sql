-- Token upserts need to read the existing row before the UPDATE policy applies.
-- Keep token visibility scoped to the same owner as the existing write policies.
create policy "driver_push_tokens_select_own"
  on public.driver_push_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
