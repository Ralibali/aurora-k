// Disposable PostgreSQL checks with the real profile/membership policies and guard.
// Run from repo root: node supabase/tests/profile-authorization.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE ?? 'node_modules/@electric-sql/pglite/dist/index.js')).href);
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const A = id(1), B = id(2), admin = id(11), driver = id(12), colleague = id(13);
const foreignAdmin = id(14), platform = id(15), fresh = id(16), noMembership = id(17);
const orphanDriver = id(18), orphanAdmin = id(19), orphanForeign = id(20), created = id(21);
const migration = '20260913204221_protect_profile_authorization.sql';
let checks = 0;

const source = name => readFile(`supabase/migrations/${name}`, 'utf8');
async function actor(role, userId, run) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? '']);
    return await run();
  } finally {
    await db.exec('rollback');
  }
}
const client = (userId, sql, params = []) => actor('authenticated', userId, () => db.query(sql, params));
async function check(name, run) { await run(); console.log(`ok ${++checks} - ${name}`); }
const denied = run => assert.rejects(run, error => error.code === '42501');
const insertProfile = (userId, company, role) => db.query(
  'insert into profiles(id,company_id,role) values($1,$2,$3) returning id', [userId, company, role]);
const policies = () => db.query("select * from pg_policies where tablename in ('profiles','user_roles','platform_admins') order by tablename,policyname");

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create type public.app_role as enum ('admin','driver');
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    create table public.companies(id uuid primary key);
    create table public.profiles(id uuid primary key references auth.users,company_id uuid references companies,
      role text not null default 'driver',email text,full_name text,phone text,is_available boolean default true);
    create table public.user_roles(user_id uuid not null references auth.users,company_id uuid references companies,
      role public.app_role not null,unique(user_id,role));
    create table public.platform_admins(user_id uuid primary key);
    alter table profiles enable row level security;
    alter table user_roles enable row level security;
    alter table platform_admins enable row level security;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;
  `);
  // Load the actual current helper definitions, then only the relevant policies
  // from their historical migrations, in order. Unrelated tables are not mocked.
  const tenancy = await source('20260403125600_067e9947-24a0-4b59-91a3-0bb387c5489d.sql');
  const platformSource = await source('20260404075825_dbc0dfab-f1e9-4e9d-93dd-45d92692d2ea.sql');
  for (const [text, name] of [[tenancy, 'get_my_company_id'], [platformSource, 'is_platform_admin']]) {
    const definition = text.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$\\$;`));
    assert.ok(definition, `real ${name} definition`);
    await db.exec(definition[0]);
  }
  await db.exec(await source('20260404130722_7b1a7e1d-11bb-4b3c-994b-d40d08a46509.sql'));
  for (const text of [tenancy, platformSource,
    await source('20260411084810_e4c3a1df-f2c9-4526-8557-695609e47fa6.sql'),
    await source('20260411085453_2d89f94a-2355-455c-9af5-1c526357d7f6.sql'),
    await source('20260512090359_84fcdfb8-7666-4286-a6c3-4d4c643a033b.sql')]) {
    for (const [statement] of text.matchAll(/(?:DROP|CREATE) POLICY[\s\S]*?;/g)) {
      if (/\bON public\.(profiles|user_roles|platform_admins)\b/i.test(statement)) await db.exec(statement);
    }
  }
  await db.query('insert into companies values($1),($2)', [A, B]);
  for (const [userId, company, role, hasProfile = true] of [
    [admin, A, 'admin'], [driver, A, 'driver'], [colleague, A, 'driver'],
    [foreignAdmin, B, 'admin'], [platform, null, null], [fresh, null, null, false],
    [noMembership, null, null, false], [orphanDriver, A, 'driver', false],
    [orphanAdmin, A, 'admin', false], [orphanForeign, B, 'admin', false],
  ]) {
    await db.query('insert into auth.users(id,email) values($1,$2)', [userId, `${userId}@example.invalid`]);
    if (hasProfile) await db.query('insert into profiles(id,company_id,role,full_name) values($1,$2,$3,$4)', [userId, company, role ?? 'driver', 'Synthetic']);
    if (role) await db.query('insert into user_roles values($1,$2,$3)', [userId, company, role]);
  }
  await db.query('insert into platform_admins values($1)', [platform]);
  const before = (await policies()).rows;

  await check('fixture reproduces the old profile promotion despite a protected driver membership', async () => {
    await actor('authenticated', admin, async () => {
      assert.equal((await db.query("update profiles set role='admin' where id=$1 returning id", [driver])).rows.length, 1);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [driver]);
      assert.deepEqual((await db.query("select role,has_role(auth.uid(),'admin') as authorized from profiles where id=$1", [driver])).rows,
        [{ role: 'admin', authorized: false }]);
    });
  });
  await db.exec(await source(migration));

  await check('guard is invoker-only, has an empty search path, no client execute and changes no RLS policies', async () => {
    assert.deepEqual((await policies()).rows, before);
    assert.deepEqual((await db.query(`select p.prosecdef as definer,p.proconfig as config,
      has_function_privilege('anon',p.oid,'execute') as anon,
      has_function_privilege('authenticated',p.oid,'execute') as authenticated
      from pg_proc p where p.oid='public.protect_profile_authorization()'::regprocedure`)).rows,
    [{ definer: false, config: ['search_path=""'], anon: false, authenticated: false }]);
    assert.deepEqual((await db.query("select relrowsecurity as rls from pg_class where oid='public.profiles'::regclass")).rows, [{ rls: true }]);
  });

  await check('company admins cannot promote a driver, demote an admin or replace the role with an arbitrary value', async () => {
    for (const [target, role] of [[driver, 'admin'], [admin, 'driver'], [driver, 'platform_admin'], [driver, null]]) {
      await denied(() => client(admin, 'update profiles set role=$1 where id=$2', [role, target]));
    }
  });
  await check('identity swaps without mentioning role and company moves are denied', async () => {
    for (const [field, value] of [['id', noMembership], ['company_id', B], ['company_id', null]]) {
      await denied(() => client(admin, `update profiles set ${field}=$1 where id=$2`, [value, driver]));
    }
  });
  await check('delete plus promoted reinsert and borrowing an admin profile ID both roll back', async () => {
    await denied(() => actor('authenticated', admin, async () => {
      await db.query('delete from profiles where id=$1', [driver]);
      await insertProfile(driver, A, 'admin');
    }));
    await denied(() => actor('authenticated', admin, async () => {
      await db.query('delete from profiles where id=$1', [driver]);
      await db.query('update profiles set id=$1 where id=$2', [driver, admin]);
    }));
    assert.deepEqual((await db.query('select role from profiles where id=$1', [driver])).rows, [{ role: 'driver' }]);
  });
  await check('inserts cannot fabricate membership, mismatch role or attach a foreign protected admin', async () => {
    for (const [target, company, role] of [
      [noMembership, A, 'driver'], [orphanDriver, A, 'admin'], [orphanAdmin, A, 'driver'],
      [orphanForeign, A, 'admin'], [orphanForeign, A, 'driver'], [orphanAdmin, B, 'admin'],
    ]) await denied(() => actor('authenticated', admin, () => insertProfile(target, company, role)));
  });
  await check('restoring an exact existing same-company driver or admin membership remains possible', async () => {
    for (const [target, role] of [[orphanDriver, 'driver'], [orphanAdmin, 'admin']]) {
      await actor('authenticated', admin, async () => {
        assert.deepEqual((await insertProfile(target, A, role)).rows, [{ id: target }]);
        assert.equal((await db.query('select role from user_roles where user_id=$1', [target])).rows[0].role, role);
      });
    }
  });
  await check('ordinary admin profile fields and no-op authorization assignments remain writable', async () => {
    for (const target of [admin, driver]) {
      const result = await client(admin, `update profiles set full_name='Updated',phone='0700000000',
        email='updated@example.invalid',is_available=false,id=id,company_id=company_id,role=role
        where id=$1 returning full_name,is_available`, [target]);
      assert.deepEqual(result.rows, [{ full_name: 'Updated', is_available: false }]);
    }
  });
  await check('existing driver profile RLS stays read-only and foreign admin updates still affect zero rows', async () => {
    for (const [actorId, target] of [[driver, driver], [admin, foreignAdmin], [platform, driver]]) {
      assert.deepEqual((await client(actorId, "update profiles set full_name='Not allowed' where id=$1 returning id", [target])).rows, []);
    }
    assert.deepEqual((await client(driver, 'select id from profiles')).rows, [{ id: driver }]);
  });
  await check('anonymous writes and direct creation of an unassigned own profile remain denied by existing RLS', async () => {
    await denied(() => actor('anon', null, () => insertProfile(noMembership, A, 'admin')));
    await denied(() => actor('authenticated', fresh, () => insertProfile(fresh, null, 'driver')));
  });
  await check('a future own-profile INSERT policy cannot expose null-company admin or other-identity insertion', async () => {
    // Transaction-only policy isolates the trigger behavior; it is never in the migration.
    await db.exec('begin');
    try {
      await db.exec('create policy test_profile_insert on profiles for insert to authenticated with check(true)');
      await db.exec('set local role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [fresh]);
      await db.exec('savepoint own_admin');
      await denied(() => db.query("insert into profiles(id,role) values($1,'admin')", [fresh]));
      await db.exec('rollback to savepoint own_admin');
      assert.deepEqual((await insertProfile(fresh, null, 'driver')).rows, [{ id: fresh }]);
      await db.exec('savepoint invalid_admin');
      await denied(() => db.query("insert into profiles(id,role) values($1,'admin')", [noMembership]));
      await db.exec('rollback to savepoint invalid_admin');
      await denied(() => db.query("insert into profiles(id,role) values($1,'driver')", [noMembership]));
    } finally { await db.exec('rollback'); }
    assert.deepEqual((await policies()).rows, before);
  });
  await check('client-supplied role claims cannot impersonate the database service role', async () => {
    await denied(() => actor('authenticated', admin, async () => {
      await db.query("select set_config('request.jwt.claim.role','service_role',true)");
      await db.query("update profiles set role='admin' where id=$1", [driver]);
    }));
  });
  await check('protected role grants and platform-admin table remain locked down', async () => {
    await denied(() => client(admin, "insert into user_roles values($1,$2,'admin')", [driver, A]));
    await denied(() => client(admin, "update user_roles set role='admin' where user_id=$1", [driver]));
    await denied(() => client(admin, 'insert into platform_admins values($1)', [admin]));
  });
  await check('platform administrators retain trusted edits where the existing RLS also permits them', async () => {
    await db.exec('begin');
    try {
      await db.query('insert into platform_admins values($1)', [admin]);
      await db.exec('set local role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
      assert.deepEqual((await db.query("update profiles set role='admin' where id=$1 returning id", [driver])).rows, [{ id: driver }]);
    } finally { await db.exec('rollback'); }
  });
  await check('Auth signup ignores authorization metadata and create-driver service provisioning remains usable', async () => {
    const launch = await source('20260908132142_launch_tenant_security.sql');
    const handleNewUser = launch.match(/create or replace function public\.handle_new_user\(\)[\s\S]*?\$\$;/i);
    assert.ok(handleNewUser, 'real signup trigger function');
    await db.exec(handleNewUser[0]);
    await db.exec('create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user()');
    await db.exec('begin');
    try {
      await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',
        [created, 'created@example.invalid', { full_name: 'Created', role: 'admin', company_id: B }]);
      assert.deepEqual((await db.query('select role,company_id from profiles where id=$1', [created])).rows,
        [{ role: 'driver', company_id: null }]);
      await db.exec('set local role service_role');
      // Same protected-membership -> profile upsert order used by create-driver.
      await db.query("insert into user_roles values($1,$2,'driver') on conflict(user_id,role) do update set company_id=excluded.company_id", [created, A]);
      await db.query(`insert into profiles(id,company_id,role,full_name) values($1,$2,'driver','Created')
        on conflict(id) do update set company_id=excluded.company_id,role=excluded.role,full_name=excluded.full_name`, [created, A]);
      assert.deepEqual((await db.query('select role,company_id from profiles where id=$1', [created])).rows,
        [{ role: 'driver', company_id: A }]);
      assert.deepEqual((await db.query('update profiles set phone=$1 where id=$2 returning phone', ['0700000000', created])).rows, [{ phone: '0700000000' }]);
    } finally { await db.exec('rollback'); }
  });
  await check('removing membership does not convert this guard into an authorization fallback fix', async () => {
    // Explicitly document the residual Edge risk: callers must use user_roles.
    await actor('authenticated', admin, async () => {
      await db.query('delete from user_roles where user_id=$1', [admin]);
      assert.deepEqual((await db.query("select role,has_role(auth.uid(),'admin') as authorized from profiles where id=$1", [admin])).rows,
        [{ role: 'admin', authorized: false }]);
    });
  });
  console.log(`Profile authorization PostgreSQL/RLS checks passed: ${checks}`);
} finally {
  await db.close();
}
