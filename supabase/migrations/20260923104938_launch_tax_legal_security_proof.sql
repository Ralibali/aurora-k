-- Additive rollout: database first, edge functions next, web client last.
alter table public.companies add column if not exists terms_version text;
alter table public.companies add column if not exists dpa_version text;
alter table public.companies add column if not exists legal_accepted_at timestamptz;
alter table public.companies add column if not exists legal_accepted_by uuid references auth.users(id) on delete set null;

-- No client, including platform admins, may rewrite evidence of acceptance.
create or replace function public.protect_legal_acceptance() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if current_user in ('postgres','supabase_admin','service_role') then return new; end if;
  if tg_op='INSERT' then
    if new.terms_version is not null or new.dpa_version is not null or new.legal_accepted_at is not null or new.legal_accepted_by is not null then
      raise exception 'Avtalsgodkännande måste registreras på serversidan' using errcode='42501';
    end if;
    return new;
  end if;
  if (new.terms_version,new.dpa_version,new.legal_accepted_at,new.legal_accepted_by)
     is distinct from (old.terms_version,old.dpa_version,old.legal_accepted_at,old.legal_accepted_by) then
    raise exception 'Avtalsgodkännande kan inte ändras från klienten' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.protect_legal_acceptance() from public,anon,authenticated;
drop trigger if exists protect_legal_acceptance on public.companies;
create trigger protect_legal_acceptance before insert or update on public.companies for each row execute function public.protect_legal_acceptance();

