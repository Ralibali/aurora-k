-- Run against an isolated local Supabase database after applying migrations.
-- All fixtures and assertions are rolled back. No network or email is involved.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(21);

insert into public.companies(id, name) values ('b0010000-0000-4000-8000-000000000001', 'Driver workflow test');
insert into auth.users(id, email, raw_user_meta_data)
values ('b0020000-0000-4000-8000-000000000001', 'driver-workflow@example.invalid', '{"full_name":"Driver test"}');
insert into public.profiles(id, full_name, email, role, company_id)
values ('b0020000-0000-4000-8000-000000000001', 'Driver test', 'driver-workflow@example.invalid', 'driver', 'b0010000-0000-4000-8000-000000000001')
on conflict(id) do update set company_id = excluded.company_id, role = 'driver';
insert into public.user_roles(user_id, role, company_id)
values ('b0020000-0000-4000-8000-000000000001', 'driver', 'b0010000-0000-4000-8000-000000000001')
on conflict(user_id, role) do update set company_id = excluded.company_id;
insert into public.customers(id, name, company_id)
values ('b0030000-0000-4000-8000-000000000001', 'Fixture customer', 'b0010000-0000-4000-8000-000000000001');
insert into public.assignments(id, title, address, customer_id, company_id, assigned_driver_id, scheduled_start, status, require_photo, require_signature)
values ('b0040000-0000-4000-8000-000000000001', 'Proof fixture', 'Test address', 'b0030000-0000-4000-8000-000000000001', 'b0010000-0000-4000-8000-000000000001', 'b0020000-0000-4000-8000-000000000001', now() - interval '2 hours', 'pending', true, true),
('b0040000-0000-4000-8000-000000000002', 'Cancelled fixture', 'Test address', 'b0030000-0000-4000-8000-000000000001', 'b0010000-0000-4000-8000-000000000001', 'b0020000-0000-4000-8000-000000000001', now() - interval '2 hours', 'cancelled', false, false);

create function pg_temp.driver_op(op integer, kind text default 'assignment_status', meta jsonb default null, photo text default null, signature text default null, assignment_id uuid default 'b0040000-0000-4000-8000-000000000001') returns jsonb language sql as $$
 select public.sync_driver_operation('b0020000-0000-4000-8000-000000000001', ('b0050000-0000-4000-8000-' || lpad(op::text, 12, '0'))::uuid, assignment_id, kind,
   coalesce(meta, jsonb_build_object('status','active','changedAt',now() - interval '1 hour')), photo, signature);
$$;
select is(has_function_privilege('authenticated', 'public.sync_driver_operation(uuid,uuid,uuid,text,jsonb,text,text)', 'execute'), false, 'Mobile clients cannot call trusted evidence RPC directly');
select is(has_function_privilege('anon', 'public.sync_driver_operation(uuid,uuid,uuid,text,jsonb,text,text)', 'execute'), false, 'Anonymous callers cannot set driver lifecycle');
select is(has_function_privilege('service_role', 'public.sync_driver_operation(uuid,uuid,uuid,text,jsonb,text,text)', 'execute'), true, 'Trusted Edge Function can commit the operation');
select is(pg_temp.driver_op(1)->>'status', 'active', 'Pending assignment starts');
select is(pg_temp.driver_op(1)->>'duplicate', 'true', 'Same operation replays its committed receipt');
select is(pg_temp.driver_op(2, 'assignment_status', jsonb_build_object('status','active','changedAt',now()))->>'statusChanged', 'false', 'A second start does not replace original start');
select is((select actual_start from public.assignments where id='b0040000-0000-4000-8000-000000000001'), now() - interval '1 hour', 'Actual start remains original offline event time');
select throws_ok($$select pg_temp.driver_op(3, 'assignment_status', '{"status":"completed"}')$$, 'P0001', 'Slutför uppdraget med leveransbevis', 'Status operation cannot bypass proof');
select throws_ok($$select pg_temp.driver_op(4, 'delivery_proof', jsonb_build_object('completedAt',now(),'requirePhoto',false,'requireSignature',false,'existingPhotoUrl','https://forged.invalid/proof'))$$, 'P0001', 'Foto krävs enligt uppdragets sparade leveranskrav', 'Client flags and URLs cannot relax saved requirements');
select throws_ok($$select pg_temp.driver_op(5, 'delivery_proof', jsonb_build_object('completedAt',now()), 'https://fixture.invalid/photo')$$, 'P0001', 'Signatur och mottagarens namn krävs enligt uppdragets sparade leveranskrav', 'Saved signature requirement is enforced');
select is((select count(*) from public.assignment_protocols where assignment_id='b0040000-0000-4000-8000-000000000001'), 0::bigint, 'Rejected proof creates no protocol');
select is((select count(*) from public.driver_sync_operations where assignment_id='b0040000-0000-4000-8000-000000000001'), 2::bigint, 'Rejected proof commits no success receipt');
select throws_ok($$select pg_temp.driver_op(10, 'delivery_proof', jsonb_build_object('completedAt',now() - interval '2 hours','recipientName','Anna'), 'https://fixture.invalid/photo', 'https://fixture.invalid/signature')$$, 'P0001', 'Ogiltig sluttid', 'Offline completion cannot precede actual start');
update public.assignments set status = 'delayed' where id='b0040000-0000-4000-8000-000000000001';
select is(pg_temp.driver_op(6, 'delivery_proof', jsonb_build_object('completedAt',now(),'recipientName','Anna'), 'https://fixture.invalid/photo', 'https://fixture.invalid/signature')->>'status', 'completed', 'A started delayed job completes with required proof');
select is(pg_temp.driver_op(6, 'delivery_proof', jsonb_build_object('completedAt',now(),'recipientName','Anna'))->>'duplicate', 'true', 'Completed proof safely retries after lost response');
select is((select count(*) from public.assignment_protocols where assignment_id='b0040000-0000-4000-8000-000000000001'), 1::bigint, 'Retry does not duplicate delivery proof');
select throws_ok($$select pg_temp.driver_op(7)$$, 'P0001', 'Uppdraget har redan avslutats eller avbokats. Kontakta kontoret.', 'Queued stale start never reopens completed assignment');
select throws_ok($$select pg_temp.driver_op(8,'assignment_status',null,null,null,'b0040000-0000-4000-8000-000000000002')$$, 'P0001', 'Uppdraget har redan avslutats eller avbokats. Kontakta kontoret.', 'Queued start never reopens cancelled assignment');
select throws_ok($$select public.driver_update_assignment('b0040000-0000-4000-8000-000000000001', 'pending')$$, 'P0001', 'Uppdatera appen och använd start eller leveransbevis för att ändra uppdragets status', 'Legacy RPC cannot bypass lifecycle checks');
select throws_ok($$select pg_temp.driver_op(11,'delivery_proof',jsonb_build_object('completedAt',now()),null,null,'b0040000-0000-4000-8000-000000000002')$$, 'P0001', 'Uppdraget har redan avslutats eller avbokats. Kontakta kontoret.', 'Queued proof never overwrites cancellation');
update public.assignments set status = 'pending', assigned_driver_id = null where id = 'b0040000-0000-4000-8000-000000000002';
select throws_ok($$select pg_temp.driver_op(12,'assignment_status',null,null,null,'b0040000-0000-4000-8000-000000000002')$$, '42501', 'Du får inte ändra detta uppdrag', 'Removed assignment rejects queued work from its previous driver');
select * from finish();
rollback;
