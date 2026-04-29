-- Structured transport fields for the full SaaS flow:
-- booking request -> assignment -> driver execution -> invoice.

alter table public.assignments
  add column if not exists pickup_address text,
  add column if not exists delivery_address text,
  add column if not exists service_type text,
  add column if not exists booking_request_id uuid references public.booking_requests(id) on delete set null;

create index if not exists assignments_booking_request_id_idx on public.assignments(booking_request_id);
create index if not exists assignments_service_type_idx on public.assignments(service_type);

comment on column public.assignments.pickup_address is 'Optional structured pickup address for transport assignments.';
comment on column public.assignments.delivery_address is 'Optional structured delivery address for transport assignments.';
comment on column public.assignments.service_type is 'Transport service type, e.g. Kranbil, Budbil, Tippbil.';
comment on column public.assignments.booking_request_id is 'Source booking request when the assignment was created from public intake.';
