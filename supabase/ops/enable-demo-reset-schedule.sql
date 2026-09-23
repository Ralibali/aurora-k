-- Kör manuellt efter migrering och demo-login. Tid anges i UTC.
create extension if not exists pg_cron;
select cron.schedule('aurora-demo-reset','30 2 * * *',$job$select public.reset_demo_companies();$job$);
