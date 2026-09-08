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
    v_photo := coalesce(nullif(btrim(p_photo_url), ''), nullif(btrim(v_assignment.consignment_photo_url), ''));
    v_signature := coalesce(nullif(btrim(p_signature_url), ''), nullif(btrim(v_assignment.signature_url), ''));
    v_recipient := btrim(coalesce(p_metadata->>'recipientName', ''));
    v_note := btrim(coalesce(p_metadata->>'note', ''));
    if length(v_recipient) > 200 or length(v_note) > 8000 then raise exception 'Namnet eller kommentaren är för lång'; end if;
    if v_assignment.require_photo and v_photo is null then raise exception 'Foto krävs enligt uppdragets sparade leveranskrav'; end if;
    if v_assignment.require_signature and (v_signature is null or v_recipient = '') then raise exception 'Signatur och mottagarens namn krävs enligt uppdragets sparade leveranskrav'; end if;
    v_proof := jsonb_build_object(
      'operationId', p_operation_id, 'photoUrl', v_photo, 'signatureUrl', v_signature,
      'recipientName', v_recipient, 'note', v_note, 'completedAt', v_time,
      'latitude', p_metadata->'latitude', 'longitude', p_metadata->'longitude'
    );
    insert into public.assignment_protocols(assignment_id, company_id, created_by, protocol_type, title, signature_url, content)
    values(p_assignment_id, v_assignment.company_id, p_user_id, 'delivery_proof', 'Digitalt leveransbevis', v_signature, v_proof::text);
    update public.assignments set
      status = 'completed', actual_stop = v_time, consignment_photo_url = v_photo, signature_url = v_signature,
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

-- Old mobile clients must not bypass lifecycle or delivery requirements.
create or replace function public.driver_update_assignment(
  _id uuid, _status text default null, _actual_start timestamptz default null,
  _actual_stop timestamptz default null, _driver_comment text default null,
  _consignment_photo_url text default null, _signature_url text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if _status is not null or _actual_start is not null or _actual_stop is not null or _consignment_photo_url is not null or _signature_url is not null then
    raise exception 'Uppdatera appen och använd start eller leveransbevis för att ändra uppdragets status';
  end if;
  update public.assignments a set driver_comment = coalesce(_driver_comment, a.driver_comment)
  where a.id = _id and a.assigned_driver_id = auth.uid()
    and exists(select 1 from public.user_roles r where r.user_id = auth.uid() and r.company_id = a.company_id and r.role = 'driver');
  if not found then raise exception 'Uppdraget hittades inte eller tillhör en annan förare' using errcode = '42501'; end if;
end;
$$;
revoke all on function public.driver_update_assignment(uuid, text, timestamptz, timestamptz, text, text, text) from public, anon;
grant execute on function public.driver_update_assignment(uuid, text, timestamptz, timestamptz, text, text, text) to authenticated;

notify pgrst, 'reload schema';
