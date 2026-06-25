-- Product core reliability: invoices, public bookings and route planning.

alter table public.invoices
  add column if not exists lines jsonb not null default '[]'::jsonb;

alter table public.assignments
  add column if not exists route_sequence integer;

alter table public.companies
  add column if not exists public_booking_slug text;

update public.companies c
set public_booking_slug = 'aurora-transport'
from public.settings s
where s.company_id = c.id
  and c.public_booking_slug is null
  and lower(s.company_name) like '%aurora%transport%';

update public.companies
set public_booking_slug = trim(both '-' from lower(
  regexp_replace(
    translate(name, 'ÅÄÖåäö', 'AAOaao'),
    '[^a-zA-Z0-9]+', '-', 'g'
  )
))
where public_booking_slug is null;

create index if not exists companies_public_booking_slug_idx
  on public.companies (public_booking_slug)
  where public_booking_slug is not null;

create or replace function public.create_invoice_with_lines(
  p_invoice_number integer,
  p_customer_id uuid,
  p_assignment_ids uuid[],
  p_status text,
  p_invoice_date date,
  p_due_date date,
  p_total_ex_vat numeric,
  p_vat_amount numeric,
  p_total_inc_vat numeric,
  p_reference text default null,
  p_message text default null,
  p_lines jsonb default '[]'::jsonb
)
returns public.invoices
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_invoice public.invoices;
begin
  select company_id
    into v_company_id
  from public.profiles
  where id = auth.uid();

  if v_company_id is null then
    raise exception 'Ingen företagskoppling finns för användaren';
  end if;

  if not exists (
    select 1 from public.customers
    where id = p_customer_id and company_id = v_company_id
  ) then
    raise exception 'Kunden tillhör inte företaget';
  end if;

  if coalesce(array_length(p_assignment_ids, 1), 0) > 0 and exists (
    select 1 from public.assignments
    where id = any(p_assignment_ids)
      and company_id is distinct from v_company_id
  ) then
    raise exception 'Ett eller flera uppdrag tillhör inte företaget';
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Fakturan måste innehålla minst en fakturarad';
  end if;

  insert into public.invoices (
    invoice_number,
    customer_id,
    assignment_ids,
    status,
    invoice_date,
    due_date,
    total_ex_vat,
    vat_amount,
    total_inc_vat,
    reference,
    message,
    company_id,
    lines
  ) values (
    p_invoice_number,
    p_customer_id,
    coalesce(p_assignment_ids, '{}'::uuid[]),
    coalesce(nullif(p_status, ''), 'draft'),
    p_invoice_date,
    p_due_date,
    p_total_ex_vat,
    p_vat_amount,
    p_total_inc_vat,
    p_reference,
    p_message,
    v_company_id,
    p_lines
  )
  returning * into v_invoice;

  if coalesce(array_length(p_assignment_ids, 1), 0) > 0 then
    update public.assignments
    set invoiced = true
    where id = any(p_assignment_ids)
      and company_id = v_company_id;
  end if;

  return v_invoice;
end;
$$;

grant execute on function public.create_invoice_with_lines(
  integer, uuid, uuid[], text, date, date, numeric, numeric, numeric, text, text, jsonb
) to authenticated;
