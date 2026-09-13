import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEdgeCaller, requireAdminForRecipientCompany, type EdgeCaller } from './auth-helpers.ts';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), serve: vi.fn() }));
vi.mock('https://esm.sh/@supabase/supabase-js@2.100.1', () => ({ createClient: mocks.createClient }));

type Row = { id?: string; user_id?: string; company_id?: string | null; role?: string };
type Scope = 'caller' | 'service';
type Operation = { scope: Scope; table: string; columns: string; filters: [string, unknown][] };
type FixtureOptions = {
  profile?: Row | null;
  roles?: Row[];
  recipients?: Row[];
  profileError?: Error;
  roleError?: Error;
  recipientsError?: Error;
  claims?: Record<string, unknown> | null;
  claimsError?: Error;
};
const caller: EdgeCaller = { userId: 'caller-a', isServiceRole: false, authHeader: 'Bearer verified-user-token' };
const recipient = { id: 'recipient-a', company_id: 'company-a' };

function fixture(options: FixtureOptions = {}) {
  const operations: Operation[] = [];
  const profile = options.profile === undefined ? { id: caller.userId!, company_id: 'company-a', role: 'driver' } : options.profile;
  const roles = options.roles ?? [{ user_id: caller.userId!, company_id: 'company-a', role: 'admin' }];
  const recipients = options.recipients ?? [recipient];
  const getClaims = vi.fn().mockResolvedValue({
    data: { claims: options.claims === undefined ? { sub: caller.userId, role: 'authenticated' } : options.claims },
    error: options.claimsError ?? null,
  });
  const client = (scope: Scope) => ({
    auth: { getClaims },
    from(table: string) {
      const operation: Operation = { scope, table, columns: '', filters: [] };
      const outcome = (single: boolean) => {
        operations.push(operation);
        const error = table === 'user_roles' ? options.roleError : scope === 'caller' ? options.profileError : options.recipientsError;
        const rows = table === 'driver_push_tokens' ? [] : table === 'user_roles' ? roles : scope === 'caller' ? profile ? [profile] : [] : recipients;
        const filtered = rows.filter(row => operation.filters.every(([column, value]) => {
          const actual = row[column as keyof Row];
          return Array.isArray(value) ? value.includes(actual) : actual === value;
        }));
        return { data: error ? null : single ? filtered[0] ?? null : filtered, error: error ?? null };
      };
      const query = {
        select(columns: string) { operation.columns = columns; return query; },
        eq(column: string, value: unknown) { operation.filters.push([column, value]); return query; },
        in(column: string, values: string[]) { operation.filters.push([column, values]); return query; },
        maybeSingle: async () => outcome(true),
        then(resolve: (value: ReturnType<typeof outcome>) => unknown) { return Promise.resolve(outcome(false)).then(resolve); },
      };
      return query;
    },
  });
  const callerClient = client('caller');
  const serviceClient = client('service');
  mocks.createClient.mockImplementation((_url: string, key: string) => {
    if (key === 'test-anon-key') return callerClient;
    if (key === 'test-service-key') return serviceClient;
    throw new Error('Unexpected client credential');
  });
  return { operations, getClaims, check: (ids = [recipient.id], identity = caller) => requireAdminForRecipientCompany(identity, ids) };
}

beforeEach(() => {
  vi.resetModules();
  mocks.createClient.mockReset();
  mocks.serve.mockReset();
  vi.stubGlobal('Deno', { env: { get: (name: string) => ({
    SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'test-anon-key', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  })[name] }, serve: mocks.serve });
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network requests are forbidden in authorization tests'); }));
});

describe('send-push handler authorization boundary', () => {
  async function handle(userIds = [recipient.id], token = 'verified-user-token') {
    await import('../send-push/index.ts');
    const handler = mocks.serve.mock.calls[0][0] as (request: Request) => Promise<Response>;
    return handler(new Request('https://example.invalid/send-push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, title: 'Synthetic notification', body: 'Authorization test only' }),
    }));
  }

  it('rejects a profile-only admin before reading push tokens or sending notifications', async () => {
    const f = fixture({ profile: { id: 'caller-a', company_id: 'company-a', role: 'admin' }, roles: [] });
    const response = await handle();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Admin role required' });
    expect(f.operations.some(operation => operation.scope === 'service')).toBe(false);
  });

  it('rejects another-company recipient before reading any push tokens', async () => {
    const f = fixture({ recipients: [{ id: recipient.id, company_id: 'company-b' }] });
    const response = await handle();
    expect(response.status).toBe(403);
    expect(f.operations.some(operation => operation.table === 'driver_push_tokens')).toBe(false);
  });

  it('reaches the token lookup for the exact protected admin and same-company recipient', async () => {
    const f = fixture();
    const response = await handle();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 0, failed: 0, removed: 0 });
    expect(f.operations.at(-1)).toEqual({
      scope: 'service', table: 'driver_push_tokens', columns: 'token, platform, user_id', filters: [['user_id', ['recipient-a']]],
    });
  });

  it('retains the verified service caller path without caller profile or membership reads', async () => {
    const f = fixture({ claims: { role: 'service_role' } });
    const response = await handle([recipient.id], 'verified-service-token');
    expect(response.status).toBe(200);
    expect(f.operations).toHaveLength(1);
    expect(f.operations[0].table).toBe('driver_push_tokens');
  });
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe('verified Edge caller identity', () => {
  it('validates the bearer token before trusting its user identity or service role', async () => {
    const f = fixture();
    expect(await getEdgeCaller(caller.authHeader)).toEqual(caller);
    expect(f.getClaims).toHaveBeenCalledWith('verified-user-token');
    expect(mocks.createClient).toHaveBeenCalledWith('https://example.invalid', 'test-anon-key', {
      global: { headers: { Authorization: caller.authHeader } },
    });
  });

  it('does not trust a service-role claim when token verification fails', async () => {
    fixture({ claims: { role: 'service_role' }, claimsError: new Error('invalid signature') });
    expect(await getEdgeCaller('Bearer forged-service-token')).toBeNull();
  });

  it('rejects a token with no verified claims', async () => {
    fixture({ claims: null });
    expect(await getEdgeCaller('Bearer invalid-token')).toBeNull();
  });

  it('preserves the bypass for a verified service-role caller without requiring a user profile', async () => {
    const f = fixture({ claims: { role: 'service_role' } });
    const serviceCaller = await getEdgeCaller('Bearer verified-service-token');
    expect(serviceCaller).toEqual({ userId: null, isServiceRole: true, authHeader: 'Bearer verified-service-token' });
    expect(await f.check(['recipient-a', 'recipient-other-company'], serviceCaller!)).toEqual({ ok: true });
    expect(f.operations).toEqual([]);
  });
});

