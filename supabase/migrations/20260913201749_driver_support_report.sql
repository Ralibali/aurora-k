-- Drivers can submit a report without an assignment. Existing support-ticket
-- read/update policies remain unchanged; the RPC returns only its receipt UUID.
create or replace function public.report_driver_support_ticket(
  p_message text,
  p_operation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid := public.get_my_company_id();
  v_message text := regexp_replace(p_message, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  v_ticket_id uuid;
begin
  if v_uid is null or v_company_id is null or
     not public.has_role(v_uid, 'driver'::public.app_role) then
    raise exception 'Logga in som förare i ditt företag för att skicka rapporten' using errcode = '42501';
  end if;
  if p_operation_id is null then
    raise exception 'Öppna formuläret igen och försök på nytt';
  end if;
  if v_message is null or length(v_message) not between 1 and 3000 then
    raise exception 'Beskriv rapporten med 1–3000 tecken';
  end if;

  insert into public.support_tickets (
    id, company_id, created_by, subject, message, status, priority,
    admin_reply, replied_at, replied_by
  ) values (
    p_operation_id, v_company_id, v_uid, 'Rapport om innehåll eller användare',
    v_message, 'open', 'normal', null, null, null
  )
  on conflict (id) do nothing
  returning id into v_ticket_id;

  if v_ticket_id is not null then
    return v_ticket_id;
  end if;

  -- A lost response can be retried even after support has answered the report.
  -- Never overwrite the original report, its status, or administrator fields.
  select id into v_ticket_id
  from public.support_tickets
  where id = p_operation_id
    and company_id = v_company_id
    and created_by = v_uid
    and subject = 'Rapport om innehåll eller användare'
    and message = v_message;
  if found then
    return v_ticket_id;
  end if;

  raise exception 'Sparningsnyckeln används redan. Öppna formuläret igen';
end;
$$;

revoke all on function public.report_driver_support_ticket(text, uuid) from public, anon;
grant execute on function public.report_driver_support_ticket(text, uuid) to authenticated;

notify pgrst, 'reload schema';