drop function if exists public.complete_company_registration(text,text,text,text);
create or replace function public.complete_company_registration(
  _name text, _org_nr text default null, _user_full_name text default null, _phone text default null, _terms_version text default null, _dpa_version text default null
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
  if _terms_version is distinct from '2026-09-23' or _dpa_version is distinct from '2026-09-23' then
    raise exception 'Läs och godkänn aktuella användarvillkor och PUB-avtal';
  end if;
  insert into public.companies(name,org_nr,subscription_status,trial_ends_at,terms_version,dpa_version,legal_accepted_at,legal_accepted_by)
  values(btrim(_name),nullif(btrim(_org_nr),''),'trialing',now()+interval '14 days','2026-09-23','2026-09-23',now(),v_uid) returning id into v_company;
  insert into public.profiles(id,email,full_name,phone,role,company_id)
  values(v_uid,v_email,coalesce(nullif(btrim(_user_full_name),''),split_part(v_email,'@',1)),nullif(btrim(_phone),''),'admin',v_company)
  on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,phone=excluded.phone,role='admin',company_id=excluded.company_id;
  insert into public.user_roles(user_id,role,company_id) values(v_uid,'admin',v_company)
  on conflict(user_id,role) do update set company_id=excluded.company_id;
  return v_company;
end $$;
revoke all on function public.complete_company_registration(text,text,text,text,text,text) from public,anon;
grant execute on function public.complete_company_registration(text,text,text,text,text,text) to authenticated;

update storage.buckets set file_size_limit=10485760,
 allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
where id='booking-attachments';

create or replace function public.is_demo_company(company_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.companies c where c.id=company_id and c.org_nr in ('556000-0001','556000-0002'));
$$;
revoke all on function public.is_demo_company(uuid) from public,anon;
grant execute on function public.is_demo_company(uuid) to authenticated,service_role;

create or replace function public.protect_demo_identity() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if old.org_nr in ('556000-0001','556000-0002') and
 (new.name,new.org_nr,new.public_booking_slug) is distinct from (old.name,old.org_nr,old.public_booking_slug) then
   raise exception 'Demoföretagets identitet får inte ändras' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.protect_demo_identity() from public,anon,authenticated;
drop trigger if exists protect_demo_identity on public.companies;
create trigger protect_demo_identity before update on public.companies for each row execute function public.protect_demo_identity();

create or replace function public.block_demo_public_channels() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if public.is_demo_company(new.company_id) then
   raise exception 'Funktionen är inte tillgänglig i demoföretag' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.block_demo_public_channels() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['customer_access_tokens','order_inbox_channels','booking_requests'] loop
  execute format('drop trigger if exists block_demo_public_channels on public.%I',t);
  execute format('create trigger block_demo_public_channels before insert or update on public.%I for each row execute function public.block_demo_public_channels()',t);
 end loop;
end $$;

-- Trusted scheduler only. Discover every tenant table, retry in FK order, and
-- fail atomically if a dependency cannot be removed. Never touch other tenants.
create or replace function public.reset_demo_companies() returns void
language plpgsql security definer set search_path='' as $$
declare ids uuid[]; t record; remaining bigint; changed bigint; progress bigint; rounds integer:=0;
begin
 select array_agg(id) into ids from public.companies where org_nr in ('556000-0001','556000-0002');
 if ids is null then return; end if;
 perform pg_catalog.pg_advisory_xact_lock(20260923);
 loop
  remaining:=0; progress:=0; rounds:=rounds+1;
  for t in select c.table_schema,c.table_name from information_schema.columns c
   join information_schema.tables x on x.table_schema=c.table_schema and x.table_name=c.table_name
   where c.table_schema='public' and c.column_name='company_id' and x.table_type='BASE TABLE'
   and c.table_name not in ('companies','settings','profiles','user_roles') loop
   begin
    execute format('delete from %I.%I where company_id = any($1)',t.table_schema,t.table_name) using ids;
    get diagnostics changed=row_count;
    progress:=progress+changed;
   exception when foreign_key_violation then remaining:=remaining+1;
   end;
  end loop;
  exit when remaining=0 and progress=0;
  if (remaining>0 and progress=0) or rounds>100 then raise exception 'Demorensning blockerad av beroenden; inga ändringar sparades'; end if;
 end loop;
end $$;
revoke all on function public.reset_demo_companies() from public,anon,authenticated;
grant execute on function public.reset_demo_companies() to service_role;

alter table public.assignments add column if not exists proof_photo_path text;
alter table public.assignments add column if not exists signature_path text;
-- Strip signing parameters; preserve percent-encoded paths for decoding by readers.
create or replace function public.proof_storage_path(value text) returns text
language sql immutable set search_path='' as $$
 select case when value ~ '^https?://[^/]+/storage/v1/object/(sign|public)/(consignment-notes|signatures)/'
 then regexp_replace(split_part(value,'?',1),'^https?://[^/]+/storage/v1/object/(sign|public)/','')
 when value ~ '^(consignment-notes|signatures)/[^?]+' then value else null end;
$$;
update public.assignments set proof_photo_path=public.proof_storage_path(consignment_photo_url)
where proof_photo_path is null and consignment_photo_url is not null;
update public.assignments set signature_path=public.proof_storage_path(signature_url)
where signature_path is null and signature_url is not null;
create or replace function public.protect_proof_paths() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('postgres','supabase_admin','service_role') then return new; end if;
 if tg_op='INSERT' then
  if new.proof_photo_path is null and new.signature_path is null then return new; end if;
 elsif (new.proof_photo_path,new.signature_path) is not distinct from (old.proof_photo_path,old.signature_path) then return new;
 end if;
 raise exception 'Leveransbevis sparas via förarens synkronisering' using errcode='42501';
end $$;
revoke all on function public.protect_proof_paths() from public,anon,authenticated;
create trigger protect_proof_paths before insert or update on public.assignments for each row execute function public.protect_proof_paths();

-- The Edge Function validates authentication and stores evidence, then commits
-- the assignment, proof and idempotency receipt together under a row lock.
create or replace function public.sync_driver_operation(
  p_user_id uuid,
  p_operation_id uuid,
  p_assignment_id uuid,
  p_operation_type text,
  p_metadata jsonb,
  p_photo_url text default null,
  p_signature_url text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assignment public.assignments%rowtype;
  v_previous public.driver_sync_operations%rowtype;
  v_result jsonb;
  v_time timestamptz;
  v_photo text;
  v_signature text;
  v_recipient text;
  v_note text;
  v_proof jsonb;
  v_previous_status text;
begin
  if p_user_id is null or p_operation_id is null or p_assignment_id is null or p_metadata is null
     or jsonb_typeof(p_metadata) <> 'object' or p_operation_type is null or p_operation_type not in ('assignment_status', 'delivery_proof') then
    raise exception 'Ogiltig operation' using errcode = '22023';
  end if;
  -- Serialize even simultaneous first deliveries of one idempotency key.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text, 0));
  select * into v_assignment from public.assignments where id = p_assignment_id for update;
  if not found then raise exception 'Uppdraget hittades inte'; end if;
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = p_user_id and r.company_id = v_assignment.company_id
      and (r.role = 'admin' or (r.role = 'driver' and v_assignment.assigned_driver_id = p_user_id))
  ) then raise exception 'Du får inte ändra detta uppdrag' using errcode = '42501'; end if;

  select * into v_previous from public.driver_sync_operations where idempotency_key = p_operation_id for update;
  if found then
    if v_previous.user_id <> p_user_id or v_previous.assignment_id <> p_assignment_id or v_previous.operation_type <> p_operation_type then
      raise exception 'Operationsnyckeln används redan';
    end if;
    if v_previous.status = 'completed' then
      return v_previous.result || jsonb_build_object('duplicate', true);
    end if;
  end if;
  v_previous_status := v_assignment.status;
  if v_previous_status not in ('pending', 'unassigned', 'active', 'delayed') then
    raise exception 'Uppdraget har redan avslutats eller avbokats. Kontakta kontoret.';
  end if;

  if p_operation_type = 'assignment_status' then
    if p_metadata->>'status' is distinct from 'active' then raise exception 'Slutför uppdraget med leveransbevis'; end if;
    v_time := (p_metadata->>'changedAt')::timestamptz;
    if v_time is null or not isfinite(v_time) or v_time > now() + interval '10 minutes' then raise exception 'Ogiltig starttid'; end if;
    -- A second start must preserve the original actual start, including delayed work.
    if v_assignment.actual_start is null then
      update public.assignments set status = 'active', actual_start = v_time, actual_stop = null where id = p_assignment_id;
      v_result := jsonb_build_object('status', 'active', 'previousStatus', v_previous_status, 'statusChanged', true, 'actualStart', v_time);
    else
      v_result := jsonb_build_object('status', v_previous_status, 'previousStatus', v_previous_status, 'statusChanged', false, 'actualStart', v_assignment.actual_start);
    end if;
  else
    if v_assignment.actual_start is null or v_previous_status not in ('active', 'delayed') then
      raise exception 'Körningen måste startas och synkas innan den kan slutföras';
    end if;
    v_time := (p_metadata->>'completedAt')::timestamptz;
    if v_time is null or not isfinite(v_time) or v_time < v_assignment.actual_start or v_time > now() + interval '10 minutes' then raise exception 'Ogiltig sluttid'; end if;
    v_photo := coalesce(public.proof_storage_path(nullif(btrim(p_photo_url),'')),v_assignment.proof_photo_path,public.proof_storage_path(v_assignment.consignment_photo_url));
    v_signature := coalesce(public.proof_storage_path(nullif(btrim(p_signature_url),'')),v_assignment.signature_path,public.proof_storage_path(v_assignment.signature_url));
    v_recipient := btrim(coalesce(p_metadata->>'recipientName', ''));
    v_note := btrim(coalesce(p_metadata->>'note', ''));
    if length(v_recipient) > 200 or length(v_note) > 8000 then raise exception 'Namnet eller kommentaren är för lång'; end if;
    if v_assignment.require_photo and v_photo is null then raise exception 'Foto krävs enligt uppdragets sparade leveranskrav'; end if;
    if v_assignment.require_signature and (v_signature is null or v_recipient = '') then raise exception 'Signatur och mottagarens namn krävs enligt uppdragets sparade leveranskrav'; end if;
    v_proof := jsonb_build_object(
      'operationId', p_operation_id, 'photoPath', v_photo, 'signaturePath', v_signature,
      'recipientName', v_recipient, 'note', v_note, 'completedAt', v_time,
      'latitude', p_metadata->'latitude', 'longitude', p_metadata->'longitude'
    );
    insert into public.assignment_protocols(assignment_id, company_id, created_by, protocol_type, title, signature_url, content)
    values(p_assignment_id, v_assignment.company_id, p_user_id, 'delivery_proof', 'Digitalt leveransbevis', null, v_proof::text);
    update public.assignments set
      status = 'completed', actual_stop = v_time, proof_photo_path = v_photo, signature_path = v_signature,
      driver_comment = concat_ws(E'\n', nullif(v_assignment.driver_comment, ''),
        '[' || to_char(v_time at time zone 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') || '] Uppdrag slutfört' ||
        case when v_recipient <> '' then ': Mottagare ' || v_recipient else '' end ||
        case when v_note <> '' then ' · ' || v_note else '' end || ' [sync:' || p_operation_id::text || ']')
    where id = p_assignment_id;
    v_result := v_proof || jsonb_build_object('status', 'completed', 'previousStatus', v_previous_status, 'statusChanged', true);
  end if;
  insert into public.driver_sync_operations(idempotency_key, company_id, assignment_id, user_id, operation_type, status, result, completed_at)
  values(p_operation_id, v_assignment.company_id, p_assignment_id, p_user_id, p_operation_type, 'completed', v_result, now())
  on conflict (idempotency_key) do update set status = 'completed', result = excluded.result, error_message = null, completed_at = now(), updated_at = now();
  return v_result;
end;
$$;
revoke all on function public.sync_driver_operation(uuid, uuid, uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.sync_driver_operation(uuid, uuid, uuid, text, jsonb, text, text) to service_role;


notify pgrst, 'reload schema';
