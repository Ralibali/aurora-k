-- Aurora Transport: approved route plans and privacy-aware fleet history.

alter table public.companies
  add column if not exists depot_address text,
  add column if not exists depot_lat double precision,
  add column if not exists depot_lng double precision,
  add column if not exists fleet_tracking_enabled boolean not null default true,
  add column if not exists fleet_location_retention_days integer not null default 90
    check (fleet_location_retention_days between 7 and 365);

alter table public.profiles
  add column if not exists route_capacity integer not null default 100 check (route_capacity > 0),
  add column if not exists route_skills text[] not null default '{}'::text[];

alter table public.vehicles
  add column if not exists route_capacity integer not null default 100 check (route_capacity > 0),
  add column if not exists external_tracking_device_id text;

create unique index if not exists vehicles_company_tracking_device_key
  on public.vehicles(company_id, external_tracking_device_id)
  where external_tracking_device_id is not null;

create table public.route_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_date date not null,
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'superseded', 'failed')),
  optimizer_provider text not null default 'aurora',
  optimizer_version text not null default '1.0',
  distance_before_m integer,
  distance_after_m integer,
  duration_before_s integer,
  duration_after_s integer,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  warning text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_plan_stops (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  route_plan_id uuid not null references public.route_plans(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  sequence integer not null check (sequence > 0),
  planned_arrival_at timestamptz,
  planned_departure_at timestamptz,
  distance_from_previous_m integer,
  duration_from_previous_s integer,
  optimization_reason text,
  created_at timestamptz not null default now(),
  unique (route_plan_id, assignment_id),
  unique (route_plan_id, driver_id, sequence)
);

alter table public.assignments
  add column if not exists route_plan_id uuid references public.route_plans(id) on delete set null,
  add column if not exists route_demand integer not null default 1 check (route_demand > 0),
  add column if not exists route_skills text[] not null default '{}'::text[],
  add column if not exists planned_arrival_at timestamptz,
  add column if not exists planned_departure_at timestamptz,
  add column if not exists eta_at timestamptz,
  add column if not exists geofence_entered_at timestamptz,
  add column if not exists geofence_exited_at timestamptz;

create table public.fleet_location_history (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  heading double precision,
  speed double precision,
  accuracy double precision,
  source text not null default 'phone' check (source in ('phone', 'traccar', 'import')),
  recorded_at timestamptz not null default now()
);

create table public.fleet_geofence_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  event_type text not null check (event_type in ('enter', 'exit')),
  latitude double precision,
  longitude double precision,
  source text not null default 'phone' check (source in ('phone', 'traccar', 'system')),
  occurred_at timestamptz not null default now()
);

create table public.fleet_provider_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null check (provider in ('phone', 'traccar')),
  status text not null default 'not_configured' check (status in ('not_configured', 'active', 'error', 'paused')),
  config jsonb not null default '{}'::jsonb,
  last_event_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider)
);

create index route_plans_company_date_idx on public.route_plans(company_id, plan_date desc);
create index route_plan_stops_plan_driver_idx on public.route_plan_stops(route_plan_id, driver_id, sequence);
create index fleet_history_company_recorded_idx on public.fleet_location_history(company_id, recorded_at desc);
create index fleet_history_assignment_recorded_idx on public.fleet_location_history(assignment_id, recorded_at desc);
create index fleet_geofence_assignment_idx on public.fleet_geofence_events(assignment_id, occurred_at desc);

alter table public.route_plans enable row level security;
alter table public.route_plan_stops enable row level security;
alter table public.fleet_location_history enable row level security;
alter table public.fleet_geofence_events enable row level security;
alter table public.fleet_provider_connections enable row level security;

