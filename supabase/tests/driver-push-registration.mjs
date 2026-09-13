// Real PostgreSQL/RLS in a disposable PGlite database; only synthetic credentials.
// No network, production data or notifications. Run: node supabase/tests/driver-push-registration.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = n => `d0010000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const companyA = id(1), companyB = id(2);
const driverA = id(11), driverB = id(12), admin = id(13), noRole = id(14), noCompany = id(15), staleRole = id(16);
const sharedToken = 'AB'.repeat(32);
const otherDevice = 'CD'.repeat(32);
let checks = 0;

async function check(name, run) { await run(); console.log(`PASS ${++checks} ${name}`); }
async function actor(role, userId, run) {
  assert.ok(['authenticated', 'anon'].includes(role));
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? '']);
    return run(tx);
  });
}
const call = (tx, token, platform = 'ios') => tx.query('select public.register_driver_push_token($1, $2)', [token, platform]);
const register = (userId, token, platform = 'ios', role = 'authenticated') => actor(role, userId, tx => call(tx, token, platform));
const denied = (run, code = '42501') => assert.rejects(run, error => error.code === code);
const tokenRow = async token => (await db.query('select id, user_id, token, platform, updated_at from public.driver_push_tokens where token = $1', [token])).rows[0];

try {
  await db.exec(`
    create role anon nologin nobypassrls;
    create role authenticated nologin nobypassrls;
    create schema auth;
    create type public.app_role as enum ('admin', 'driver');
    create table auth.users(id uuid primary key);
    create table public.companies(id uuid primary key);
    create table public.profiles(id uuid primary key references auth.users, company_id uuid references public.companies);
    create table public.user_roles(user_id uuid references auth.users, role public.app_role, company_id uuid references public.companies);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated;
    alter table public.user_roles enable row level security;
    alter table public.profiles enable row level security;
  `);
  const tenancy = await readFile(new URL('../migrations/20260403125600_067e9947-24a0-4b59-91a3-0bb387c5489d.sql', import.meta.url), 'utf8');
  const companyHelper = tenancy.match(/CREATE OR REPLACE FUNCTION public\.get_my_company_id\(\)[\s\S]*?\$\$;/);
  assert.ok(companyHelper, 'the existing company helper must be loaded');
  await db.exec(companyHelper[0]);
  for (const name of [
    '20260404130722_7b1a7e1d-11bb-4b3c-994b-d40d08a46509.sql',
    '20260704090000_driver_push_tokens.sql',
    '20260913200132_driver_push_tokens_select_own.sql',
  ]) await db.exec(await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  // Explicit table privileges ensure denials test RLS, not absent grants.
  await db.exec('grant select, insert, update, delete on public.driver_push_tokens to anon, authenticated');
  await db.query('insert into public.companies values ($1), ($2)', [companyA, companyB]);
  for (const [userId, companyId, role, roleCompany] of [
    [driverA, companyA, 'driver', companyA], [driverB, companyB, 'driver', companyB],
    [admin, companyA, 'admin', companyA], [noRole, companyA, null, null],
    [noCompany, null, 'driver', companyA], [staleRole, companyA, 'driver', companyB],
  ]) {
    await db.query('insert into auth.users values ($1)', [userId]);
    await db.query('insert into public.profiles values ($1, $2)', [userId, companyId]);
    if (role) await db.query('insert into public.user_roles values ($1, $2, $3)', [userId, role, roleCompany]);
  }
  for (const token of [sharedToken, otherDevice]) await db.query(`
    insert into public.driver_push_tokens(user_id, token, platform, updated_at)
    values ($1, $2, 'ios', '2020-01-01T00:00:00Z')
  `, [driverA, token]);

  await check('RLS is active and the original direct upsert cannot transfer a stale token', async () => {
    assert.deepEqual((await actor('authenticated', driverB, tx => tx.query(`
      select current_user::text as role, row_security_active('public.driver_push_tokens'::regclass) as rls
    `))).rows, [{ role: 'authenticated', rls: true }]);
    await denied(() => actor('authenticated', driverB, tx => tx.query(`
      insert into public.driver_push_tokens(user_id, token, platform) values ($1, $2, 'ios')
      on conflict(token) do update set user_id = excluded.user_id
    `, [driverB, sharedToken])));
    assert.equal((await tokenRow(sharedToken)).user_id, driverA);
  });

  const policiesBefore = (await db.query("select * from pg_policies where tablename = 'driver_push_tokens' order by policyname")).rows;
  const grantsBefore = (await db.query("select grantee, privilege_type from information_schema.role_table_grants where table_name = 'driver_push_tokens' order by grantee, privilege_type")).rows;
  await db.exec(await readFile(new URL('../migrations/20260913202631_register_driver_push_token.sql', import.meta.url), 'utf8'));

  await check('RPC access, private definer, void result and unchanged table permissions are narrow', async () => {
    for (const [schema, definer] of [['public', false], ['private', true]]) {
      const signature = `${schema}.register_driver_push_token(text,text)`;
      const { rows } = await db.query(`select
        has_function_privilege('anon', $1, 'execute') as anon,
        has_function_privilege('authenticated', $1, 'execute') as authenticated,
        p.prosecdef as definer, p.prorettype::regtype::text as result,
        p.proconfig as config, p.proargnames as args
        from pg_proc p where p.oid = $1::regprocedure`, [signature]);
      assert.deepEqual(rows, [{ anon: false, authenticated: true, definer, result: 'void', config: ['search_path=""'], args: ['p_token', 'p_platform'] }]);
    }
    assert.deepEqual((await db.query("select * from pg_policies where tablename = 'driver_push_tokens' order by policyname")).rows, policiesBefore);
    assert.deepEqual((await db.query("select grantee, privilege_type from information_schema.role_table_grants where table_name = 'driver_push_tokens' order by grantee, privilege_type")).rows, grantsBefore);
    assert.equal((await db.query("select has_schema_privilege('authenticated', 'private', 'create') as allowed")).rows[0].allowed, false);
  });

  await check('anonymous and non-driver identities cannot register or transfer a token', async () => {
    await denied(() => register(driverB, sharedToken, 'ios', 'anon'));
    await denied(() => actor('anon', driverB, tx => tx.query('select private.register_driver_push_token($1,$2)', [sharedToken, 'ios'])));
    for (const userId of [null, admin, noRole, noCompany, staleRole, id(999)]) await denied(() => register(userId, sharedToken));
    await denied(() => actor('authenticated', noRole, async tx => {
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ user_metadata: { role: 'driver', company_id: companyA } })]);
      return call(tx, sharedToken);
    }));
    assert.equal((await tokenRow(sharedToken)).user_id, driverA);
  });

  await check('another company driver transfers the same device atomically without seeing its previous owner', async () => {
    const before = await tokenRow(sharedToken);
    const untouched = await tokenRow(otherDevice);
    assert.deepEqual((await actor('authenticated', driverB, tx => tx.query('select token from public.driver_push_tokens'))).rows, []);
    const result = await register(driverB, sharedToken);
    assert.deepEqual(result.rows, [{ register_driver_push_token: null }]);
    const after = await tokenRow(sharedToken);
    assert.equal(after.id, before.id);
    assert.equal(after.user_id, driverB);
    assert.equal(after.platform, 'ios');
    assert.ok(after.updated_at > before.updated_at);
    assert.deepEqual(await tokenRow(otherDevice), untouched);
    assert.deepEqual((await actor('authenticated', driverA, tx => tx.query('select token from public.driver_push_tokens'))).rows, [{ token: otherDevice }]);
    assert.deepEqual((await actor('authenticated', driverB, tx => tx.query('select token from public.driver_push_tokens'))).rows, [{ token: sharedToken }]);
  });

  await check('late old-account cleanup and direct writes cannot affect the transferred device', async () => {
    for (const sql of [
      'delete from public.driver_push_tokens where user_id = $1 and token = $2 returning token',
      "update public.driver_push_tokens set platform = 'android' where user_id = $1 and token = $2 returning token",
    ]) assert.deepEqual((await actor('authenticated', driverA, tx => tx.query(sql, [driverA, sharedToken]))).rows, []);
    await denied(() => actor('authenticated', driverA, tx => tx.query(`
      insert into public.driver_push_tokens(user_id, token, platform) values ($1,$2,'ios')
      on conflict(token) do update set user_id = excluded.user_id
    `, [driverA, sharedToken])));
    assert.equal((await tokenRow(sharedToken)).user_id, driverB);
  });

  await check('repeat calls retain one row and rollback restores ownership without a missing-device gap', async () => {
    const before = await tokenRow(sharedToken);
    await register(driverB, sharedToken);
    assert.equal((await tokenRow(sharedToken)).id, before.id);
    await assert.rejects(() => actor('authenticated', driverA, async tx => {
      await call(tx, sharedToken);
      assert.equal((await tx.query('select count(*)::int as n from public.driver_push_tokens where token=$1', [sharedToken])).rows[0].n, 1);
      throw new Error('synthetic rollback');
    }), /synthetic rollback/);
    assert.equal((await tokenRow(sharedToken)).user_id, driverB);
    assert.equal((await tokenRow(sharedToken)).id, before.id);
  });

  await check('APNs variable byte lengths work and lowercase hex maps to the existing uppercase credential', async () => {
    await register(driverA, sharedToken.toLowerCase());
    assert.equal((await tokenRow(sharedToken)).user_id, driverA);
    assert.equal(await tokenRow(sharedToken.toLowerCase()), undefined);
    for (const bytes of [1, 16, 32, 64, 128, 1024]) await register(driverA, 'EF'.repeat(bytes));
    for (const invalid of ['abc', 'zz'.repeat(32), 'AA:BB']) await denied(() => register(driverA, invalid), '22023');
  });

  await check('opaque FCM values retain case and punctuation without fixed historic token lengths', async () => {
    for (const length of [22, 152, 163, 512, 2048]) {
      const token = 'Abc:DeF_-'.repeat(Math.ceil(length / 9)).slice(0, length);
      await register(driverB, token, 'android');
      assert.equal((await tokenRow(token)).token, token);
      assert.equal((await tokenRow(token)).platform, 'android');
    }
  });

  await check('invalid platform, blank/control input and oversized tokens never change ownership', async () => {
    const before = await tokenRow(sharedToken);
    for (const platform of [null, '', 'web', 'IOS', 'ios;delete']) await denied(() => register(driverB, sharedToken, platform), '22023');
    for (const token of [null, '', ' ', '\n', 'abc def', 'abc\tdef', 'abc\u0001def', 'x'.repeat(2049), 'ø'.repeat(1025)]) {
      await denied(() => register(driverB, token, 'android'), '22023');
    }
    assert.deepEqual(await tokenRow(sharedToken), before);
  });

  await check('a role revoked in the database takes effect without trusting prior session metadata', async () => {
    await db.query('delete from public.user_roles where user_id=$1', [driverB]);
    await denied(() => register(driverB, sharedToken));
    await db.query("insert into public.user_roles values ($1, 'driver', $2)", [driverB, companyB]);
  });

  await check('overlapping client requests serialize with one token row and the final completed owner', async () => {
    // PGlite queues its single connection's transactions. This verifies complete
    // transaction boundaries and uniqueness, not a multi-connection stress test.
    // Production concurrency uses PostgreSQL's atomic ON CONFLICT DO UPDATE.
    const completions = [];
    await Promise.all([driverB, driverA, driverB].map(userId =>
      register(userId, sharedToken).then(() => { completions.push(userId); })));
    assert.equal((await db.query('select count(*)::int as n from public.driver_push_tokens where token=$1', [sharedToken])).rows[0].n, 1);
    assert.equal((await tokenRow(sharedToken)).user_id, completions.at(-1));
  });

  console.log(`Passed ${checks} driver push registration checks.`);
} finally {
  await db.close();
}
