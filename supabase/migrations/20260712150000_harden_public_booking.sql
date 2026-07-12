alter table if exists public.booking_requests
  add column if not exists public_request_id uuid,
  add column if not exists public_order_number text;

create unique index if not exists booking_requests_company_public_request_key
  on public.booking_requests (company_id, public_request_id)
  where public_request_id is not null;

create unique index if not exists booking_requests_public_order_number_key
  on public.booking_requests (public_order_number)
  where public_order_number is not null;

create table if not exists public.public_booking_rate_limits (
  company_id uuid not null references public.companies(id) on delete cascade,
  fingerprint text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  created_at timestamptz not null default now(),
  primary key (company_id, fingerprint, bucket_start)
);

alter table public.public_booking_rate_limits enable row level security;
revoke all on table public.public_booking_rate_limits from anon, authenticated;

create or replace function public.consume_public_booking_rate_limit(
  p_company_id uuid,
  p_fingerprint text,
  p_limit integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket_start timestamptz;
  v_count integer;
begin
  v_bucket_start := date_trunc('minute', now())
    - ((extract(minute from now())::integer % 10) * interval '1 minute');

  insert into public.public_booking_rate_limits (
    company_id,
    fingerprint,
    bucket_start,
    request_count
  )
  values (p_company_id, p_fingerprint, v_bucket_start, 1)
  on conflict (company_id, fingerprint, bucket_start)
  do update set request_count = public.public_booking_rate_limits.request_count + 1
  returning request_count into v_count;

  delete from public.public_booking_rate_limits
  where bucket_start < now() - interval '2 days';

  return v_count <= greatest(coalesce(p_limit, 5), 1);
end;
$$;

revoke all on function public.consume_public_booking_rate_limit(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.consume_public_booking_rate_limit(uuid, text, integer) to service_role;

comment on column public.booking_requests.public_request_id is
  'Client-generated idempotency key for the public booking form.';

comment on column public.booking_requests.public_order_number is
  'Server-generated reference shown to the public booking customer.';
