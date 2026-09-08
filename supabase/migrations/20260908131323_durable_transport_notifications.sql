-- Only server-derived events may be delivered by the worker. Legacy rows have
-- no event_key and are deliberately not replayed to historical recipients.
alter table public.notification_outbox add column if not exists event_key text;
alter table public.notification_outbox add column if not exists last_attempt_at timestamptz;
create unique index if not exists notification_outbox_event_key_unique on public.notification_outbox(event_key);

create or replace function public.queue_assignment_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare driver_record record; customer_record record; event_type text; snapshot jsonb;
begin
  -- Seeded demo contacts must never receive real mail.
  if exists(select 1 from public.companies c where c.id=new.company_id and c.org_nr in ('556000-0001','556000-0002')) then return new; end if;
  select full_name,email into driver_record from public.profiles where id=new.assigned_driver_id and company_id=new.company_id;
  select name,email into customer_record from public.customers where id=new.customer_id and company_id=new.company_id;
  snapshot := jsonb_build_object('assignmentId',new.id,'title',new.title,'address',new.address,
    'scheduledStart',new.scheduled_start,'completedAt',new.actual_stop,'priority',new.priority,
    'instructions',new.instructions,'adminComment',new.admin_comment,'trackingToken',new.tracking_token,
    'driverName',driver_record.full_name,'customerName',customer_record.name);
  if new.assigned_driver_id is not null and new.status in ('pending','unassigned')
    and (tg_op='INSERT' or new.assigned_driver_id is distinct from old.assigned_driver_id) then
    if driver_record.email is not null then
      insert into public.notification_outbox(company_id,recipient_email,recipient_user_id,channel,type,payload,event_key)
      values(new.company_id,driver_record.email,new.assigned_driver_id,'email','assignment-confirmation',snapshot,gen_random_uuid()::text);
    end if;
  end if;
  if tg_op='UPDATE' and new.tracking_enabled
    and nullif(btrim(customer_record.email),'') is not null then
    event_type := case when new.status in ('active','delayed') and old.actual_start is null and new.actual_start is not null then 'tracking-started'
      when new.status='completed' and old.status is distinct from 'completed' and new.actual_stop is not null then 'delivery-completed' else null end;
    if event_type is not null then
      insert into public.notification_outbox(company_id,recipient_email,channel,type,payload,event_key)
      values(new.company_id,customer_record.email,'email',event_type,snapshot,event_type || '/' || new.id::text)
      on conflict (event_key) do nothing;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.queue_assignment_email() from public,anon,authenticated;
drop trigger if exists queue_assignment_email on public.assignments;
create trigger queue_assignment_email after insert or update of assigned_driver_id,status,actual_start on public.assignments
for each row execute function public.queue_assignment_email();

create or replace function public.claim_notification_emails(p_company_id uuid default null, p_limit integer default 5)
returns setof public.notification_outbox language sql security definer set search_path = '' as $$
  update public.notification_outbox n set attempts=n.attempts+1,last_attempt_at=now()
  where n.id in (
    select id from public.notification_outbox
    where event_key is not null and channel='email' and status in ('pending','failed')
      and (p_company_id is null or company_id=p_company_id)
      and attempts<8 and created_at>now()-interval '23 hours'
      and (last_attempt_at is null or last_attempt_at<now()-make_interval(secs=>least(3600,60*power(2,attempts)::integer)))
    order by created_at for update skip locked limit least(greatest(p_limit,1),5)
  ) returning n.*;