describe('send-push administrator authorization', () => {
  it('denies an authenticated caller without a user identity before database access', async () => {
    const f = fixture();
    expect(await f.check([recipient.id], { ...caller, userId: null })).toEqual({ ok: false, error: 'Unauthorized' });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(f.operations).toEqual([]);
  });

  it('allows a current company admin even when the profile display role says driver', async () => {
    const f = fixture();
    expect(await f.check()).toEqual({ ok: true });
    expect(f.operations).toEqual([
      { scope: 'caller', table: 'profiles', columns: 'company_id', filters: [['id', 'caller-a']] },
      { scope: 'caller', table: 'user_roles', columns: 'company_id', filters: [['user_id', 'caller-a'], ['company_id', 'company-a'], ['role', 'admin']] },
      { scope: 'service', table: 'profiles', columns: 'id, company_id', filters: [['id', ['recipient-a']]] },
    ]);
  });

  it.each([
    ['no protected membership', []],
    ['driver membership only', [{ user_id: 'caller-a', company_id: 'company-a', role: 'driver' }]],
    ['unscoped admin membership', [{ user_id: 'caller-a', company_id: null, role: 'admin' }]],
    ['admin membership in another company', [{ user_id: 'caller-a', company_id: 'company-b', role: 'admin' }]],
    ['another user admin membership', [{ user_id: 'another-user', company_id: 'company-a', role: 'admin' }]],
  ])('denies a profile-only admin with %s', async (_name, roles) => {
    const f = fixture({ profile: { id: 'caller-a', company_id: 'company-a', role: 'admin' }, roles });
    expect(await f.check()).toEqual({ ok: false, error: 'Admin role required' });
    expect(f.operations.some(operation => operation.scope === 'service')).toBe(false);
  });

  it.each([null, { id: 'caller-a', company_id: null, role: 'admin' }, { id: 'another-user', company_id: 'company-a', role: 'admin' }])(
    'denies missing or unassigned caller profiles despite an admin membership', async profile => {
      const f = fixture({ profile });
      expect(await f.check()).toEqual({ ok: false, error: 'Admin role required' });
      expect(f.operations).toHaveLength(1);
    },
  );

  it('does not reuse a revoked admin membership on a subsequent request', async () => {
    const roles: Row[] = [{ user_id: 'caller-a', company_id: 'company-a', role: 'admin' }];
    const f = fixture({ profile: { id: 'caller-a', company_id: 'company-a', role: 'admin' }, roles });
    expect(await f.check()).toEqual({ ok: true });
    roles.length = 0;
    expect(await f.check()).toEqual({ ok: false, error: 'Admin role required' });
    expect(f.operations.filter(operation => operation.scope === 'service')).toHaveLength(1);
  });

  it('does not authorize recipients from a second company using another admin membership', async () => {
    const f = fixture({
      roles: [
        { user_id: 'caller-a', company_id: 'company-a', role: 'admin' },
        { user_id: 'caller-a', company_id: 'company-b', role: 'admin' },
      ],
      recipients: [recipient, { id: 'foreign-recipient', company_id: 'company-b' }],
    });
    expect(await f.check([recipient.id, 'foreign-recipient'])).toEqual({ ok: false, error: 'Recipients must belong to your company' });
  });

  it('rejects recipients without a company and missing recipients', async () => {
    const unassigned = fixture({ recipients: [{ id: recipient.id, company_id: null }] });
    expect(await unassigned.check()).toEqual({ ok: false, error: 'Recipients must belong to your company' });
    const missing = fixture({ recipients: [recipient] });
    expect(await missing.check([recipient.id, 'missing-recipient'])).toEqual({ ok: false, error: 'Recipient not found' });
  });

  it.each(['profileError', 'roleError', 'recipientsError'] as const)('fails closed on a %s database failure', async field => {
    const f = fixture({ [field]: new Error('Database unavailable') });
    expect(await f.check()).toEqual({ ok: false, error: 'Database unavailable' });
    if (field !== 'recipientsError') expect(f.operations.some(operation => operation.scope === 'service')).toBe(false);
  });
});
