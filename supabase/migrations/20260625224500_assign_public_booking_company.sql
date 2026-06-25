-- Ensure legacy/public booking forms never create ownerless requests.

create or replace function public.assign_public_booking_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand text;
  v_company_id uuid;
begin
  if new.company_id is not null then
    return new;
  end if;

  v_brand := nullif(trim(split_part(split_part(coalesce(new.description, ''), E'\n', 1), ':', 2)), '');

  if v_brand is not null then
    select c.id
      into v_company_id
    from public.companies c
    left join public.settings s on s.company_id = c.id
    where lower(c.name) = lower(v_brand)
       or lower(s.company_name) = lower(v_brand)
       or lower(s.company_name) like '%' || lower(v_brand) || '%'
    order by
      case
        when lower(c.name) = lower(v_brand) then 0
        when lower(s.company_name) = lower(v_brand) then 1
        else 2
      end
    limit 1;
  end if;

  if v_company_id is null and lower(coalesce(new.description, '')) like '%publik bokningssida: aurora transport%' then
    select c.id
      into v_company_id
    from public.companies c
    left join public.settings s on s.company_id = c.id
    where c.public_booking_slug = 'aurora-transport'
       or lower(c.name) like '%aurora%transport%'
       or lower(s.company_name) like '%aurora%transport%'
    limit 1;
  end if;

  if v_company_id is null then
    raise exception 'Bokningssidan är inte kopplad till något företag';
  end if;

  new.company_id := v_company_id;
  return new;
end;
$$;

drop trigger if exists booking_requests_assign_company on public.booking_requests;
create trigger booking_requests_assign_company
before insert on public.booking_requests
for each row
execute function public.assign_public_booking_company();
