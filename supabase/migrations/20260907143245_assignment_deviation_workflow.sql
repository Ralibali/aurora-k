-- Separate reports from free-text driver comments. Only the RPCs can mutate reports.
create table public.assignment_deviations (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 company_id uuid not null references public.companies(id),
 reported_by uuid not null references auth.users(id),
 message text not null check (length(btrim(message)) between 1 and 3000),
 status text not null default 'open' check (status in ('open','resolved')),
 created_at timestamptz not null default now(),
 resolution text,
 resolved_by uuid references auth.users(id),
 resolved_at timestamptz,
 constraint deviation_resolution_complete check (
  (status='open' and resolution is null and resolved_by is null and resolved_at is null) or
  (status='resolved' and length(btrim(resolution)) between 1 and 3000 and resolved_by is not null and resolved_at is not null)
 )
);
create index assignment_deviations_assignment_idx on public.assignment_deviations(assignment_id,created_at desc);
create index assignment_deviations_open_company_idx on public.assignment_deviations(company_id,assignment_id) where status='open';
create index assignment_deviations_reporter_idx on public.assignment_deviations(reported_by);
create index assignment_deviations_resolver_idx on public.assignment_deviations(resolved_by) where resolved_by is not null;
alter table public.assignment_deviations enable row level security;
revoke all on public.assignment_deviations from anon,authenticated;
grant select on public.assignment_deviations to authenticated;
create policy "Read own company assignment deviations" on public.assignment_deviations for select to authenticated using (
 company_id=(select public.get_my_company_id()) and (
  (select public.has_role(auth.uid(),'admin'::public.app_role)) or
  exists(select 1 from public.assignments a where a.id=assignment_id and a.company_id=assignment_deviations.company_id and a.assigned_driver_id=(select auth.uid()))
 )
);

create or replace function public.report_assignment_deviation(p_assignment_id uuid,p_message text,p_operation_id uuid)
returns public.assignment_deviations language plpgsql security definer set search_path='' as $$
declare v_assignment public.assignments; v_report public.assignment_deviations; v_uid uuid:=auth.uid();
begin
 if v_uid is null or p_operation_id is null then raise exception 'Logga in för att rapportera avvikelsen'; end if;
 if p_message is null or length(btrim(p_message)) not between 1 and 3000 then raise exception 'Beskriv avvikelsen med 1–3000 tecken'; end if;
 select * into v_assignment from public.assignments where id=p_assignment_id for update;
 if not found or v_assignment.company_id is distinct from public.get_my_company_id() or
  (v_assignment.assigned_driver_id is distinct from v_uid and not public.has_role(v_uid,'admin'::public.app_role)) then
  raise exception 'Du har inte tillgång till uppdraget'; end if;
 select * into v_report from public.assignment_deviations where id=p_operation_id;
 if found then
  if v_report.assignment_id=p_assignment_id and v_report.reported_by=v_uid and v_report.message=btrim(p_message) then return v_report; end if;
  raise exception 'Sparningsnyckeln används redan. Öppna formuläret igen';
 end if;
 insert into public.assignment_deviations(id,assignment_id,company_id,reported_by,message)
 values(p_operation_id,p_assignment_id,v_assignment.company_id,v_uid,btrim(p_message)) returning * into v_report;
 insert into public.assignment_logs(assignment_id,company_id,user_id,action,new_value)
 values(p_assignment_id,v_assignment.company_id,v_uid,'deviation_reported',btrim(p_message));
 return v_report;
end $$;
revoke all on function public.report_assignment_deviation(uuid,text,uuid) from public,anon;
grant execute on function public.report_assignment_deviation(uuid,text,uuid) to authenticated;

