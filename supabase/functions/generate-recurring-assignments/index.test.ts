import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('https://esm.sh/@supabase/supabase-js@2.45.4', () => ({ createClient: mocks.createClient }));

type Row = Record<string, unknown>;
type Operation = { client: string; table: string; verb: string; columns?: string; value?: unknown; filters: [string, unknown][] };
type Options = { profile?: Row | null; roles?: Row[]; profileError?: boolean; roleError?: boolean; user?: Row | null };
const companyA = 'company-a', companyB = 'company-b', caller = 'admin-a';
const protectedAdmin = { user_id: caller, company_id: companyA, role: 'admin' };
const series = (company: string): Row => ({
  id: `series-${company}`, company_id: company, customer_id: 'customer', assigned_driver_id: 'driver',
  vehicle_id: null, title: 'Synthetic recurring assignment', address: 'Test address', instructions: null,
  priority: 'normal', scheduled_time: '08:00:00', duration_minutes: 60, frequency: 'daily',
  weekdays: [], day_of_month: null, start_date: '2026-09-13', end_date: '2026-09-13', active: true,
});

async function fixture(options: Options = {}) {
  const operations: Operation[] = [];
  const rows: Record<string, Row[]> = {
    profiles: (options.profile === undefined ? [{ id: caller, company_id: companyA, role: 'driver' }] : options.profile ? [options.profile] : []),
    user_roles: options.roles ?? [protectedAdmin],
    recurring_assignment_series: [series(companyA), series(companyB)],
  };
  const database = (kind: string) => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.user === undefined ? { id: caller } : options.user }, error: null }) },
    from(table: string) {
      const operation: Operation = { client: kind, table, verb: 'select', filters: [] };
      let single = false;
      const query = {
        select(columns: string) { operation.columns = columns; return query; },
        eq(key: string, value: unknown) { operation.filters.push([key, value]); return query; },
        insert(value: unknown) { operation.verb = 'insert'; operation.value = value; return query; },
        upsert(value: unknown) { operation.verb = 'upsert'; operation.value = value; return query; },
        maybeSingle() { single = true; return query; },
        then(resolveResult: (result: unknown) => unknown) {
          operations.push(operation);
          const error = (table === 'profiles' && options.profileError) || (table === 'user_roles' && options.roleError);
          const result = operation.verb === 'upsert'
            ? (operation.value as Row[]).map((_, index) => ({ id: `generated-${index}` }))
            : (rows[table] ?? []).filter(row => operation.filters.every(([key, value]) => row[key] === value));
          return Promise.resolve(resolveResult({ data: error ? null : single ? result[0] ?? null : result, error: error ? { message: 'Synthetic read failure' } : null }));
        },
      };
      return query;
    },
  });
  const userClient = database('caller'), serviceClient = database('service');
  mocks.createClient.mockImplementation((_url: string, key: string) => key === 'private-service-test-key' ? serviceClient : userClient);
  let handler: (request: Request) => Promise<Response>;
  vi.stubGlobal('Deno', {
    env: { get: (name: string) => ({ SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'private-service-test-key', SUPABASE_ANON_KEY: 'public-test-key' })[name] },
    serve: (callback: typeof handler) => { handler = callback; },
  });
  await import('./index.ts');
  const call = (body = {}, token: string | null = 'user-test-token') => handler(new Request('https://example.invalid/generate-recurring-assignments', {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body),
  }));
  return { call, operations, userClient };
}

beforeEach(() => {
  vi.resetModules();
  mocks.createClient.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-13T10:00:00Z'));
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected external request'); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('recurring assignment authorization', () => {
  it('rejects missing and invalid user identity before reading tenant data or writing jobs', async () => {
    const f = await fixture({ user: null });
    expect((await f.call({}, null)).status).toBe(401);
    expect((await f.call()).status).toBe(401);
    expect(f.operations).toEqual([]);
  });
  it.each([
    { roles: [] }, { roles: [{ user_id: caller, company_id: companyA, role: 'driver' }] },
    { roles: [{ user_id: caller, company_id: companyB, role: 'admin' }] },
    { roles: [{ user_id: caller, company_id: null, role: 'admin' }] },
    { roles: [{ user_id: 'another-user', company_id: companyA, role: 'admin' }] },
  ])('denies an admin display profile without the exact protected membership: %j', async ({ roles }) => {
    const f = await fixture({ profile: { id: caller, company_id: companyA, role: 'admin' }, roles });
    expect((await f.call()).status).toBe(403);
    expect(f.operations.some(op => op.client === 'service')).toBe(false);
  });
  it.each([{ profile: null }, { profile: { id: caller, company_id: null, role: 'admin' } }, { profileError: true }, { roleError: true }])(
    'fails closed on missing tenant and lookup failures: %j', async options => {
      const f = await fixture(options);
      expect((await f.call()).status).toBe(403);
      expect(f.operations.some(op => op.verb !== 'select')).toBe(false);
    },
  );
  it('authorizes protected company membership regardless of the display role and scopes generated jobs and audit', async () => {
    const f = await fixture();
    const response = await f.call({ horizon_days: 1, company_id: companyB });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ generated: 1, considered: 1, series: 1 });
    expect(f.operations.find(op => op.table === 'profiles')).toMatchObject({ client: 'caller', columns: 'company_id', filters: [['id', caller]] });
    expect(f.operations.find(op => op.table === 'user_roles')).toMatchObject({ client: 'caller', filters: [['user_id', caller], ['company_id', companyA], ['role', 'admin']] });
    const inserted = f.operations.find(op => op.table === 'assignments')?.value as Row[];
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ company_id: companyA, scheduled_start: '2026-09-13T06:00:00.000Z', status: 'pending' });
    expect(f.operations.find(op => op.table === 'recurring_generation_runs')?.value).toMatchObject({ company_id: companyA, triggered_by: 'admin', triggered_by_user: caller });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('cannot use a series ID to generate jobs for another tenant', async () => {
    const f = await fixture();
    expect(await (await f.call({ series_id: `series-${companyB}` })).json()).toEqual({ generated: 0, series: 0 });
    expect(f.operations.some(op => op.table === 'assignments')).toBe(false);
  });
  it('preserves the exact service key cron path without relying on user profile or roles', async () => {
    const f = await fixture({ user: null, roles: [] });
    expect(await (await f.call({ horizon_days: 1 }, 'private-service-test-key')).json()).toMatchObject({ generated: 2, series: 2 });
    expect(f.userClient.auth.getUser).not.toHaveBeenCalled();
    expect(f.operations.some(op => ['profiles', 'user_roles'].includes(op.table))).toBe(false);
    expect(f.operations.find(op => op.table === 'recurring_generation_runs')?.value).toMatchObject({ company_id: null, triggered_by: 'cron', triggered_by_user: null });
    expect(fetch).not.toHaveBeenCalled();
  });
});
