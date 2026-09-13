// Real PostgreSQL RLS checks in a disposable, in-memory PGlite database.
// Only synthetic tokens are used. No network, notification sender or live database.
// Run from the repository root: node supabase/tests/driver-push-tokens.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = 'c0010000-0000-4000-8000-000000000001';
const other = 'c0010000-0000-4000-8000-000000000002';
const firstTime = '2026-01-01T00:00:00.000Z';
const laterTime = '2026-01-02T00:00:00.000Z';
let checks = 0;

async function check(label, run) {
  await run();
  checks++;
  console.log(`PASS ${label}`);
}

async function actor(role, userId, run) {
  assert.ok(['authenticated', 'anon'].includes(role));
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? '']);
    const result = await run();
    await db.exec('commit');
    return result;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}

// Same columns and ON CONFLICT behavior as the client's upsert({ ... },
// { onConflict: 'token' }). No RETURNING clause: SELECT is needed by the
// conflict update itself, independently of requesting a response body.
function upsert(userId, token, platform = 'ios', updatedAt = firstTime) {
  return db.query(`
    insert into public.driver_push_tokens(user_id, token, platform, updated_at)
    values ($1, $2, $3, $4)
    on conflict(token) do update set
      user_id = excluded.user_id,
      platform = excluded.platform,
      updated_at = excluded.updated_at
  `, [userId, token, platform, updatedAt]);
}

function denied(run) {
  return assert.rejects(run, error => error.code === '42501');
}

try {
  await db.exec(`
    create role anon nologin nobypassrls;
    create role authenticated nologin nobypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(await readFile(new URL('../migrations/20260704090000_driver_push_tokens.sql', import.meta.url), 'utf8'));
  // Give both roles table privileges to test RLS itself, including denial for
  // anon even on projects that retain Supabase's legacy default table grants.
  await db.exec('grant select, insert, update, delete on public.driver_push_tokens to anon, authenticated');
  await db.query('insert into auth.users(id) values ($1), ($2)', [owner, other]);
  await upsert(owner, 'synthetic-owner-existing');
  await upsert(other, 'synthetic-other-existing', 'android');

  await check('tests run as a non-owner role with RLS active', async () => {
    const result = await actor('authenticated', owner, () => db.query(`
      select current_user::text as role,
        row_security_active('public.driver_push_tokens'::regclass) as rls
    `));
    assert.deepEqual(result.rows, [{ role: 'authenticated', rls: true }]);
  });

  await check('original policies reject an existing-token upsert without RETURNING', () =>
    denied(() => actor('authenticated', owner, () => upsert(owner, 'synthetic-owner-existing'))));

  await db.exec(await readFile(new URL('../migrations/20260913200132_driver_push_tokens_select_own.sql', import.meta.url), 'utf8'));

  await check('owner can read own token and cannot see another user token', async () => {
    const result = await actor('authenticated', owner, () => db.query('select token from public.driver_push_tokens'));
    assert.deepEqual(result.rows, [{ token: 'synthetic-owner-existing' }]);
  });

  await check('a new device token can be upserted by its owner', async () => {
    await actor('authenticated', owner, () => upsert(owner, 'synthetic-owner-new'));
    assert.equal((await db.query("select count(*)::int as count from public.driver_push_tokens where token = 'synthetic-owner-new'")).rows[0].count, 1);
  });

  await check('repeated upsert updates the same row without duplication', async () => {
    const before = (await db.query("select id from public.driver_push_tokens where token = 'synthetic-owner-new'")).rows[0];
    await actor('authenticated', owner, () => upsert(owner, 'synthetic-owner-new', 'android', laterTime));
    const result = await db.query("select id, user_id, platform, updated_at from public.driver_push_tokens where token = 'synthetic-owner-new'");
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].id, before.id);
    assert.equal(result.rows[0].user_id, owner);
    assert.equal(result.rows[0].platform, 'android');
    assert.equal(result.rows[0].updated_at.toISOString(), laterTime);
  });

  await check('owner can update an existing token row', async () => {
    const result = await actor('authenticated', owner, () => db.query("update public.driver_push_tokens set platform = 'ios' where token = 'synthetic-owner-existing' returning token"));
    assert.deepEqual(result.rows, [{ token: 'synthetic-owner-existing' }]);
  });

  await check('another user sees only their own token', async () => {
    const result = await actor('authenticated', other, () => db.query('select token from public.driver_push_tokens'));
    assert.deepEqual(result.rows, [{ token: 'synthetic-other-existing' }]);
  });

  await check('user cannot insert a token attributed to another user', () =>
    denied(() => actor('authenticated', other, () => upsert(owner, 'synthetic-forged-owner'))));

  await check('user cannot take over another user token through upsert', () =>
    denied(() => actor('authenticated', other, () => upsert(other, 'synthetic-owner-existing'))));

  await check('owner cannot reassign a token to another user', () =>
    denied(() => actor('authenticated', owner, () => db.query("update public.driver_push_tokens set user_id = $1 where token = 'synthetic-owner-existing'", [other]))));

  await check('another user cannot update or delete a hidden token', async () => {
    for (const sql of [
      "update public.driver_push_tokens set platform = 'android' where token = 'synthetic-owner-existing' returning id",
      "delete from public.driver_push_tokens where token = 'synthetic-owner-existing' returning id",
    ]) {
      const result = await actor('authenticated', other, () => db.query(sql));
      assert.equal(result.rows.length, 0);
    }
    assert.equal((await db.query("select user_id from public.driver_push_tokens where token = 'synthetic-owner-existing'")).rows[0].user_id, owner);
  });

  await check('anonymous callers cannot read tokens even with a supplied subject claim', async () => {
    for (const claim of [null, owner]) {
      const result = await actor('anon', claim, () => db.query('select token from public.driver_push_tokens'));
      assert.equal(result.rows.length, 0);
    }
  });

  await check('anonymous callers cannot insert or upsert tokens', async () => {
    for (const token of ['synthetic-anon-new', 'synthetic-owner-existing']) {
      await denied(() => actor('anon', owner, () => upsert(owner, token)));
    }
  });

  await check('anonymous callers cannot update or delete tokens', async () => {
    for (const sql of [
      "update public.driver_push_tokens set platform = 'android' returning id",
      'delete from public.driver_push_tokens returning id',
    ]) {
      const result = await actor('anon', owner, () => db.query(sql));
      assert.equal(result.rows.length, 0);
    }
  });

  await check('authenticated role without a user subject has no token access', async () => {
    const result = await actor('authenticated', null, () => db.query('select token from public.driver_push_tokens'));
    assert.equal(result.rows.length, 0);
    await denied(() => actor('authenticated', null, () => upsert(owner, 'synthetic-no-subject')));
  });

  await check('owner deletes only the selected device token', async () => {
    const result = await actor('authenticated', owner, () => db.query("delete from public.driver_push_tokens where user_id = $1 and token = 'synthetic-owner-new' returning token", [owner]));
    assert.deepEqual(result.rows, [{ token: 'synthetic-owner-new' }]);
    assert.deepEqual((await db.query('select token from public.driver_push_tokens order by token')).rows,
      [{ token: 'synthetic-other-existing' }, { token: 'synthetic-owner-existing' }]);
  });

  console.log(`PASS ${checks} isolated push-token RLS checks`);
} finally {
  await db.close();
}