$$;
revoke all on function public.claim_notification_emails(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_notification_emails(uuid,integer) to service_role;

create table if not exists public.mail_rate_limits (
  key text primary key, window_started_at timestamptz not null default now(), requests integer not null default 1
);
alter table public.mail_rate_limits enable row level security;
revoke all on public.mail_rate_limits from anon,authenticated;
create or replace function public.consume_mail_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare count_now integer;
begin
  if length(p_key)>200 or p_limit not between 1 and 100 or p_window_seconds not between 1 and 86400 then return false; end if;
  insert into public.mail_rate_limits(key) values(p_key)
  on conflict(key) do update set
    requests=case when mail_rate_limits.window_started_at<now()-make_interval(secs=>p_window_seconds) then 1 else mail_rate_limits.requests+1 end,
    window_started_at=case when mail_rate_limits.window_started_at<now()-make_interval(secs=>p_window_seconds) then now() else mail_rate_limits.window_started_at end
  returning requests into count_now;
  return count_now<=p_limit;
end $$;
revoke all on function public.consume_mail_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_mail_rate_limit(text,integer,integer) to service_role;

create or replace function public.find_auth_user_for_mail(p_email text)
returns table(id uuid,email_confirmed_at timestamptz)
language sql security definer set search_path='' as $$
  select u.id,u.email_confirmed_at from auth.users u where lower(u.email)=lower(trim(p_email)) limit 1;
$$;
revoke all on function public.find_auth_user_for_mail(text) from public,anon,authenticated;
grant execute on function public.find_auth_user_for_mail(text) to service_role;

create or replace function public.queue_portal_message_email() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient text; customer_name text;
begin
  -- Seeded demo contacts must never receive real mail.
  if exists(select 1 from public.companies c where c.id=new.company_id and c.org_nr in ('556000-0001','556000-0002')) then return new; end if;
  if new.sender_type <> 'customer' then return new; end if;
  select name into customer_name from public.customers where id=new.customer_id and company_id=new.company_id;
  if customer_name is null then return new; end if;
  select coalesce(nullif(s.email,''),(select p.email from public.profiles p join public.user_roles r on r.user_id=p.id and r.company_id=p.company_id where p.company_id=new.company_id and r.role='admin' limit 1))
    into recipient from (select 1) seed left join public.settings s on s.company_id=new.company_id;
  if recipient is not null then
    insert into public.notification_outbox(company_id,recipient_email,channel,type,payload,event_key)
    values(new.company_id,recipient,'email','new-customer-message',jsonb_build_object('customerName',customer_name,'customerId',new.customer_id,'message',new.message),'portal/'||new.id::text)
    on conflict(event_key) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.queue_portal_message_email() from public,anon,authenticated;
drop trigger if exists queue_portal_message_email on public.portal_messages;
create trigger queue_portal_message_email after insert on public.portal_messages for each row execute function public.queue_portal_message_email();

create or replace function public.queue_booking_email() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient text; company_name text; snapshot jsonb;
begin
  -- Seeded demo contacts must never receive real mail.
  if exists(select 1 from public.companies c where c.id=new.company_id and c.org_nr in ('556000-0001','556000-0002')) then return new; end if;
  select name into company_name from public.companies where id=new.company_id;
  if company_name is null then return new; end if;
  select coalesce(nullif(s.email,''),(select p.email from public.profiles p join public.user_roles r on r.user_id=p.id and r.company_id=p.company_id where p.company_id=new.company_id and r.role='admin' limit 1))
    into recipient from (select 1) seed left join public.settings s on s.company_id=new.company_id;
  snapshot := jsonb_build_object('companyName',company_name,'orderNumber',new.public_order_number,'customerName',new.customer_name,
    'customerEmail',new.customer_email,'customerPhone',new.customer_phone,'preferredDate',new.preferred_date,
    'title',new.title,'description',new.description);
  if recipient is not null then
    insert into public.notification_outbox(company_id,recipient_email,channel,type,payload,event_key)
    values(new.company_id,recipient,'email','booking-request-created',snapshot,'booking-admin/'||new.id::text) on conflict(event_key) do nothing;
  end if;
  if new.customer_email is not null then
    insert into public.notification_outbox(company_id,recipient_email,channel,type,payload,event_key)
    values(new.company_id,new.customer_email,'email','booking-request-confirmation',snapshot,'booking-customer/'||new.id::text) on conflict(event_key) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.queue_booking_email() from public,anon,authenticated;
drop trigger if exists queue_booking_email on public.booking_requests;
create trigger queue_booking_email after insert on public.booking_requests for each row execute function public.queue_booking_email();
