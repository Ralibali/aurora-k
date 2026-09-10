import { test as base, expect, type BrowserContext } from '@playwright/test';

export const FIXED_NOW = '2026-09-08T08:30:00.000Z';
const COMPANY_ID = '10000000-0000-4000-8000-000000000001';
const ADMIN_ID = '10000000-0000-4000-8000-000000000002';
const SUPABASE_ORIGIN = 'https://dispatch-fixture.supabase.co';

export const drivers = [
  { id: '20000000-0000-4000-8000-000000000001', full_name: 'Erik Andersson', is_available: true },
  { id: '20000000-0000-4000-8000-000000000002', full_name: 'Maria Lind', is_available: true },
  { id: '20000000-0000-4000-8000-000000000003', full_name: 'Ledig från tjänst', is_available: false },
].map((driver) => ({
  ...driver,
  company_id: COMPANY_ID,
  role: 'driver',
  email: 'driver@example.test',
  created_at: FIXED_NOW,
}));

function assignment(number: number, title: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `30000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    company_id: COMPANY_ID,
    title,
    customer_id: '40000000-0000-4000-8000-000000000001',
    customer: { id: '40000000-0000-4000-8000-000000000001', name: 'Nordic Distribution' },
    address: 'Sveavägen 10, Stockholm',
    pickup_address: 'Terminal Arlandastad',
    delivery_address: 'Sveavägen 10, Stockholm',
    scheduled_start: '2026-09-08T09:00:00.000Z',
    scheduled_end: '2026-09-08T10:00:00.000Z',
    assigned_driver_id: null as string | null,
    driver: null as (typeof drivers)[number] | null,
    status: 'pending',
    priority: 'normal',
    service_type: 'Distribution',
    instructions: null,
    actual_start: null as string | null,
    actual_stop: null,
    signature_url: null,
    consignment_photo_url: null,
    require_signature: false,
    require_photo: false,
    created_at: FIXED_NOW,
    ...overrides,
  };
}

export function createAssignments() {
  return [
    assignment(1, 'Expressleverans Södermalm', {
      priority: 'urgent', scheduled_start: '2026-09-08T07:00:00.000Z', scheduled_end: '2026-09-08T08:00:00.000Z',
    }),
    assignment(2, 'Pallgods Solna'),
    assignment(3, 'Butiksrunda City', {
      assigned_driver_id: drivers[0].id, driver: drivers[0],
      scheduled_start: '2026-09-08T10:00:00.000Z', scheduled_end: '2026-09-08T12:00:00.000Z',
    }),
    assignment(4, 'Temperaturtransport Nacka', {
      status: 'active', assigned_driver_id: drivers[0].id, driver: drivers[0],
      actual_start: '2026-09-08T06:00:00.000Z', scheduled_start: '2026-09-08T06:00:00.000Z', scheduled_end: '2026-09-08T08:00:00.000Z',
    }),
    assignment(5, 'Signerad leverans Täby', {
      status: 'completed', assigned_driver_id: drivers[1].id, driver: drivers[1], require_signature: true,
      scheduled_start: '2026-09-08T05:00:00.000Z', scheduled_end: '2026-09-08T07:00:00.000Z',
      actual_start: '2026-09-08T05:00:00.000Z', actual_stop: '2026-09-08T07:00:00.000Z',
    }),
    assignment(6, 'Avbokad hämtning Bromma', { status: 'cancelled', priority: 'urgent' }),
    assignment(7, 'Morgondagens leverans Uppsala', {
      scheduled_start: '2026-09-09T08:00:00.000Z', scheduled_end: '2026-09-09T09:00:00.000Z',
    }),
  ];
}

export type MockAssignment = ReturnType<typeof createAssignments>[number];
export type DispatchApi = {
  assignments: MockAssignment[];
  writes: Array<{ ids: string[]; body: Record<string, unknown>; query: URLSearchParams }>;
  failNextMutation: boolean;
  partialNextMutation: boolean;
  unexpectedRequests: string[];
  notificationRequests: number;
  failNotifications: boolean;
};

/** All auth/data traffic stays inside the browser fixture. No real credentials are read. */
export async function installDispatchFixture(context: BrowserContext): Promise<DispatchApi> {
  const state: DispatchApi = {
    assignments: createAssignments(), writes: [], failNextMutation: false, partialNextMutation: false, unexpectedRequests: [], notificationRequests: 0, failNotifications: false,
  };
  const user = {
    id: ADMIN_ID, aud: 'authenticated', role: 'authenticated', email: 'admin@example.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Alex Transportledare' }, created_at: FIXED_NOW,
  };
  const expiresAt = Math.floor(new Date(FIXED_NOW).getTime() / 1000) + 86400 * 365;
  const token = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: ADMIN_ID, role: 'authenticated', exp: expiresAt })).toString('base64url'),
    'fixture-signature',
  ].join('.');
  const session = { access_token: token, refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 86400 * 365, expires_at: expiresAt, user };
  await context.addInitScript((value) => {
    localStorage.setItem('sb-dispatch-fixture-auth-token', JSON.stringify(value));
    localStorage.setItem('aurora-demo-mode', 'false');
  }, session);

  await context.routeWebSocket('**', (socket) => {
    if (new URL(socket.url()).hostname === '127.0.0.1') socket.connectToServer();
    else socket.close();
  });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:4175') return route.continue();
    // Marketing tags and optional Google Fonts are present in index.html even
    // for admin routes; fulfill them locally without executing analytics.
    if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (url.hostname === 'www.googletagmanager.com' || url.hostname === 'plausible.io') return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (url.origin !== SUPABASE_ORIGIN) {
      // Fail closed for any accidentally configured production API or telemetry.
      state.unexpectedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    const json = (body: unknown, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(body),
      headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/0' },
    });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PATCH, HEAD, OPTIONS',
      'access-control-allow-headers': '*',
    } });
    // Explicitly exercise the no-key fallback without contacting a maps provider.
    if (url.pathname === '/functions/v1/maps-config' && request.method() === 'POST') return json({ configured: false });
    if (url.pathname === '/functions/v1/dispatch-notifications' && request.method() === 'POST') {
      state.notificationRequests++;
      return state.failNotifications ? json({ error: 'Resend temporarily unavailable' }, 503) : json({ sent: 1, failed: 0 });
    }
    if (url.pathname.startsWith('/auth/')) return json(url.pathname.endsWith('/user') ? user : session);
    if (url.pathname === '/rest/v1/rpc/is_platform_admin') return json(false);
    if (url.pathname === '/rest/v1/user_roles') return json([{ role: 'admin', company_id: COMPANY_ID }]);
    if (url.pathname === '/rest/v1/companies') return json({ id: COMPANY_ID, name: 'Nordic Transport', subscription_status: 'active', trial_ends_at: null });
    if (url.pathname === '/rest/v1/profiles') return json(url.searchParams.has('role') ? drivers : { id: ADMIN_ID, company_id: COMPANY_ID, role: 'admin' });
    if (url.pathname === '/rest/v1/assignments') {
      if (request.method() === 'PATCH') {
        const idFilter = url.searchParams.get('id') ?? '';
        const ids = idFilter.startsWith('in.(')
          ? idFilter.slice(4, -1).replaceAll('"', '').split(',')
          : [idFilter.replace(/^eq\./, '')];
        const body = request.postDataJSON() as Record<string, unknown>;
        state.writes.push({ ids, body, query: url.searchParams });
        if (state.failNextMutation) {
          state.failNextMutation = false;
          return json({ code: 'FIXTURE_ERROR', message: 'Testservern kunde inte spara ändringen', details: null, hint: null }, 500);
        }
        const changed = state.assignments.filter((item) => ids.includes(item.id)).filter((item) => {
          const statusFilter = url.searchParams.get('status');
          if (statusFilter && !statusFilter.includes(item.status)) return false;
          if (url.searchParams.get('actual_start') === 'is.null' && item.actual_start !== null) return false;
          const companyFilter = url.searchParams.get('company_id');
          return !companyFilter || companyFilter === `eq.${item.company_id}`;
        });
        if (state.partialNextMutation) {
          state.partialNextMutation = false;
          changed.splice(1);
        }
        changed.forEach((item) => {
          Object.assign(item, body);
          if ('assigned_driver_id' in body) item.driver = drivers.find((driver) => driver.id === body.assigned_driver_id) ?? null;
        });
        if (request.headers().accept?.includes('vnd.pgrst.object') && changed.length !== 1) {
          return json({ code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object', details: 'The result contains 0 rows', hint: null }, 406);
        }
        return json(request.headers().accept?.includes('vnd.pgrst.object') ? changed[0] : changed);
      }
      if (request.method() === 'GET') return json(state.assignments);
    }
    if (request.method() === 'GET' || request.method() === 'HEAD') return json([]);
    state.unexpectedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
    return json({ message: 'Unmocked mutation blocked by dispatch fixture' }, 500);
  });
  return state;
}

export const test = base.extend<{ dispatchApi: DispatchApi }>({
  dispatchApi: [async ({ context, page }, use) => {
    const api = await installDispatchFixture(context);
    await page.clock.setFixedTime(new Date(FIXED_NOW));
    await use(api);
    expect(api.unexpectedRequests, 'Every external request must be mocked').toEqual([]);
  }, { auto: true }],
});

export { expect };
