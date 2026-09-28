create or replace function public.approve_route_plan(_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  plan_record public.route_plans%rowtype;
  stop_count integer;
begin
  select * into plan_record from public.route_plans where id = _plan_id;
  if not found then raise exception 'Route plan not found'; end if;
  if plan_record.company_id <> public.get_my_company_id()
    or not public.has_role((select auth.uid()), 'admin') then
    raise exception 'Not authorized';
  end if;
  perform 1 from public.companies where id = plan_record.company_id for update;
  select * into plan_record from public.route_plans where id = _plan_id for update;
  if plan_record.status <> 'proposed' then raise exception 'Route plan is not proposed'; end if;

  -- Reject stale proposals instead of overwriting dispatch changes.
  if jsonb_typeof(plan_record.input_snapshot->'assignments') is distinct from 'array'
    or jsonb_typeof(plan_record.input_snapshot->'drivers') is distinct from 'array' then
    raise exception 'Skapa ett nytt ruttförslag innan du godkänner.';
  end if;
  perform 1 from public.assignments a where a.id in
    (select (x->>'id')::uuid from jsonb_array_elements(plan_record.input_snapshot->'assignments') x) for update;
  perform 1 from public.profiles p where p.id in
    (select (x->>'id')::uuid from jsonb_array_elements(plan_record.input_snapshot->'drivers') x) for update;
  perform 1 from public.assignments a where a.company_id = plan_record.company_id and a.assigned_driver_id in
    (select (x->>'id')::uuid from jsonb_array_elements(plan_record.input_snapshot->'drivers') x) for update;
  if exists (select 1 from public.assignments a where a.company_id = plan_record.company_id
    and a.status in ('active','delayed') and a.assigned_driver_id in
      (select (x->>'id')::uuid from jsonb_array_elements(plan_record.input_snapshot->'drivers') x)) then
    raise exception 'En chaufför har påbörjat ett annat uppdrag. Optimera dagen igen.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(plan_record.input_snapshot->'assignments') x
    left join public.assignments a on a.id = (x->>'id')::uuid
    where a.id is null or a.company_id <> plan_record.company_id
      or a.status not in ('pending','unassigned')
      or a.updated_at is distinct from (x->>'updated_at')::timestamptz
  ) or exists (
    select 1 from jsonb_array_elements(plan_record.input_snapshot->'drivers') x
    left join public.profiles p on p.id = (x->>'id')::uuid
    where p.id is null or p.company_id <> plan_record.company_id or p.is_available is distinct from true
      or p.role::text <> 'driver'
      or p.route_capacity is distinct from (x->>'route_capacity')::integer
      or to_jsonb(p.route_skills) is distinct from x->'route_skills'
  ) then raise exception 'Uppdrag eller chaufförer har ändrats. Optimera dagen igen.'; end if;
  if not exists (select 1 from public.route_plan_stops where route_plan_id = _plan_id) then
    raise exception 'Ruttförslaget saknar stopp.';
  end if;
  if exists (
    select 1 from public.route_plan_stops s
    left join public.assignments a on a.id = s.assignment_id
    left join public.profiles p on p.id = s.driver_id
    where s.route_plan_id = _plan_id and (
      s.company_id <> plan_record.company_id or a.company_id is distinct from plan_record.company_id
      or p.company_id is distinct from plan_record.company_id
      or not exists (select 1 from jsonb_array_elements(plan_record.input_snapshot->'assignments') x where x->>'id' = s.assignment_id::text)
      or not exists (select 1 from jsonb_array_elements(plan_record.input_snapshot->'drivers') x where x->>'id' = s.driver_id::text)
    )
  ) then raise exception 'Ruttförslaget innehåller ogiltiga stopp.'; end if;

  update public.route_plans
  set status = 'superseded'
  where company_id = plan_record.company_id
    and plan_date = plan_record.plan_date
    and status = 'approved'
    and id <> _plan_id;

  update public.assignments a
  set assigned_driver_id = s.driver_id,
      vehicle_id = coalesce(s.vehicle_id, a.vehicle_id),
      route_sequence = s.sequence,
      route_plan_id = s.route_plan_id,
      planned_arrival_at = s.planned_arrival_at,
      planned_departure_at = s.planned_departure_at,
      eta_at = s.planned_arrival_at,
      updated_at = now()
  from public.route_plan_stops s
  where s.route_plan_id = _plan_id
    and s.assignment_id = a.id
    and a.company_id = plan_record.company_id;
  get diagnostics stop_count = row_count;

  update public.route_plans
  set status = 'approved', approved_by = (select auth.uid()), approved_at = now()
  where id = _plan_id;

  return jsonb_build_object('id', _plan_id, 'approvedStops', stop_count);
end $$;
revoke all on function public.approve_route_plan(uuid) from public, anon;
grant execute on function public.approve_route_plan(uuid) to authenticated, service_role;
