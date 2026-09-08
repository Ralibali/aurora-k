-- Close tenant/role bypasses without deleting or rewriting customer records.

alter table public.companies add column if not exists stripe_event_created bigint not null default 0;
alter table public.companies add column if not exists stripe_last_event_id text;
alter table public.invitations add column if not exists accepted_by uuid references auth.users(id);
alter table public.invitations add column if not exists expires_at timestamptz;
alter table public.invitations alter column expires_at set default (now()+interval '7 days');
-- Verified live: no request IDs are shared across companies. Paths use this
-- global request ID, so it must not be reusable by another tenant.
create unique index if not exists booking_requests_public_request_unique
  on public.booking_requests(public_request_id) where public_request_id is not null;

-- Registration is the only customer path that creates a company. Platform
-- provisioning remains explicit; clients cannot set their own paid/trial state.
drop policy if exists "Authenticated can create companies" on public.companies;
drop policy if exists "Users without company can create companies" on public.companies;
create or replace function public.protect_company_billing() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('postgres','supabase_admin','service_role') or public.is_platform_admin(auth.uid()) then return new; end if;
  if new.subscription_status is distinct from old.subscription_status
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    or new.trial_ends_at is distinct from old.trial_ends_at
    or new.stripe_event_created is distinct from old.stripe_event_created
    or new.stripe_last_event_id is distinct from old.stripe_last_event_id then
    raise exception 'Billing fields can only be changed by the billing service' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.protect_company_billing() from public,anon,authenticated;
drop trigger if exists protect_company_billing on public.companies;
create trigger protect_company_billing before update on public.companies
for each row execute function public.protect_company_billing();

