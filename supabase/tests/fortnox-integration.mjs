// Real PostgreSQL checks with a test-only Vault implementation. No external APIs.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE ?? 'node_modules/@electric-sql/pglite/dist/index.js')).href);
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema vault;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.companies(id uuid primary key);
create table public.customers(id uuid primary key);
create table public.invoices(id uuid primary key);
create table public.user_roles(user_id uuid,company_id uuid,role text);
create table vault.secrets(id uuid primary key default gen_random_uuid(),name text unique,secret text,decrypted_secret text);
create view vault.decrypted_secrets as select * from vault.secrets;
create function vault.create_secret(value text,label text) returns uuid language sql as $$ insert into vault.secrets(name,secret,decrypted_secret) values(label,'ciphertext',value) returning id $$;
create function vault.update_secret(secret_id uuid,value text) returns void language sql as $$ update vault.secrets set decrypted_secret=value where id=secret_id $$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant select on public.user_roles to authenticated;
`);
const original = await readFile('supabase/migrations/20260626150000_fortnox_oauth.sql','utf8');
await db.exec(original.replace(/^create extension.*;\n/gm,''));
await db.exec(await readFile('supabase/migrations/20260908153113_fortnox_connection_workflow.sql','utf8'));
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const company=id(1), other=id(2), admin=id(3), owner=id(4), next=id(5), invoice=id(6);
await db.query('insert into companies values($1),($2)',[company,other]);
await db.query('insert into auth.users values($1)',[admin]);
await db.query('insert into invoices values($1)',[invoice]);
await db.query("insert into user_roles values($1,$2,'admin')",[admin,company]);
let checks=0;
async function as(role,sql,args=[]) {
  await db.exec(`set role ${role}`);
  try { return await db.query(sql,args); } finally { await db.exec('reset role'); }
}
async function check(name,fn) { await fn(); checks++; console.log(`ok ${checks} - ${name}`); }
await check('only service role can store tokens',async()=>{
 for(const role of ['anon','authenticated']) await assert.rejects(()=>as(role,'select store_fortnox_tokens($1,$2,$3,$4,now(),$5)',[company,admin,'access','refresh',['invoice']]));
 await as('service_role','select store_fortnox_tokens($1,$2,$3,$4,now(),$5)',[company,admin,'access','refresh',['invoice']]);
});
await check('token reader returns decrypted credentials rather than ciphertext',async()=>{
 const {rows}=await as('service_role','select * from read_fortnox_tokens($1)',[company]);
 assert.equal(rows[0].access_token,'access'); assert.equal(rows[0].refresh_token,'refresh');
 assert.equal((await as('service_role','select * from read_fortnox_tokens($1)',[other])).rows.length,0);
});
await check('credentials, state and operation leases cannot be read by clients',async()=>{
 for(const role of ['anon','authenticated']) {
  await assert.rejects(()=>as(role,'select * from read_fortnox_tokens($1)',[company]));
  for(const table of ['fortnox_connections','fortnox_oauth_states','fortnox_operation_locks']) await assert.rejects(()=>as(role,`select * from ${table}`));
 }
});
await check('a second operation cannot refresh tokens concurrently',async()=>{
 assert.equal((await as('service_role','select claim_fortnox_operation($1,$2) as ok',[company,owner])).rows[0].ok,true);
 assert.equal((await as('service_role','select claim_fortnox_operation($1,$2) as ok',[company,next])).rows[0].ok,false);
 assert.equal((await as('service_role','select claim_fortnox_operation($1,$2) as ok',[other,next])).rows[0].ok,true);
 await assert.rejects(()=>as('authenticated','select claim_fortnox_operation($1,$2)',[company,next]));
});
await check('expired operation can be claimed without allowing stale release',async()=>{
 await db.query("update fortnox_operation_locks set expires_at=now()-interval '1 second' where company_id=$1",[company]);
 assert.equal((await as('service_role','select claim_fortnox_operation($1,$2) as ok',[company,next])).rows[0].ok,true);
 await as('service_role','delete from fortnox_operation_locks where company_id=$1 and owner=$2',[company,owner]);
 assert.equal((await db.query('select owner from fortnox_operation_locks where company_id=$1',[company])).rows[0].owner,next);
});
await check('OAuth state is bound to the admin and company, expiring and single use',async()=>{
 await as('service_role',"insert into fortnox_oauth_states(state_hash,company_id,user_id,expected_org_number,expires_at) values('hash',$1,$2,'5592720220',now()+interval '10 minutes')",[company,admin]);
 const consume=(tenant,user)=>as('service_role',"update fortnox_oauth_states set used_at=now() where state_hash='hash' and company_id=$1 and user_id=$2 and used_at is null and expires_at>now() returning id",[tenant,user]);
 assert.equal((await consume(other,admin)).rows.length,0);
 assert.equal((await consume(company,next)).rows.length,0);
 assert.equal((await consume(company,admin)).rows.length,1);
 assert.equal((await consume(company,admin)).rows.length,0);
});
await check('duplicate invoice exports violate a database constraint',async()=>{
 await as('service_role',"insert into fortnox_invoice_syncs(company_id,invoice_id,status) values($1,$2,'pending')",[company,invoice]);
 await assert.rejects(()=>as('service_role',"insert into fortnox_invoice_syncs(company_id,invoice_id,status) values($1,$2,'pending')",[company,invoice]));
});
await check('disconnect removes credentials and states while preserving export history',async()=>{
 await assert.rejects(()=>as('authenticated','select disconnect_fortnox($1)',[company]));
 await as('service_role','select disconnect_fortnox($1)',[company]);
 for(const table of ['fortnox_connections','fortnox_oauth_states']) assert.equal((await db.query(`select * from ${table} where company_id=$1`,[company])).rows.length,0);
 assert.equal((await db.query('select * from vault.secrets')).rows.length,0);
 assert.equal((await db.query('select * from fortnox_invoice_syncs')).rows.length,1);
});
await db.close();
console.log(`${checks} Fortnox PostgreSQL checks passed.`);
