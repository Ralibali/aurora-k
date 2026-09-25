-- Endast inventering. Kontrollera ägarskap och säkerhetskopia före eventuell radering.
select * from public.assignments where company_id is null;
select * from public.customers where company_id is null;
select p.* from public.profiles p where p.company_id is null and
 (p.role='driver' or exists(select 1 from public.user_roles r where r.user_id=p.id and r.role='driver'));
/*
begin;
delete from public.assignments where company_id is null;
delete from public.customers where company_id is null;
-- Profiler ska utredas individuellt; ta inte bort väntande registreringar.
-- delete from public.profiles where id = 'GRANSKAT-UUID' and company_id is null;
rollback; -- Byt till commit först efter manuell granskning.
*/