create or replace function public.complete_company_registration(
  _name text, _org_nr text default null, _user_full_name text default null, _phone text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_company uuid; v_email text; v_confirmed timestamptz;
begin
  if v_uid is null then raise exception 'Logga in först' using errcode='42501'; end if;
  if _name is null or length(btrim(_name)) not between 1 and 200 or length(coalesce(_user_full_name,''))>200 or length(coalesce(_phone,''))>50 then
    raise exception 'Kontrollera registreringsuppgifterna'; end if;
  select email,email_confirmed_at into v_email,v_confirmed from auth.users where id=v_uid;
  if v_email is null or v_confirmed is null then raise exception 'Bekräfta din e-postadress först' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  select company_id into v_company from public.profiles where id=v_uid for update;
  if v_company is not null then return v_company; end if;
  insert into public.companies(name,org_nr,subscription_status,trial_ends_at)
  values(btrim(_name),nullif(btrim(_org_nr),''),'trialing',now()+interval '14 days') returning id into v_company;
  insert into public.profiles(id,email,full_name,phone,role,company_id)
  values(v_uid,v_email,coalesce(nullif(btrim(_user_full_name),''),split_part(v_email,'@',1)),nullif(btrim(_phone),''),'admin',v_company)
  on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,phone=excluded.phone,role='admin',company_id=excluded.company_id;
  insert into public.user_roles(user_id,role,company_id) values(v_uid,'admin',v_company)
  on conflict(user_id,role) do update set company_id=excluded.company_id;
  return v_company;
end $$;
revoke all on function public.complete_company_registration(text,text,text,text) from public,anon;
grant execute on function public.complete_company_registration(text,text,text,text) to authenticated;
-- Retire the non-idempotent legacy registration entry point.
revoke all on function public.register_company(text,text,text) from public,anon,authenticated;

create or replace function public.accept_invitation(p_token uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_inv public.invitations; v_email text; v_company uuid; v_confirmed timestamptz;
begin
  if v_uid is null or p_user_id is distinct from v_uid then raise exception 'Du kan bara acceptera din egen inbjudan' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  select * into v_inv from public.invitations where token=p_token for update;
  if not found then raise exception 'Inbjudan är ogiltig'; end if;
  select email,email_confirmed_at into v_email,v_confirmed from auth.users where id=v_uid;
  if v_confirmed is null or lower(v_email) is distinct from lower(v_inv.email) then raise exception 'Inbjudan gäller en annan e-postadress' using errcode='42501'; end if;
  select company_id into v_company from public.profiles where id=v_uid for update;
  if v_company is not null and v_company is distinct from v_inv.company_id then raise exception 'Kontot tillhör redan ett annat företag' using errcode='42501'; end if;
  if v_inv.accepted_at is not null then
    if v_inv.accepted_by=v_uid and v_company=v_inv.company_id then return; end if;
    raise exception 'Inbjudan har redan använts';
  end if;
  if coalesce(v_inv.expires_at,v_inv.created_at+interval '7 days') <= now() then raise exception 'Inbjudan har gått ut'; end if;
  -- Existing same-company admins keep their role; accepting cannot downgrade them.
  insert into public.profiles(id,email,full_name,role,company_id)
  values(v_uid,v_email,coalesce(nullif(v_inv.name,''),split_part(v_email,'@',1)),'driver',v_inv.company_id)
  on conflict(id) do update set company_id=excluded.company_id,full_name=coalesce(nullif(v_inv.name,''),profiles.full_name);
  insert into public.user_roles(user_id,role,company_id) values(v_uid,'driver',v_inv.company_id)
  on conflict(user_id,role) do update set company_id=excluded.company_id;
  update public.invitations set accepted_at=now(),accepted_by=v_uid where id=v_inv.id;
end $$;
revoke all on function public.accept_invitation(uuid,uuid) from public,anon;
grant execute on function public.accept_invitation(uuid,uuid) to authenticated;

create or replace function public.lookup_invitation_by_token(p_token uuid) returns json
language plpgsql security definer set search_path='' as $$
declare v_result json;
begin
  select json_build_object('id',i.id,'email',i.email,'name',i.name,'company_id',i.company_id,'company_name',c.name)
    into v_result from public.invitations i join public.companies c on c.id=i.company_id
    where i.token=p_token and i.accepted_at is null and coalesce(i.expires_at,i.created_at+interval '7 days')>now();
  if v_result is null then raise exception 'Inbjudan har gått ut eller redan använts'; end if;
  return v_result;
end $$;
revoke all on function public.lookup_invitation_by_token(uuid) from public;
grant execute on function public.lookup_invitation_by_token(uuid) to anon,authenticated;

-- User-supplied signup metadata is a display name, never an authorization role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),'driver')
  on conflict(id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

-- Token ownership must match the customer, even when the caller is an admin.
drop policy if exists "Admins full access on customer_access_tokens" on public.customer_access_tokens;
create policy "Admins full access on customer_access_tokens" on public.customer_access_tokens for all to authenticated
using(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'admin'))
with check(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'admin') and exists(
  select 1 from public.customers c where c.id=customer_id and c.company_id=customer_access_tokens.company_id));
create or replace function public.validate_customer_token(p_token text) returns json
language plpgsql security definer set search_path='' as $$
declare v_result json;
begin
  select json_build_object('customer_id',c.id,'company_id',c.company_id,'customer_name',c.name,'customer_email',c.email) into v_result
  from public.customer_access_tokens t join public.customers c on c.id=t.customer_id
  where t.token=p_token and (t.expires_at is null or t.expires_at>now())
    and c.company_id is not null and t.company_id=c.company_id;
  if v_result is null then raise exception 'Invalid or expired token' using errcode='42501'; end if;
  return v_result;
end $$;
revoke all on function public.validate_customer_token(text) from public;
grant execute on function public.validate_customer_token(text) to anon,authenticated;

create or replace function public.get_portal_messages(p_token text) returns setof public.portal_messages
language plpgsql security definer set search_path='' as $$
declare v_token json;
begin
  v_token:=public.validate_customer_token(p_token);
  return query select * from public.portal_messages
    where customer_id=(v_token->>'customer_id')::uuid and company_id=(v_token->>'company_id')::uuid order by created_at;
