import { beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { handleFortnox } from './handler';
const companyId = '00000000-0000-4000-8000-000000000001';
const invoiceId = '00000000-0000-4000-8000-000000000002';
const env = (name: string) => ({ FORTNOX_CLIENT_ID: 'test-client', FORTNOX_CLIENT_SECRET: 'test-secret' })[name];
type Operation = { table: string; verb: string; value?: unknown; filters: [string, unknown][] };
const invoice = { id: invoiceId, company_id: companyId, status: 'draft', invoice_date: '2026-09-08', due_date: '2026-10-08', lines: [{ description: 'Transport', quantity: 2, unitPrice: 100, vatRate: 25 }], total_ex_vat: 200, vat_amount: 50, total_inc_vat: 250, customer: { company_id: companyId, name: 'Kund', org_number: '5592720220' } };
const customer = { CustomerNumber: '1001', Name: 'Kund', Active: true, Currency: 'SEK', VATType: 'SEVAT', CountryCode: 'SE', OrganisationNumber: '5592720220' };
function fixture(overrides: Record<string, unknown> = {}) {
  const ops: Operation[] = [];
  const values = { user_roles: { company_id: companyId }, companies: { name: 'Testbolag', org_nr: '5592720220' }, fortnox_connections: { status: 'connected', fortnox_organization_number: '5592720220' }, fortnox_oauth_states: { id: 'state' }, fortnox_invoice_syncs: null, invoices: invoice, ...overrides };
  const rpc = vi.fn(async (name: string) => ({ data: name === 'read_fortnox_tokens' ? [{ access_token: 'access', refresh_token: 'refresh', token_expires_at: new Date(Date.now() + 3600000).toISOString(), status: 'connected' }] : true, error: null }));
  const db = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin' } }, error: null }) }, rpc,
    from(table: string) {
      const op: Operation = { table, verb: 'select', filters: [] };
      const query = {
        select() { return query; },
        insert(value: unknown) { op.verb = 'insert'; op.value = value; return query; },
        update(value: unknown) { op.verb = 'update'; op.value = value; return query; },
        delete() { op.verb = 'delete'; return query; },
        eq(name: string, value: unknown) { op.filters.push([name, value]); return query; },
        is(name: string, value: unknown) { op.filters.push([name, value]); return query; },
        gt(name: string, value: unknown) { op.filters.push([name, value]); return query; },
        single() { return query; }, maybeSingle() { return query; },
        then(resolve: (value: unknown) => unknown) { ops.push(op); return Promise.resolve(resolve({ data: values[table] ?? null, error: null })); },
      }; return query;
    },
  };
  const fetcher = vi.fn();
  const call = (action: string, extra = {}, config = env) => handleFortnox(new Request('https://example.test/fortnox', { method: 'POST', headers: { Authorization: 'Bearer user-token' }, body: JSON.stringify({ action, ...extra }) }), db as unknown as Parameters<typeof handleFortnox>[1], config, fetcher);
  return { call, db, ops, fetcher };
}
const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('AbortSignal', { timeout: () => new AbortController().signal }); });
it('rejects unauthenticated and non-admin callers before external requests', async () => {
  const f = fixture(); f.db.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await f.call('connect')).status).toBe(401); expect(f.ops).toHaveLength(0);
  const driver = fixture({ user_roles: null }); expect((await driver.call('connect')).status).toBe(403); expect(driver.fetcher).not.toHaveBeenCalled();
});
it('reports missing configuration without claiming an account is connected', async () => {
  const f = fixture({ fortnox_connections: null });
  const data = await (await f.call('status', {}, () => undefined)).json();
  expect(data.configured).toBe(false); expect(data.connection).toBeNull(); expect(f.fetcher).not.toHaveBeenCalled();
});
it('creates a hashed, ten-minute state bound to the actual admin company', async () => {
  const f = fixture(); const data = await (await f.call('connect', { companyId: 'attacker-company' })).json();
  expect(data.state).toHaveLength(72); expect(new URL(data.url).hostname).toBe('apps.fortnox.se');
  const insert = f.ops.find(op => op.table === 'fortnox_oauth_states' && op.verb === 'insert')?.value as Record<string, unknown>;
  expect(insert.company_id).toBe(companyId); expect(insert.state_hash).not.toBe(data.state); expect(insert.state_hash).toHaveLength(64);
  expect(insert.expected_org_number).toBe('5592720220'); expect(Date.parse(String(insert.expires_at)) - Date.now()).toBeGreaterThan(590000);
});
it('rejects spent or expired state before exchanging the authorization code', async () => {
  const f = fixture({ fortnox_oauth_states: null });
  expect((await f.call('complete', { state: 'a'.repeat(72), code: 'code' })).status).toBe(409); expect(f.fetcher).not.toHaveBeenCalled();
});
it('never stores credentials for a different Fortnox company', async () => {
  const f = fixture(); f.fetcher.mockResolvedValueOnce(response({ access_token: 'access', refresh_token: 'refresh', scope: 'companyinformation customer invoice', expires_in: 3600 })).mockResolvedValueOnce(response({ CompanyInformation: { OrganizationNumber: '5560160680' } }));
  expect((await f.call('complete', { state: 'a'.repeat(72), code: 'code' })).status).toBe(409);
  expect(f.db.rpc.mock.calls.some(([name]) => name === 'store_fortnox_tokens')).toBe(false);
});
it('a previous export returns its existing number without creating another invoice', async () => {
  const f = fixture({ fortnox_invoice_syncs: { status: 'synced', fortnox_document_number: '42' } });
  expect(await (await f.call('export', { invoiceId })).json()).toMatchObject({ documentNumber: '42', alreadyExported: true }); expect(f.fetcher).not.toHaveBeenCalled();
});
it('an uncertain export is reconciled but never repeated automatically', async () => {
  const f = fixture({ fortnox_invoice_syncs: { status: 'pending' } }); f.fetcher.mockResolvedValue(response({ Invoices: [] }));
  expect((await f.call('export', { invoiceId })).status).toBe(409);
  expect(f.fetcher).toHaveBeenCalledTimes(1); expect(f.fetcher.mock.calls[0][1].method).toBe('GET');
});
it('exports only after checking customer and company, with a durable pending record first', async () => {
  const f = fixture(); f.fetcher.mockResolvedValueOnce(response({ Customer: customer })).mockResolvedValueOnce(response({ CompanyInformation: { OrganizationNumber: '5592720220' } })).mockImplementationOnce(async () => {
    expect(f.ops.some(op => op.table === 'fortnox_invoice_syncs' && op.verb === 'insert')).toBe(true);
    return response({ Invoice: { DocumentNumber: '123' } });
  });
  const result = await f.call('export', { invoiceId, customerNumber: '1001', customerName: 'Kund' });
  expect(result.status).toBe(200); expect(await result.json()).toEqual({ documentNumber: '123' });
  expect(f.fetcher.mock.calls.map(call => call[0])).toEqual(['https://api.fortnox.se/3/customers/1001', 'https://api.fortnox.se/3/companyinformation', 'https://api.fortnox.se/3/invoices']);
  expect(f.ops.find(op => op.table === 'invoices')?.filters).toContainEqual(['company_id', companyId]);
});
it('rejects a customer organization mismatch without exporting', async () => {
  const f = fixture(); f.fetcher.mockResolvedValue(response({ Customer: { ...customer, OrganisationNumber: '5560160680' } }));
  expect((await f.call('export', { invoiceId, customerNumber: '1001', customerName: 'Kund' })).status).toBe(409);
  expect(f.fetcher).toHaveBeenCalledTimes(1);
});
it.each([400, 500])('distinguishes definite invoice rejection from uncertainty (HTTP %s)', async status => {
  const f = fixture();
  f.fetcher.mockResolvedValueOnce(response({ Customer: customer }))
    .mockResolvedValueOnce(response({ CompanyInformation: { OrganizationNumber: '5592720220' } }))
    .mockResolvedValueOnce(new Response('{"ErrorInformation":{}}', { status }));
  expect((await f.call('export', { invoiceId, customerNumber: '1001', customerName: 'Kund' })).status).toBe(502);
  const failed = f.ops.some(op => op.table === 'fortnox_invoice_syncs' && op.verb === 'update' && (op.value as { status: string }).status === 'failed');
  expect(failed).toBe(status === 400);
});
it('refreshes expiring tokens under the company lock without returning credentials', async () => {
  const f = fixture();
  f.db.rpc.mockImplementation(async name => ({ data: name === 'read_fortnox_tokens' ? [{ access_token: 'old-access', refresh_token: 'old-refresh', status: 'connected', token_expires_at: '2020-01-01' }] : true, error: null }));
  f.fetcher.mockResolvedValueOnce(response({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600, scope: 'companyinformation customer invoice' })).mockResolvedValueOnce(response({ CompanyInformation: { CompanyName: 'Test', OrganizationNumber: '5592720220' } }));
  const result = await f.call('verify');
  expect(result.status).toBe(200);
  expect(await result.text()).not.toMatch(/access|refresh/);
  expect(f.db.rpc.mock.calls.some(([name]) => name === 'store_fortnox_tokens')).toBe(true);
  expect(f.fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer new-access');
});