create or replace function public.resolve_assignment_deviation(p_deviation_id uuid,p_resolution text)
returns public.assignment_deviations language plpgsql security definer set search_path='' as $$
declare v_report public.assignment_deviations; v_assignment_id uuid; v_uid uuid:=auth.uid();
begin
 if v_uid is null or not public.has_role(v_uid,'admin'::public.app_role) then raise exception 'Endast administratörer kan avsluta en avvikelse'; end if;
 if p_resolution is null or length(btrim(p_resolution)) not between 1 and 3000 then raise exception 'Beskriv åtgärden med 1–3000 tecken'; end if;
 select assignment_id into v_assignment_id from public.assignment_deviations where id=p_deviation_id and company_id=public.get_my_company_id();
 if not found then raise exception 'Avvikelsen hittades inte'; end if;
 -- Same lock order as reporting and invoicing prevents lost changes and deadlocks.
 perform 1 from public.assignments where id=v_assignment_id for update;
 select * into v_report from public.assignment_deviations where id=p_deviation_id and company_id=public.get_my_company_id() for update;
 if not found or v_report.status<>'open' then raise exception 'Avvikelsen är redan avslutad. Uppdatera vyn'; end if;
 update public.assignment_deviations set status='resolved',resolution=btrim(p_resolution),resolved_by=v_uid,resolved_at=now() where id=p_deviation_id returning * into v_report;
 insert into public.assignment_logs(assignment_id,company_id,user_id,action,new_value)
 values(v_report.assignment_id,v_report.company_id,v_uid,'deviation_resolved',btrim(p_resolution));
 return v_report;
end $$;
revoke all on function public.resolve_assignment_deviation(uuid,text) from public,anon;
grant execute on function public.resolve_assignment_deviation(uuid,text) to authenticated;

create index if not exists invoices_assignment_ids_gin_idx on public.invoices using gin(assignment_ids);

-- Validate at invoice creation, inside the existing invoice transaction. A failure
-- rolls back both the invoice and assignment flags in create_invoice_with_lines.
create or replace function public.check_invoice_assignment_readiness()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_assignment public.assignments; v_count integer:=0; v_expected integer;
begin
 v_expected:=coalesce(cardinality(new.assignment_ids),0);
 if v_expected=0 then return new; end if;
 if v_expected>500 or v_expected<>(select count(distinct id) from unnest(new.assignment_ids) id) then raise exception 'Kontrollera uppdragen: dubbletter eller för många uppdrag'; end if;
 for v_assignment in select * from public.assignments where id=any(new.assignment_ids) order by id for update loop
  v_count:=v_count+1;
  if v_assignment.company_id is distinct from new.company_id or v_assignment.customer_id is distinct from new.customer_id then raise exception 'Uppdraget tillhör inte fakturans företag och kund'; end if;
  if v_assignment.status is distinct from 'completed' then raise exception 'Uppdraget måste vara slutfört före fakturering'; end if;
  if v_assignment.invoiced and (tg_op='INSERT' or not v_assignment.id=any(old.assignment_ids)) then raise exception 'Uppdraget är redan fakturerat'; end if;
  if exists(select 1 from public.invoices i where i.id<>new.id and i.assignment_ids @> array[v_assignment.id]) then raise exception 'Uppdraget ingår redan i en annan faktura'; end if;
  if exists(select 1 from public.assignment_deviations d where d.assignment_id=v_assignment.id and d.status='open') then raise exception 'Åtgärda öppna avvikelser innan du skapar fakturan'; end if;
  if (v_assignment.require_photo and nullif(btrim(v_assignment.consignment_photo_url),'') is null) or
     (v_assignment.require_signature and nullif(btrim(v_assignment.signature_url),'') is null) then raise exception 'Uppdraget saknar obligatoriskt leveransbevis'; end if;
 end loop;
 if v_count<>v_expected then raise exception 'Ett eller flera uppdrag hittades inte'; end if;
 return new;
end $$;
revoke all on function public.check_invoice_assignment_readiness() from public,anon,authenticated;
create trigger check_invoice_assignment_readiness before insert or update of assignment_ids,customer_id,company_id on public.invoices
for each row execute function public.check_invoice_assignment_readiness();
notify pgrst,'reload schema';
