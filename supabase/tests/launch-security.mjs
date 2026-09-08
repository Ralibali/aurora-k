// Disposable PostgreSQL integration checks. No network or persistent database.
// Run from repo root: node supabase/tests/launch-security.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE ?? 'node_modules/@electric-sql/pglite/dist/index.js')).href);
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create type public.app_role as enum('admin','driver');
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.companies(id uuid primary key default gen_random_uuid(),name text,org_nr text,subscription_status text default 'pending',stripe_customer_id text,stripe_subscription_id text,trial_ends_at timestamptz);
create table public.profiles(id uuid primary key references auth.users,company_id uuid references public.companies,email text,full_name text,phone text,role text default 'driver');
create table public.user_roles(user_id uuid references auth.users,role public.app_role,company_id uuid references public.companies,unique(user_id,role));
create table public.platform_admins(user_id uuid primary key);
create function public.get_my_company_id() returns uuid language sql security definer as $$ select company_id from public.profiles where id=auth.uid() $$;
create function public.has_role(u uuid,r public.app_role) returns boolean language sql security definer as $$ select exists(select 1 from public.user_roles where user_id=u and role=r and company_id=public.get_my_company_id()) $$;
create function public.is_platform_admin(u uuid) returns boolean language sql security definer as $$ select exists(select 1 from public.platform_admins where user_id=u) $$;
create function public.register_company(text,text,text) returns uuid language sql as $$ select null::uuid $$;
create table public.invitations(id uuid primary key default gen_random_uuid(),company_id uuid references public.companies,email text,name text,token uuid unique default gen_random_uuid(),accepted_at timestamptz,created_at timestamptz default now());
create table public.customers(id uuid primary key,company_id uuid references public.companies,name text,email text);
create table public.customer_access_tokens(id uuid primary key default gen_random_uuid(),customer_id uuid references public.customers,company_id uuid references public.companies,token text unique,expires_at timestamptz);
create table public.portal_messages(id uuid primary key default gen_random_uuid(),customer_id uuid references public.customers,company_id uuid references public.companies,sender_type text,sender_name text,message text,created_at timestamptz default now());
create table public.customer_satisfaction(customer_id uuid,company_id uuid,rating integer,comment text);
create table public.booking_requests(id uuid primary key default gen_random_uuid(),company_id uuid references public.companies,public_request_id uuid,public_order_number text,customer_name text,customer_email text,customer_phone text,preferred_date timestamptz,description text,title text,status text default 'pending');
create table public.notification_outbox(id uuid primary key default gen_random_uuid(),company_id uuid,payload jsonb,event_key text,recipient_email text,recipient_user_id uuid,channel text,type text,status text default 'pending',attempts integer default 0,last_error text,created_at timestamptz default now(),sent_at timestamptz);
create table public.settings(company_id uuid primary key,email text);
create table public.assignments(id uuid primary key default gen_random_uuid(),company_id uuid,customer_id uuid,assigned_driver_id uuid,title text,address text,scheduled_start timestamptz,scheduled_end timestamptz,actual_start timestamptz,actual_stop timestamptz,status text default 'pending',require_photo boolean default false,require_signature boolean default false,consignment_photo_url text,signature_url text,driver_comment text,priority text,instructions text,admin_comment text,tracking_token uuid default gen_random_uuid(),tracking_enabled boolean default true);
create table public.assignment_protocols(id uuid primary key default gen_random_uuid(),assignment_id uuid,company_id uuid,created_by uuid,protocol_type text,title text,signature_url text,content text);
create table public.driver_sync_operations(idempotency_key uuid primary key,company_id uuid,assignment_id uuid,user_id uuid,operation_type text,status text,result jsonb,error_message text,completed_at timestamptz,updated_at timestamptz default now());
create table public.driver_documents(id uuid primary key default gen_random_uuid(),company_id uuid,driver_id uuid,notes text);
create table public.vehicles(id uuid primary key,company_id uuid);
create table public.vehicle_maintenance(id uuid primary key default gen_random_uuid(),company_id uuid,vehicle_id uuid,notes text);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
create table storage.buckets(id text primary key,public boolean);
insert into storage.buckets values('booking-attachments',true);
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
grant all on all tables in schema public,storage to anon,authenticated,service_role;
grant execute on all functions in schema public,auth,storage to anon,authenticated,service_role;
alter table public.companies enable row level security;
create policy "Users without company can create companies" on public.companies for insert to authenticated with check(public.get_my_company_id() is null);
create policy "Users can view own company" on public.companies for select to authenticated using(id=public.get_my_company_id());
create policy "Admins can update own company" on public.companies for update to authenticated using(id=public.get_my_company_id() and public.has_role(auth.uid(),'admin'));
create policy "Platform admins can create companies" on public.companies for insert to authenticated with check(public.is_platform_admin(auth.uid()));
create policy "Platform admins can read all companies" on public.companies for select to authenticated using(public.is_platform_admin(auth.uid()));
create policy "Platform admins can update companies" on public.companies for update to authenticated using(public.is_platform_admin(auth.uid()));
alter table public.customers enable row level security;
create policy customers_own on public.customers to authenticated using(company_id=public.get_my_company_id());
alter table public.customer_access_tokens enable row level security;
alter table public.booking_requests enable row level security;
create policy "Admins full access on booking_requests" on public.booking_requests to authenticated using(company_id=public.get_my_company_id() and public.has_role(auth.uid(),'admin'));
create policy "Anon can create booking requests" on public.booking_requests for insert to anon with check(true);
create policy "Public can create booking requests" on public.booking_requests for insert to anon,authenticated with check(true);
alter table public.notification_outbox enable row level security;
create policy "Public can enqueue booking notifications" on public.notification_outbox for insert to anon,authenticated with check(true);
create policy "Company users can read notification outbox" on public.notification_outbox for select to authenticated using(company_id is null or company_id=public.get_my_company_id());
alter table storage.objects enable row level security;
create policy "Authenticated can read booking attachments" on storage.objects for select to authenticated using(bucket_id='booking-attachments');
alter table public.driver_documents enable row level security;
create policy "Company members manage driver documents" on public.driver_documents to authenticated using(company_id=public.get_my_company_id());
alter table public.vehicle_maintenance enable row level security;
create policy "Company members manage vehicle maintenance" on public.vehicle_maintenance to authenticated using(company_id=public.get_my_company_id());
`);
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const A=uuid(1), B=uuid(2), admin=uuid(11), driver=uuid(12), otherDriver=uuid(13), outsider=uuid(14), recipient=uuid(15), fresh=uuid(16), unverified=uuid(17), platform=uuid(18), customerA=uuid(21), customerB=uuid(22), vehicleA=uuid(31), requestA=uuid(41), requestB=uuid(42), invite=uuid(51), expired=uuid(52);
await db.query('insert into companies(id,name) values($1,$2),($3,$4)',[A,'A',B,'B']);
for (const [id,email,company,role,confirmed] of [
  [admin,'admin@a.se',A,'admin',true], [driver,'driver@a.se',A,'driver',true], [otherDriver,'other@a.se',A,'driver',true],
  [outsider,'driver@b.se',B,'driver',true], [recipient,'invite@a.se',null,'driver',true], [fresh,'fresh@a.se',null,'driver',true],
  [unverified,'unverified@a.se',null,'driver',false], [platform,'platform@a.se',null,'driver',true],
]) {
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[id,email,confirmed ? new Date().toISOString() : null]);
  await db.query('insert into profiles(id,email,full_name,company_id,role) values($1,$2,$2,$3,$4)',[id,email,company,role]);
  if(company) await db.query('insert into user_roles(user_id,role,company_id) values($1,$2,$3)',[id,role,company]);
}
await db.query('insert into platform_admins(user_id) values($1)',[platform]);
await db.query('insert into customers(id,company_id,name,email) values($1,$2,$3,$4),($5,$6,$7,$8)',[customerA,A,'Customer A','a@example.se',customerB,B,'Customer B','b@example.se']);
await db.query('insert into customer_access_tokens(customer_id,company_id,token) values($1,$2,$3),($4,$5,$6)',[customerA,A,'valid-token-a',customerB,A,'legacy-forged']);
await db.query('insert into portal_messages(customer_id,company_id,message) values($1,$2,$3),($1,$4,$5),($6,$4,$7)',[customerA,A,'A message',B,'legacy cross message',customerB,'B private message']);
await db.query('insert into booking_requests(company_id,public_request_id) values($1,$2),($3,$4)',[A,requestA,B,requestB]);
await db.query('insert into storage.objects(bucket_id,name) values($1,$2),($1,$3)', ['booking-attachments',`public/${requestA}/photo.png`,`public/${requestB}/photo.png`]);
await db.query('insert into notification_outbox(company_id,payload) values($1,$2),($3,$4),(null,$5)',[A,{private:'A'},B,{private:'B'},{private:'legacy'}]);
await db.query('insert into driver_documents(company_id,driver_id,notes) values($1,$2,$3),($1,$4,$5)',[A,driver,'mine',otherDriver,'colleague']);
await db.query('insert into vehicles(id,company_id) values($1,$2)',[vehicleA,A]);
await db.query('insert into vehicle_maintenance(company_id,vehicle_id,notes) values($1,$2,$3)',[A,vehicleA,'maintenance']);
await db.query('insert into invitations(token,company_id,email,created_at) values($1,$2,$3,now()),($4,$2,$3,now()-interval \'30 days\')',[invite,A,'invite@a.se',expired]);
for (const filename of ['20260908120643_driver_workflow_atomicity.sql','20260908131323_durable_transport_notifications.sql','20260908132142_launch_tenant_security.sql','20260908145027_notification_cron_secret_verifier.sql']) {
  await db.exec(await readFile(`supabase/migrations/${filename}`,'utf8'));
}
let checks=0;
async function actor(role,id,fn) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id ?? '']);
    const value=await fn(); await db.exec('commit'); return value;
  } catch(error) { await db.exec('rollback'); throw error; }
}
async function denied(label,role,id,sql,params=[]) {
  let error;
  try { await actor(role,id,()=>db.query(sql,params)); } catch(e) { error=e; }
  assert.ok(error,label+' must be denied'); checks++; console.log('PASS '+label);
}
async function check(label,fn) { await fn(); checks++; console.log('PASS '+label); }
await denied('anonymous registration','anon',null,'select complete_company_registration($1)', ['Example']);
await denied('unverified email registration','authenticated',unverified,'select complete_company_registration($1)',['Example']);
await denied('direct paid company creation','authenticated',fresh,"insert into companies(name,subscription_status) values('Evil','active')");
await check('verified registration is atomic and idempotent', async()=>{
  const register=()=>actor('authenticated',fresh,()=>db.query('select complete_company_registration($1,$2,$3,$4) id',['New company',null,'New Admin','0701234567']));
  const first=(await register()).rows[0].id, again=(await register()).rows[0].id; assert.equal(first,again);
  const {rows}=await db.query('select c.subscription_status,p.role,r.role membership from companies c join profiles p on p.company_id=c.id join user_roles r on r.user_id=p.id and r.company_id=c.id where p.id=$1',[fresh]);
  assert.deepEqual(rows,[{subscription_status:'trialing',role:'admin',membership:'admin'}]);
});
await check('registration rolls back company creation when membership write fails',async()=>{
 const failing=uuid(19); await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[failing,'rollback@example.se']);
 await db.query('insert into profiles(id,email,full_name) values($1,$2,$3)',[failing,'rollback@example.se','Rollback']);
 const before=(await db.query('select count(*)::int n from companies')).rows[0].n;
 await db.exec(`create function public.reject_test_membership() returns trigger language plpgsql as $$ begin if new.user_id='${failing}'::uuid then raise exception 'injected write failure'; end if; return new; end $$; create trigger reject_test_membership before insert on user_roles for each row execute function public.reject_test_membership();`);
 await denied('failed membership aborts registration','authenticated',failing,'select complete_company_registration($1)',['Must roll back']);
 assert.equal((await db.query('select count(*)::int n from companies')).rows[0].n,before);
 assert.equal((await db.query('select company_id from profiles where id=$1',[failing])).rows[0].company_id,null);
 await db.exec('drop trigger reject_test_membership on user_roles; drop function reject_test_membership();');
});
await denied('legacy registration RPC','authenticated',fresh,'select register_company($1,$2,$3)',['Legacy',null,null]);
await denied('invitation cannot target another user','authenticated',recipient,'select accept_invitation($1,$2)',[invite,admin]);
await denied('invitation requires recipient email','authenticated',admin,'select accept_invitation($1,$2)',[invite,admin]);
await denied('expired invitation RPC','authenticated',recipient,'select accept_invitation($1,$2)',[expired,recipient]);
await check('invitation cannot transfer an existing tenant member',async()=>{
  const token=uuid(53); await db.query('insert into invitations(token,company_id,email) values($1,$2,$3)',[token,A,'driver@b.se']);
  await denied('cross tenant invitation','authenticated',outsider,'select accept_invitation($1,$2)',[token,outsider]);
  assert.equal((await db.query('select company_id from profiles where id=$1',[outsider])).rows[0].company_id,B);
});
await check('correct recipient joins once and retry succeeds',async()=>{
  await actor('authenticated',recipient,()=>db.query('select accept_invitation($1,$2)',[invite,recipient]));
  await actor('authenticated',recipient,()=>db.query('select accept_invitation($1,$2)',[invite,recipient]));
  assert.equal((await db.query('select accepted_by from invitations where token=$1',[invite])).rows[0].accepted_by,recipient);
});
await denied('admin cannot self-enable paid billing','authenticated',admin,"update companies set subscription_status='active' where id=$1",[A]);
await denied('admin cannot forge Stripe ordering fields','authenticated',admin,"update companies set stripe_event_created=999 where id=$1",[A]);
await check('ordinary company edits remain usable',async()=>{assert.equal((await actor('authenticated',admin,()=>db.query('update companies set name=$1 where id=$2 returning id',['Updated A',A]))).rows.length,1);});
await check('billing service and platform admin can update billing',async()=>{
 await actor('service_role',null,()=>db.query("update companies set subscription_status='active',stripe_event_created=123 where id=$1",[A]));
 assert.equal((await actor('authenticated',platform,()=>db.query("update companies set subscription_status='active' where id=$1 returning id",[B]))).rows.length,1);
});
await denied('admin cannot mint token for another customer tenant','authenticated',admin,'insert into customer_access_tokens(customer_id,company_id,token) values($1,$2,$3)',[customerB,A,'forged']);
await denied('legacy mismatched token cannot read portal','anon',null,'select get_portal_messages($1)',['legacy-forged']);
await check('valid customer token sees only its company messages',async()=>{
 const result=await actor('anon',null,()=>db.query('select message from get_portal_messages($1)',['valid-token-a']));
 assert.deepEqual(result.rows,[{message:'A message'}]);
});
await check('valid portal message uses authenticated token identity',async()=>{
 await actor('anon',null,()=>db.query('select send_portal_message($1,$2,$3)',['valid-token-a','Hello','Impersonated']));
 const row=(await db.query("select sender_name,company_id from portal_messages where message='Hello'")).rows[0];
 assert.deepEqual(row,{sender_name:'Customer A',company_id:A});
});
await check('only company admin can read its outbox and booking files',async()=>{
 assert.equal((await db.query("select public from storage.buckets where id='booking-attachments'")).rows[0].public,false);
 const inbox=await actor('authenticated',admin,()=>db.query('select payload from notification_outbox where event_key is null')); assert.deepEqual(inbox.rows,[{payload:{private:'A'}}]);
 const files=await actor('authenticated',admin,()=>db.query('select name from storage.objects')); assert.deepEqual(files.rows,[{name:`public/${requestA}/photo.png`}]);
 assert.equal((await actor('authenticated',driver,()=>db.query('select * from notification_outbox'))).rows.length,0);
 assert.equal((await actor('authenticated',driver,()=>db.query('select * from storage.objects'))).rows.length,0);
});
await denied('anon cannot enqueue raw mail','anon',null,"insert into notification_outbox(payload,event_key) values('{\"mail\":{}}','abuse')");
await denied('admin cannot enqueue raw mail','authenticated',admin,"insert into notification_outbox(company_id,payload,event_key) values($1,'{\"mail\":{}}','abuse')",[A]);
await denied('admin cannot modify outbox payload','authenticated',admin,"update notification_outbox set payload='{}'");
await denied('admin cannot delete outbox audit records','authenticated',admin,'delete from notification_outbox');
await denied('anon booking cannot bypass Edge validation','anon',null,"insert into booking_requests(company_id,title) values($1,'bypass')",[A]);
await denied('authenticated booking cannot target foreign company','authenticated',admin,"insert into booking_requests(company_id,title) values($1,'bypass')",[B]);
await denied('request UUID cannot be reused across tenants','service_role',null,'insert into booking_requests(company_id,public_request_id) values($1,$2)',[B,requestA]);
await check('driver cannot view others or change compliance records',async()=>{
 const docs=await actor('authenticated',driver,()=>db.query('select notes from driver_documents')); assert.deepEqual(docs.rows,[{notes:'mine'}]);
 assert.equal((await actor('authenticated',driver,()=>db.query("update driver_documents set notes='tamper' returning id"))).rows.length,0);
 assert.equal((await actor('authenticated',driver,()=>db.query('delete from vehicle_maintenance returning id'))).rows.length,0);
});
await check('company admins can manage compliance records',async()=>{
 assert.equal((await actor('authenticated',admin,()=>db.query("update driver_documents set notes='reviewed' returning id"))).rows.length,2);
 assert.equal((await actor('authenticated',admin,()=>db.query("update vehicle_maintenance set notes='reviewed' returning id"))).rows.length,1);
});

const job=uuid(61), emptyJob=uuid(62), booked=uuid(63);
await check('unassigned customerless jobs do not break notification trigger',async()=>{
 await db.query('insert into assignments(id,company_id,title) values($1,$2,$3)',[emptyJob,A,'Not assigned']);
 assert.equal((await db.query('select * from notification_outbox where payload->>\'assignmentId\'=$1',[emptyJob])).rows.length,0);
});
await check('assignment notifications snapshot recipients and enqueue start/completion once',async()=>{
 await db.query('insert into assignments(id,company_id,customer_id,assigned_driver_id,title,status) values($1,$2,$3,$4,$5,$6)',[job,A,customerA,driver,'Transport snapshot','pending']);
 await db.query("update assignments set status='active',actual_start=now()-interval '1 hour' where id=$1",[job]);
 await db.query("update assignments set status='active' where id=$1",[job]);
 await db.query("update assignments set status='completed',actual_stop=now() where id=$1",[job]);
 await db.query("update assignments set status='completed' where id=$1",[job]);
 const events=(await db.query("select type,recipient_email,payload->>'title' title from notification_outbox where payload->>'assignmentId'=$1 order by type",[job])).rows;
 assert.deepEqual(events,[
  {type:'assignment-confirmation',recipient_email:'driver@a.se',title:'Transport snapshot'},
  {type:'delivery-completed',recipient_email:'a@example.se',title:'Transport snapshot'},
  {type:'tracking-started',recipient_email:'a@example.se',title:'Transport snapshot'},
 ]);
 await db.query("update assignments set title='Changed afterwards' where id=$1",[job]);
 assert.equal((await db.query("select count(*)::int n from notification_outbox where payload->>'assignmentId'=$1 and payload->>'title'='Transport snapshot'",[job])).rows[0].n,3);
});
await check('booking creates tenant-bound admin and customer notifications',async()=>{
 await actor('service_role',null,()=>db.query('insert into booking_requests(id,company_id,public_request_id,public_order_number,customer_name,customer_email,title) values($1,$2,$3,$4,$5,$6,$7)',[booked,A,uuid(64),'AT-TEST','Requester','requester@example.se','Booking']));
 const rows=(await db.query("select company_id,recipient_email from notification_outbox where event_key in ($1,$2) order by recipient_email",[`booking-admin/${booked}`,`booking-customer/${booked}`])).rows;
 assert.deepEqual(rows,[{company_id:A,recipient_email:'admin@a.se'},{company_id:A,recipient_email:'requester@example.se'}]);
});
await check('both seeded demo companies suppress assignment, booking and portal emails',async()=>{
 for (const [index,org] of ['556000-0001','556000-0002'].entries()) {
  await db.query('update companies set org_nr=$1 where id=$2',[org,A]);
  const before=(await db.query('select count(*)::int n from notification_outbox')).rows[0].n;
  const demoJob=uuid(71+index*10);
  await db.query('insert into assignments(id,company_id,customer_id,assigned_driver_id,title) values($1,$2,$3,$4,$5)',[demoJob,A,customerA,driver,'Demo must stay silent']);
  await db.query("update assignments set status='active',actual_start=now() where id=$1",[demoJob]);
  await db.query("update assignments set status='completed',actual_stop=now() where id=$1",[demoJob]);
  await db.query('insert into booking_requests(company_id,customer_name,customer_email,title) values($1,$2,$3,$4)',[A,'Demo','real-domain@example.se','Demo booking']);
  await db.query("insert into portal_messages(company_id,customer_id,sender_type,message) values($1,$2,'customer','Demo message')",[A,customerA]);
  assert.equal((await db.query('select count(*)::int n from notification_outbox')).rows[0].n,before);
 }
 await db.query('update companies set org_nr=null where id=$1',[A]);
});
await denied('clients cannot claim notification work','authenticated',admin,'select claim_notification_emails($1,$2)',[A,5]);
await check('claim excludes legacy data and immediate retry while preserving other tenants',async()=>{
 const foreign=uuid(65); await db.query("insert into notification_outbox(id,company_id,channel,type,event_key,payload) values($1,$2,'email','test','foreign-event','{}')",[foreign,B]);
 const first=await actor('service_role',null,()=>db.query('select id,company_id,event_key,attempts from claim_notification_emails($1,$2)',[A,5]));
 assert.ok(first.rows.length>0 && first.rows.length<=5); assert.ok(first.rows.every(x=>x.company_id===A && x.event_key && x.attempts===1));
 const second=await actor('service_role',null,()=>db.query('select id from claim_notification_emails($1,$2)',[A,5]));
 assert.ok(second.rows.every(x=>!first.rows.some(y=>y.id===x.id)));
 assert.equal((await db.query('select attempts from notification_outbox where id=$1',[foreign])).rows[0].attempts,0);
});
await check('mail limiter enforces quota and reopens only after its window',async()=>{
 const consume=()=>actor('service_role',null,()=>db.query('select consume_mail_rate_limit($1,$2,$3) allowed',['test/security',2,60]));
 assert.equal((await consume()).rows[0].allowed,true); assert.equal((await consume()).rows[0].allowed,true); assert.equal((await consume()).rows[0].allowed,false);
 await db.exec("update mail_rate_limits set window_started_at=now()-interval '2 minutes' where key='test/security'");
 assert.equal((await consume()).rows[0].allowed,true);
});
await denied('public callers cannot inspect auth identities','anon',null,'select find_auth_user_for_mail($1)',['admin@a.se']);
await denied('authenticated callers cannot reset mail limiter','authenticated',admin,'select consume_mail_rate_limit($1,$2,$3)',['test/security',100,1]);

// Vault is private, and these are disposable fixtures, never live credentials.
const cronSecret='test-only-cron-credential-'.repeat(3);
const verifyCronSecret=secret=>actor('service_role',null,()=>db.query('select public.validate_notification_cron_secret($1) valid',[secret]));
await check('cron verifier returns false when Vault is not installed',async()=>{
 assert.equal((await verifyCronSecret(cronSecret)).rows[0].valid,false);
});
await db.exec('create schema vault; create table vault.decrypted_secrets(name text primary key,decrypted_secret text);');
await check('cron verifier requires the named Vault secret',async()=>{
 await db.query('insert into vault.decrypted_secrets(name,decrypted_secret) values($1,$2)',['unrelated_secret',cronSecret]);
 assert.equal((await verifyCronSecret(cronSecret)).rows[0].valid,false);
 await db.query('insert into vault.decrypted_secrets(name,decrypted_secret) values($1,null)',['aurora_notification_cron_secret']);
 assert.equal((await verifyCronSecret(cronSecret)).rows[0].valid,false);
});
await db.query('update vault.decrypted_secrets set decrypted_secret=$1 where name=$2',[cronSecret,'aurora_notification_cron_secret']);
await check('service role can verify the exact cron secret only',async()=>{
 assert.equal((await verifyCronSecret(cronSecret)).rows[0].valid,true);
 assert.equal((await verifyCronSecret(cronSecret.slice(0,-1)+'X')).rows[0].valid,false);
 assert.equal((await verifyCronSecret(cronSecret+' ')).rows[0].valid,false);
});
await denied('anonymous caller cannot execute cron verifier','anon',null,'select public.validate_notification_cron_secret($1)',[cronSecret]);
await denied('authenticated caller cannot execute cron verifier','authenticated',admin,'select public.validate_notification_cron_secret($1)',[cronSecret]);
await denied('platform admin cannot execute cron verifier','authenticated',platform,'select public.validate_notification_cron_secret($1)',[cronSecret]);
await denied('service role cannot directly read Vault secrets','service_role',null,'select decrypted_secret from vault.decrypted_secrets');
await check('cron verifier enforces inclusive 32 to 256 character bounds',async()=>{
 assert.equal((await verifyCronSecret(null)).rows[0].valid,false);
 for (const length of [0,31,32,256,257]) {
  const fixture='a'.repeat(length);
  await db.query('update vault.decrypted_secrets set decrypted_secret=$1 where name=$2',[fixture,'aurora_notification_cron_secret']);
  assert.equal((await verifyCronSecret(fixture)).rows[0].valid,length>=32 && length<=256);
 }
});
await check('cron verifier returns false after the named secret or Vault table is removed',async()=>{
 await db.query('delete from vault.decrypted_secrets where name=$1',['aurora_notification_cron_secret']);
 assert.equal((await verifyCronSecret(cronSecret)).rows[0].valid,false);
 await db.exec('drop table vault.decrypted_secrets');
 assert.equal((await verifyCronSecret(cronSecret)).rows[0].valid,false);
});
const { default: driverChecks }=await import('./driver-integration.mjs');
checks+=await driverChecks(db);
await db.close();
console.log(`${checks} launch security and notification PostgreSQL checks passed.`);
