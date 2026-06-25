-- Allow the public booking form (/boka) to create booking requests.
-- Admins still manage/read requests through the existing authenticated app policies.

alter table public.booking_requests enable row level security;

drop policy if exists "Public can create booking requests" on public.booking_requests;

create policy "Public can create booking requests"
on public.booking_requests
for insert
to anon, authenticated
with check (
  status = 'pending'
  and customer_name is not null
  and length(trim(customer_name)) between 2 and 160
  and title is not null
  and length(trim(title)) between 2 and 220
  and (customer_email is null or length(trim(customer_email)) <= 254)
  and (customer_phone is null or length(trim(customer_phone)) <= 60)
  and (preferred_date is null or preferred_date >= (current_date - interval '1 day'))
  and (description is null or length(description) <= 6000)
);

comment on policy "Public can create booking requests" on public.booking_requests is
  'Allows anonymous website visitors to submit transport booking requests from the public booking page with basic validation.';