end $$;
revoke all on function public.get_portal_messages(text) from public;
grant execute on function public.get_portal_messages(text) to anon,authenticated;
create or replace function public.send_portal_message(p_token text,p_message text,p_sender_name text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_token json; v_id uuid;
begin
  if p_message is null or length(btrim(p_message)) not between 1 and 4000 then raise exception 'Skriv ett meddelande med 1–4000 tecken'; end if;
  v_token:=public.validate_customer_token(p_token);
  insert into public.portal_messages(customer_id,company_id,sender_type,sender_name,message)
  values((v_token->>'customer_id')::uuid,(v_token->>'company_id')::uuid,'customer',v_token->>'customer_name',btrim(p_message)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.send_portal_message(text,text,text) from public;
grant execute on function public.send_portal_message(text,text,text) to anon,authenticated;
create or replace function public.submit_satisfaction(p_token text,p_rating integer,p_comment text default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_token json;
begin
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Rating must be between 1 and 5'; end if;
  v_token:=public.validate_customer_token(p_token);
  insert into public.customer_satisfaction(customer_id,company_id,rating,comment)
  values((v_token->>'customer_id')::uuid,(v_token->>'company_id')::uuid,p_rating,p_comment);
end $$;
revoke all on function public.submit_satisfaction(text,integer,text) from public;
grant execute on function public.submit_satisfaction(text,integer,text) to anon,authenticated;

-- Public booking and notifications must pass through the authenticated server.
drop policy if exists "Anon can create booking requests" on public.booking_requests;
drop policy if exists "Anon can create booking requests with required fields" on public.booking_requests;
drop policy if exists "Public can create booking requests" on public.booking_requests;
revoke all on public.booking_requests from anon;
drop policy if exists "Public can enqueue booking notifications" on public.notification_outbox;
drop policy if exists "Company users can read notification outbox" on public.notification_outbox;
revoke all on public.notification_outbox from anon,authenticated;
grant select on public.notification_outbox to authenticated;
grant all on public.notification_outbox to service_role;
create policy "Company admins read notification outbox" on public.notification_outbox for select to authenticated
using(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'admin'));

-- The request UUID in the object path is tied to the actual booking tenant.
update storage.buckets set public=false where id='booking-attachments';
drop policy if exists "Authenticated can read booking attachments" on storage.objects;
create policy "Company admins read own booking attachments" on storage.objects for select to authenticated
using(bucket_id='booking-attachments' and public.has_role(auth.uid(),'admin') and exists(
  select 1 from public.booking_requests b where b.company_id=public.get_my_company_id()
    and b.public_request_id::text=(storage.foldername(name))[2] and (storage.foldername(name))[1]='public'));

-- Remove the later broad policies that overrode the original driver restrictions.
drop policy if exists "Company members manage driver documents" on public.driver_documents;
drop policy if exists "Company members manage vehicle maintenance" on public.vehicle_maintenance;
drop policy if exists "Admins full access on driver_documents" on public.driver_documents;
drop policy if exists "Drivers can read own documents" on public.driver_documents;
create policy "Admins full access on driver_documents" on public.driver_documents for all to authenticated
using(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'admin'))
with check(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'admin') and exists(
 select 1 from public.profiles p where p.id=driver_id and p.company_id=driver_documents.company_id));
create policy "Drivers can read own documents" on public.driver_documents for select to authenticated
using(company_id=public.get_my_company_id() and driver_id=auth.uid());
drop policy if exists "Admins full access on vehicle_maintenance" on public.vehicle_maintenance;
drop policy if exists "Drivers can read vehicle_maintenance" on public.vehicle_maintenance;
create policy "Admins full access on vehicle_maintenance" on public.vehicle_maintenance for all to authenticated
using(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'admin'))
with check(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'admin') and exists(
 select 1 from public.vehicles v where v.id=vehicle_id and v.company_id=vehicle_maintenance.company_id));
create policy "Drivers can read vehicle_maintenance" on public.vehicle_maintenance for select to authenticated
using(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'driver'));
notify pgrst,'reload schema';