revoke all on table public.route_plans, public.route_plan_stops, public.fleet_location_history, public.fleet_geofence_events, public.fleet_provider_connections from anon, authenticated;
grant select, insert, update, delete on table public.route_plans, public.route_plan_stops, public.fleet_provider_connections to authenticated;
grant select, insert on table public.fleet_location_history, public.fleet_geofence_events to authenticated;
grant all on table public.route_plans, public.route_plan_stops, public.fleet_location_history, public.fleet_geofence_events, public.fleet_provider_connections to service_role;
grant usage, select on sequence public.fleet_location_history_id_seq, public.fleet_geofence_events_id_seq to authenticated, service_role;

create policy "Company admins manage route plans" on public.route_plans for all to authenticated
  using (company_id = public.get_my_company_id() and public.has_role((select auth.uid()), 'admin'))
  with check (company_id = public.get_my_company_id() and public.has_role((select auth.uid()), 'admin'));
create policy "Company admins manage route stops" on public.route_plan_stops for all to authenticated
  using (company_id = public.get_my_company_id() and public.has_role((select auth.uid()), 'admin'))
  with check (company_id = public.get_my_company_id() and public.has_role((select auth.uid()), 'admin'));
create policy "Company admins read fleet history" on public.fleet_location_history for select to authenticated
  using (company_id = public.get_my_company_id() and public.has_role((select auth.uid()), 'admin'));
create policy "Drivers add own fleet history" on public.fleet_location_history for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and driver_id = (select auth.uid())
    and (
      assignment_id is null
      or exists (
        select 1 from public.assignments a
        where a.id = assignment_id
          and a.company_id = fleet_location_history.company_id
          and a.assigned_driver_id = (select auth.uid())
      )
    )
    and (
      vehicle_id is null
      or exists (
        select 1 from public.vehicles v
        where v.id = vehicle_id
          and v.company_id = fleet_location_history.company_id
      )
    )
  );
create policy "Company admins read geofence events" on public.fleet_geofence_events for select to authenticated
  using (company_id = public.get_my_company_id() and public.has_role((select auth.uid()), 'admin'));
create policy "Drivers add own geofence events" on public.fleet_geofence_events for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and driver_id = (select auth.uid())
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and a.company_id = fleet_geofence_events.company_id
        and a.assigned_driver_id = (select auth.uid())
    )
  );
create policy "Company admins manage fleet providers" on public.fleet_provider_connections for all to authenticated
  using (company_id = public.get_my_company_id() and public.has_role((select auth.uid()), 'admin'))
  with check (company_id = public.get_my_company_id() and public.has_role((select auth.uid()), 'admin'));

create trigger route_plans_updated_at before update on public.route_plans
  for each row execute function public.update_updated_at_column();
create trigger fleet_provider_connections_updated_at before update on public.fleet_provider_connections
  for each row execute function public.update_updated_at_column();

create or replace function public.prune_fleet_location_history()
returns integer language plpgsql security definer set search_path = '' as $$
declare deleted_count integer;
begin
  delete from public.fleet_location_history h
  using public.companies c
  where h.company_id = c.id
    and h.recorded_at < now() - make_interval(days => c.fleet_location_retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end $$;
revoke all on function public.prune_fleet_location_history() from public, anon, authenticated;
grant execute on function public.prune_fleet_location_history() to service_role;

create or replace function public.approve_route_plan(_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  plan_record public.route_plans%rowtype;
  stop_count integer;
begin
  select * into plan_record from public.route_plans where id = _plan_id for update;
  if not found then raise exception 'Route plan not found'; end if;
  if plan_record.company_id <> public.get_my_company_id()
    or not public.has_role((select auth.uid()), 'admin') then
    raise exception 'Not authorized';
  end if;
  if plan_record.status <> 'proposed' then raise exception 'Route plan is not proposed'; end if;

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

comment on table public.fleet_location_history is 'Location history retained per company setting. Tracking is limited to active assignments.';
comment on table public.fleet_provider_connections is 'Provider metadata only. Tokens and webhook secrets stay in server-side secrets.';

notify pgrst, 'reload schema';
