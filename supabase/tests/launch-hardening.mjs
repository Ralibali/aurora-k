import assert from 'node:assert/strict';
export default async function hardening(db, actor) {
 const id=n=>`e1000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const uid=id(1), demo=id(2), other=id(3), customer=id(4);
 let checks=0;
 const check=async(label,fn)=>{await fn();checks++;console.log('PASS hardening '+label);};
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[uid,'legal@example.invalid']);
 await db.query('insert into profiles(id,email) values($1,$2)',[uid,'legal@example.invalid']);
 const register=versions=>actor('authenticated',uid,()=>db.query('select complete_company_registration($1,$2,$3,$4,$5,$6) id',['Legal company',null,'Admin',null,...versions]));
 await check('registration requires current versions and stores immutable server evidence',async()=>{
  await assert.rejects(register([null,null]),/aktuella/);
  await assert.rejects(register(['old','2026-09-23']),/aktuella/);
  const company=(await register(['2026-09-23','2026-09-23'])).rows[0].id;
  const {rows}=await db.query('select terms_version,dpa_version,legal_accepted_at,legal_accepted_by from companies where id=$1',[company]);
  assert.equal(rows[0].terms_version,'2026-09-23');assert.equal(rows[0].dpa_version,'2026-09-23');assert.equal(rows[0].legal_accepted_by,uid);assert.ok(rows[0].legal_accepted_at);
  await assert.rejects(actor('authenticated',uid,()=>db.query("update companies set terms_version='fake' where id=$1",[company])),/Avtalsgodkännande/);
  assert.equal((await register(['2026-09-23','2026-09-23'])).rows[0].id,company);
 });
 await db.query("insert into companies(id,name,org_nr) values($1,'Demo','556000-0001'),($2,'Real',null)",[demo,other]);
 await db.query('insert into customers(id,company_id,name) values($1,$2,$3)',[customer,demo,'Demo customer']);
 await check('both demo identifiers and all public channel writes are blocked',async()=>{
  assert.equal((await db.query('select is_demo_company($1) value',[demo])).rows[0].value,true);
  assert.equal((await db.query('select is_demo_company($1) value',[other])).rows[0].value,false);
  for(const column of ['name','org_nr','public_booking_slug']) await assert.rejects(db.query(`update companies set ${column}='changed' where id=$1`,[demo]),/identitet/);
  for(const table of ['booking_requests','order_inbox_channels']) await assert.rejects(db.query(`insert into ${table}(company_id) values($1)`,[demo]),/demoföretag/);
  await assert.rejects(db.query('insert into customer_access_tokens(company_id,customer_id,token) values($1,$2,$3)',[demo,customer,'demo-token']),/demoföretag/);
 });
 await check('booking bucket allows exactly 10 MiB and supported types',async()=>{
  const row=(await db.query("select file_size_limit,allowed_mime_types from storage.buckets where id='booking-attachments'")).rows[0];
  assert.equal(Number(row.file_size_limit),10485760);assert.deepEqual(row.allowed_mime_types,['image/jpeg','image/png','image/webp','image/heic','application/pdf']);
 });
 await check('proof conversion supports signed/public legacy URLs and rejects unrelated values',async()=>{
  for(const mode of ['sign','public']) assert.equal((await db.query('select proof_storage_path($1) path',[`https://project.supabase.co/storage/v1/object/${mode}/signatures/user/proof.png?token=expired`])).rows[0].path,'signatures/user/proof.png');
  assert.equal((await db.query("select proof_storage_path('https://unrelated/photo') path")).rows[0].path,null);
 });
 await check('nightly reset discovers tenant tables, preserves identity and other tenants',async()=>{
  await db.exec('create table public.reset_fixture(id uuid default gen_random_uuid(),company_id uuid references companies);');
  await db.query('insert into reset_fixture(company_id) values($1),($2)',[demo,other]);
  await db.query('insert into settings(company_id,email) values($1,$2)',[demo,'demo@example.invalid']);
  await assert.rejects(actor('authenticated',uid,()=>db.query('select reset_demo_companies()')),/permission denied/);
  await db.query('select reset_demo_companies()');
  assert.deepEqual((await db.query('select company_id from reset_fixture')).rows,[{company_id:other}]);
  assert.equal((await db.query('select count(*)::int n from customers where company_id=$1',[demo])).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from companies where id=$1',[demo])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from settings where company_id=$1',[demo])).rows[0].n,1);
 });
 return checks;
}
