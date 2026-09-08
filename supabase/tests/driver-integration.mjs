import assert from 'node:assert/strict';

// Called by the disposable launch-security.mjs PostgreSQL harness after loading
// the real driver, notification and tenant-security migrations together.
export default async function driverIntegration(db) {
  const id = n => `d1000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const company = id(1), driver = id(2), customer = id(3), assignment = id(4), cancelled = id(5);
  const start = new Date(Date.now() - 3600000).toISOString();
  const stop = new Date().toISOString();
  await db.query('insert into companies(id,name) values($1,$2)', [company, 'Driver integration']);
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [driver, 'driver@example.invalid']);
  await db.query('insert into profiles(id,email,full_name,company_id,role) values($1,$2,$3,$4,$5)', [driver, 'driver@example.invalid', 'Driver', company, 'driver']);
  await db.query('insert into user_roles(user_id,company_id,role) values($1,$2,$3)', [driver, company, 'driver']);
  await db.query('insert into customers(id,company_id,name,email) values($1,$2,$3,$4)', [customer, company, 'Customer', 'customer@example.invalid']);
  for (const [key, status] of [[assignment, 'pending'], [cancelled, 'cancelled']]) {
    await db.query(`insert into assignments(id,company_id,customer_id,assigned_driver_id,title,address,status,scheduled_start,require_photo,require_signature,tracking_enabled)
      values($1,$2,$3,$4,'Driver integration','Fixture address',$5,now()-interval '2 hours',true,true,true)`, [key, company, customer, driver, status]);
  }
  let checks = 0;
  const check = async (label, fn) => { await fn(); checks++; console.log('PASS driver ' + label); };
  const operation = async (n, type = 'assignment_status', metadata = { status: 'active', changedAt: start }, photo = null, signature = null, target = assignment) => {
    const result = await db.query('select public.sync_driver_operation($1,$2,$3,$4,$5::jsonb,$6,$7) result', [driver, id(100 + n), target, type, JSON.stringify(metadata), photo, signature]);
    return result.rows[0].result;
  };
  const count = async table => Number((await db.query(`select count(*) count from public.${table} where assignment_id=$1`, [assignment])).rows[0].count);
  await check('only service can invoke trusted evidence RPC', async () => {
    const { rows } = await db.query("select has_function_privilege('authenticated','public.sync_driver_operation(uuid,uuid,uuid,text,jsonb,text,text)','execute') client,has_function_privilege('anon','public.sync_driver_operation(uuid,uuid,uuid,text,jsonb,text,text)','execute') anonymous,has_function_privilege('service_role','public.sync_driver_operation(uuid,uuid,uuid,text,jsonb,text,text)','execute') service");
    assert.deepEqual(rows[0], { client: false, anonymous: false, service: true });
  });
  await check('start persists and replay reuses the same receipt', async () => {
    assert.equal((await operation(1)).status, 'active');
    assert.equal((await operation(1)).duplicate, true);
    assert.equal(await count('driver_sync_operations'), 1);
  });
  await check('second start preserves actual timestamp', async () => {
    assert.equal((await operation(2, 'assignment_status', { status: 'active', changedAt: stop })).statusChanged, false);
    assert.equal(new Date((await db.query('select actual_start from assignments where id=$1', [assignment])).rows[0].actual_start).toISOString(), start);
  });
  await check('old status RPC cannot bypass the new lifecycle', async () => {
    await assert.rejects(db.query('select driver_update_assignment($1,$2)', [assignment, 'completed']), /Uppdatera appen/);
    await assert.rejects(operation(3, 'assignment_status', { status: 'completed' }), /leveransbevis/);
  });
  await check('saved proof requirements defeat client flags and fake URLs', async () => {
    await assert.rejects(operation(4, 'delivery_proof', { completedAt: stop, requirePhoto: false, requireSignature: false, existingPhotoUrl: 'https://fake.invalid/photo' }), /Foto krävs/);
    await assert.rejects(operation(5, 'delivery_proof', { completedAt: stop }, 'https://fixture.invalid/photo'), /Signatur och mottagarens namn/);
    assert.equal(await count('assignment_protocols'), 0);
    assert.equal(await count('driver_sync_operations'), 2);
    assert.equal((await db.query('select status,actual_stop from assignments where id=$1', [assignment])).rows[0].actual_stop, null);
  });
  await check('a completion before its offline start is rejected', async () => {
    await assert.rejects(operation(6, 'delivery_proof', { completedAt: new Date(Date.parse(start) - 1000).toISOString(), recipientName: 'Anna' }, 'https://fixture.invalid/photo', 'https://fixture.invalid/signature'), /Ogiltig sluttid/);
  });
  await check('started delayed delivery commits proof, status and receipt once', async () => {
    await db.query("update assignments set status='delayed' where id=$1", [assignment]);
    assert.equal((await operation(7, 'delivery_proof', { completedAt: stop, recipientName: 'Anna', note: 'Paket levererat' }, 'https://fixture.invalid/photo', 'https://fixture.invalid/signature')).status, 'completed');
    assert.equal((await operation(7, 'delivery_proof', { completedAt: stop })).duplicate, true);
    assert.equal(await count('assignment_protocols'), 1);
    assert.equal(await count('driver_sync_operations'), 3);
    const saved = (await db.query('select status,consignment_photo_url,signature_url from assignments where id=$1', [assignment])).rows[0];
    assert.deepEqual(saved, { status: 'completed', consignment_photo_url: 'https://fixture.invalid/photo', signature_url: 'https://fixture.invalid/signature' });
  });
  await check('database transitions create exactly one customer event per lifecycle', async () => {
    const { rows } = await db.query("select type,count(*)::int count from notification_outbox where company_id=$1 and type in ('tracking-started','delivery-completed') group by type order by type", [company]);
    assert.deepEqual(rows, [{ type: 'delivery-completed', count: 1 }, { type: 'tracking-started', count: 1 }]);
  });
  await check('stale queued work cannot reopen completed or cancelled assignments', async () => {
    await assert.rejects(operation(8), /avslutats eller avbokats/);
    await assert.rejects(operation(9, 'assignment_status', { status: 'active', changedAt: start }, null, null, cancelled), /avslutats eller avbokats/);
    await assert.rejects(operation(10, 'delivery_proof', { completedAt: stop }, null, null, cancelled), /avslutats eller avbokats/);
  });
  await check('assignment removal rejects the previous driver’s pending operation', async () => {
    await db.query("update assignments set status='pending',assigned_driver_id=null where id=$1", [cancelled]);
    await assert.rejects(operation(11, 'assignment_status', { status: 'active', changedAt: start }, null, null, cancelled), /Du får inte ändra/);
  });
  return checks;
}
