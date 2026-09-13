// Disposable PostgreSQL/RLS checks using the real support table and RPC migrations.
// Run from repo root: node supabase/tests/driver-support.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE ?? 'node_modules/@electric-sql/pglite/dist/index.js')).href);
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const companyA = id(1), companyB = id(2), driver = id(11), colleague = id(12), outsider = id(13);
const adminA = id(14), adminB = id(15), platform = id(16), noRole = id(17), noCompany = id(18), staleRole = id(19);
const reportId = id(100);
let checks = 0;

async function actor(role, userId, sql, params = []) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? '']);
    const result = await db.query(sql, params);
    await db.exec('commit');
    return result;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}
const report = (userId, message, operationId, role = 'authenticated') =>
  actor(role, userId, 'select public.report_driver_support_ticket($1, $2) as id', [message, operationId]);
async function check(name, run) {
  await run();
  console.log(`ok ${++checks} - ${name}`);
}
async function denied(run, pattern) {
  await assert.rejects(run, pattern);
}

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create type public.app_role as enum ('admin', 'driver');
    create table auth.users (id uuid primary key);
    create table public.companies (id uuid primary key);
    create table public.profiles (id uuid primary key references auth.users, company_id uuid references public.companies);
    create table public.user_roles (user_id uuid references auth.users, role public.app_role, company_id uuid references public.companies);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function public.update_updated_at_column() returns trigger language plpgsql as $$
      begin new.updated_at = now(); return new; end
    $$;
    grant usage on schema public, auth to anon, authenticated;
    alter table public.companies enable row level security;
    alter table public.profiles enable row level security;
  `);
  const tenancy = await readFile('supabase/migrations/20260403125600_067e9947-24a0-4b59-91a3-0bb387c5489d.sql', 'utf8');
  const companyHelper = tenancy.match(/CREATE OR REPLACE FUNCTION public\.get_my_company_id\(\)[\s\S]*?\$\$;/);
  assert.ok(companyHelper, 'existing company helper must be loaded');
  await db.exec(companyHelper[0]);
  await db.exec(await readFile('supabase/migrations/20260404130722_7b1a7e1d-11bb-4b3c-994b-d40d08a46509.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20260404075825_dbc0dfab-f1e9-4e9d-93dd-45d92692d2ea.sql', 'utf8'));
  // Match existing Supabase client grants, so denials exercise real RLS policies.
  await db.exec('grant select, insert, update, delete on public.support_tickets to anon, authenticated');
  const policiesBefore = (await db.query("select * from pg_policies where tablename = 'support_tickets' order by policyname")).rows;
  await db.exec(await readFile('supabase/migrations/20260913201749_driver_support_report.sql', 'utf8'));

  await db.query('insert into public.companies values ($1), ($2)', [companyA, companyB]);
  for (const [userId, companyId, role, roleCompany] of [
    [driver, companyA, 'driver', companyA], [colleague, companyA, 'driver', companyA],
    [outsider, companyB, 'driver', companyB], [adminA, companyA, 'admin', companyA],
    [adminB, companyB, 'admin', companyB], [platform, null, null, null],
    [noRole, companyA, null, null], [noCompany, null, 'driver', companyA],
    [staleRole, companyA, 'driver', companyB],
  ]) {
    await db.query('insert into auth.users values ($1)', [userId]);
    await db.query('insert into public.profiles values ($1, $2)', [userId, companyId]);
    if (role) await db.query('insert into public.user_roles values ($1, $2, $3)', [userId, role, roleCompany]);
  }
  await db.query('insert into public.platform_admins (user_id) values ($1)', [platform]);

  await check('RPC privileges, return type, search path and existing policies stay narrow', async () => {
    const { rows } = await db.query(`select
      has_function_privilege('anon', 'public.report_driver_support_ticket(text,uuid)', 'execute') as anon,
      has_function_privilege('authenticated', 'public.report_driver_support_ticket(text,uuid)', 'execute') as authenticated,
      p.prorettype::regtype::text as result, p.prosecdef as definer, p.proconfig as config
      from pg_proc p where p.oid = 'public.report_driver_support_ticket(text,uuid)'::regprocedure`);
    assert.deepEqual(rows, [{ anon: false, authenticated: true, result: 'uuid', definer: true, config: ['search_path=""'] }]);
    assert.deepEqual((await db.query("select * from pg_policies where tablename = 'support_tickets' order by policyname")).rows, policiesBefore);
  });

  await check('anonymous, missing identity, absent role, absent company and foreign-company role are denied', async () => {
    await denied(() => report(null, 'Rapport', id(101), 'anon'), /permission denied/i);
    for (const userId of [null, noRole, noCompany, staleRole, adminA, platform]) {
      await denied(() => report(userId, 'Rapport', id(101)), /Logga in som förare/);
    }
    assert.equal((await db.query('select count(*)::int as n from support_tickets')).rows[0].n, 0);
  });

  await check('invalid text and missing operation key do not create tickets', async () => {
    for (const message of [null, '', '   ', '\n\t\r ', 'x'.repeat(3001)]) {
      await denied(() => report(driver, message, id(102)), /1–3000/);
    }
    await denied(() => report(driver, 'Rapport', null), /Öppna formuläret/);
    assert.equal((await db.query('select count(*)::int as n from support_tickets')).rows[0].n, 0);
  });

  await check('a driver submits without an assignment; ownership, subject and administrative fields are server-set', async () => {
    assert.deepEqual((await report(driver, '\n  En olämplig kommentar\t ', reportId)).rows, [{ id: reportId }]);
    assert.deepEqual((await db.query(`select company_id, created_by, subject, message, status, priority,
      admin_reply, replied_at, replied_by from support_tickets where id = $1`, [reportId])).rows, [{
      company_id: companyA, created_by: driver, subject: 'Rapport om innehåll eller användare',
      message: 'En olämplig kommentar', status: 'open', priority: 'normal',
      admin_reply: null, replied_at: null, replied_by: null,
    }]);
  });

  await check('trimmed lower and upper text boundaries are accepted', async () => {
    await report(driver, ' x ', id(103));
    await report(driver, `  ${'å'.repeat(3000)}\n`, id(104));
    assert.deepEqual((await db.query('select length(message) as n from support_tickets where id in ($1, $2) order by id', [id(103), id(104)])).rows, [{ n: 1 }, { n: 3000 }]);
  });

  await check('identical retries return only the original receipt and create one row', async () => {
    const before = (await db.query('select * from support_tickets where id = $1', [reportId])).rows;
    assert.deepEqual((await report(driver, ' En olämplig kommentar ', reportId)).rows, [{ id: reportId }]);
    assert.deepEqual((await db.query('select * from support_tickets where id = $1', [reportId])).rows, before);
  });

  await check('operation keys cannot replace content or refer to another user, company or support topic', async () => {
    const snapshot = (await db.query('select * from support_tickets order by id')).rows;
    for (const [userId, text] of [[driver, 'Ändrad rapport'], [colleague, 'En olämplig kommentar'], [outsider, 'En olämplig kommentar']]) {
      await denied(() => report(userId, text, reportId), /Sparningsnyckeln används redan/);
    }
    assert.deepEqual((await db.query('select * from support_tickets order by id')).rows, snapshot);
    await db.query('insert into support_tickets (id, company_id, created_by, subject, message) values ($1, $2, $3, $4, $5)', [id(105), companyA, driver, 'Annat supportärende', 'Samma text']);
    await denied(() => report(driver, 'Samma text', id(105)), /Sparningsnyckeln används redan/);
  });

  await check('drivers cannot read any support tickets, including their own or administrator replies', async () => {
    for (const userId of [driver, colleague, outsider]) {
      assert.deepEqual((await actor('authenticated', userId, 'select * from support_tickets')).rows, []);
    }
    assert.deepEqual((await actor('anon', null, 'select * from support_tickets')).rows, []);
  });

  await check('driver direct inserts, forged ownership and administrative-field writes remain blocked by RLS', async () => {
    for (const [companyId, creator] of [[companyA, driver], [companyB, driver], [companyA, colleague]]) {
      await denied(() => actor('authenticated', driver, `insert into support_tickets
        (id, company_id, created_by, subject, message, status, admin_reply, replied_by)
        values ($1, $2, $3, 'Rapport om innehåll eller användare', 'Forged', 'closed', 'Forged reply', $3)`,
      [id(106), companyId, creator]), /row-level security/i);
    }
    const before = (await db.query('select * from support_tickets where id = $1', [reportId])).rows;
    assert.deepEqual((await actor('authenticated', driver, "update support_tickets set status = 'closed', admin_reply = 'Forged' where id = $1 returning id", [reportId])).rows, []);
    assert.deepEqual((await actor('authenticated', driver, 'delete from support_tickets where id = $1 returning id', [reportId])).rows, []);
    assert.deepEqual((await db.query('select * from support_tickets where id = $1', [reportId])).rows, before);
  });

  await check('company and platform admins retain the existing support read and resolution workflow', async () => {
    await report(outsider, 'Rapport från annat företag', id(107));
    const own = (await actor('authenticated', adminA, 'select distinct company_id from support_tickets')).rows;
    assert.deepEqual(own, [{ company_id: companyA }]);
    assert.deepEqual((await actor('authenticated', adminB, 'select distinct company_id from support_tickets')).rows, [{ company_id: companyB }]);
    assert.equal((await actor('authenticated', platform, 'select distinct company_id from support_tickets')).rows.length, 2);
    assert.deepEqual((await actor('authenticated', adminB, "update support_tickets set status = 'closed' where id = $1 returning id", [reportId])).rows, []);
    assert.deepEqual((await actor('authenticated', adminA, "update support_tickets set status = 'answered', admin_reply = 'Vi undersöker', replied_by = $1, replied_at = now() where id = $2 returning id", [adminA, reportId])).rows, [{ id: reportId }]);
    assert.deepEqual((await actor('authenticated', platform, "update support_tickets set status = 'closed' where id = $1 returning id", [reportId])).rows, [{ id: reportId }]);
  });

  await check('retry after resolution preserves administrator fields and current access is rechecked', async () => {
    const before = (await db.query('select * from support_tickets where id = $1', [reportId])).rows;
    assert.deepEqual((await report(driver, 'En olämplig kommentar', reportId)).rows, [{ id: reportId }]);
    assert.deepEqual((await db.query('select * from support_tickets where id = $1', [reportId])).rows, before);
    await db.query('delete from user_roles where user_id = $1', [driver]);
    await denied(() => report(driver, 'En olämplig kommentar', reportId), /Logga in som förare/);
    assert.deepEqual((await db.query('select * from support_tickets where id = $1', [reportId])).rows, before);
  });

  console.log(`Driver support PostgreSQL/RLS checks passed: ${checks}`);
} finally {
  await db.close();
}
