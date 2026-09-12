import { test, expect, type Page } from '@playwright/test';

async function fixture(page: Page, role = 'driver', withJob = false) {
  const user = { id: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'driver@example.test', app_metadata: {}, user_metadata: {} };
  const company = '10000000-0000-4000-8000-000000000002';
  const job = { id: '10000000-0000-4000-8000-000000000003', company_id: company, assigned_driver_id: user.id, title: 'Testleverans Linköping', address: 'Testgatan 1', pickup_address: 'Testgatan 1', delivery_address: 'Testgatan 2', status: 'pending', scheduled_start: new Date().toISOString(), actual_start: null as string | null, actual_stop: null as string | null, require_photo: false, require_signature: false, customer: { name: 'Testkund' } };
  const unexpected: string[] = [];
  await page.routeWebSocket('**', socket => { if (socket.url().includes('127.0.0.1')) socket.connectToServer(); else socket.close(); });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname !== 'mobile-fixture.supabase.co') { unexpected.push(url.origin + url.pathname); return route.abort(); }
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/auth/v1/token') return json({ access_token: 'test-token', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user });
    if (url.pathname === '/auth/v1/logout') return json({});
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname === '/rest/v1/user_roles') return json([{ role, company_id: company }]);
    if (url.pathname === '/rest/v1/profiles') return json({ id: user.id, role, company_id: company, full_name: 'Alex Förare', is_available: true });
    if (url.pathname === '/rest/v1/rpc/is_platform_admin') return json(false);
    if (url.pathname === '/rest/v1/companies') return json({ id: company, subscription_status: 'active' });
    if (url.pathname === '/rest/v1/settings') return json({ phone: '0101234567' });
    if (url.pathname.includes('driver_settings')) return json(null);
    if (url.pathname === '/rest/v1/assignments') return json(withJob ? (url.searchParams.has('id') ? job : [job]) : []);
    if (url.pathname === '/functions/v1/driver-sync') {
      const payload = route.request().postData() ?? '';
      if (payload.includes('assignment_status')) { job.status = 'active'; job.actual_start = new Date().toISOString(); }
      else if (payload.includes('delivery_proof')) { job.status = 'completed'; job.actual_stop = new Date().toISOString(); }
      else { unexpected.push('unknown driver operation'); return json({}, 400); }
      return json({ synced: true, result: { status: job.status } });
    }
    if (url.pathname === '/rest/v1/driver_locations') return json({});
    if (url.pathname === '/functions/v1/auth-email') return json({ accepted: true });
    if (route.request().method() === 'GET') return json([]);
    unexpected.push(route.request().method() + ' ' + url.pathname);
    return json({ error: 'Unexpected fixture request' }, 500);
  });
  return unexpected;
}
async function login(page: Page) {
  await page.getByLabel('E-post', { exact: true }).fill('driver@example.test');
  await page.getByLabel('Lösenord', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Logga in', exact: true }).click();
}

test('app opens login, has no sales links or tracking, and supports password recovery', async ({ page }) => {
  const unexpected = await fixture(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Aurora Transport' })).toBeVisible();
  await expect(page.getByText('Skapa konto', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Testa demo', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Integritetspolicy' })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-login.png' });
  await page.getByRole('link', { name: 'Glömt lösenord?' }).click();
  await page.getByLabel('E-post', { exact: true }).fill('driver@example.test');
  await page.getByRole('button', { name: 'Skicka återställningslänk' }).click();
  await expect(page.getByText('Om kontot finns', { exact: false })).toBeVisible();
  expect(unexpected).toEqual([]);
});

test('driver logs in, sees empty jobs, opens reports and signs out', async ({ page }) => {
  const unexpected = await fixture(page);
  await page.goto('/');
  await login(page);
  await expect(page.getByRole('heading', { name: 'Hej, Alex!' })).toBeVisible();
  await expect(page.getByText('Inga uppdrag i detta urval.')).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Fakturor' })).toHaveCount(0);
  await page.goto('/driver/invoices');
  await expect(page).toHaveURL(/\/driver\/assignments$/);
  await page.getByRole('navigation').getByRole('link', { name: 'Tidrapport' }).click();
  await expect(page.getByText('Inga avklarade uppdrag')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Profil' }).click();
  await page.getByRole('button', { name: /Logga ut/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/driver/assignments');
  await expect(page).toHaveURL(/\/login$/);
  expect(unexpected).toEqual([]);
});

test('admin account gets an explanation without redirect loop or checkout', async ({ page }) => {
  await fixture(page, 'admin');
  await page.goto('/admin');
  await login(page);
  await expect(page.getByText('Appen kräver ett chaufförskonto.', { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Byt konto' }).click();
  await expect(page.getByText('Appen kräver ett chaufförskonto.', { exact: false })).toHaveCount(0);
});


test('driver opens, starts and completes a job and finds it in time report', async ({ page }) => {
  const unexpected = await fixture(page, 'driver', true);
  await page.goto('/');
  await login(page);
  await page.getByRole('link', { name: /Öppna och starta körning/ }).click();
  await expect(page.getByRole('button', { name: 'Starta körning', exact: true })).toBeVisible();
  await expect(page.getByText('Ditt uppdrag', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-assignment.png' });
  await page.getByRole('button', { name: 'Starta körning', exact: true }).click();
  await page.getByRole('button', { name: 'Slutför med leveransbevis', exact: true }).click();
  await page.getByLabel('Mottagarens namn').fill('Testmottagare');
  await page.getByLabel('Leveranskommentar').fill('Levererat i testmiljön.');
  await page.getByRole('button', { name: 'Slutför uppdrag', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('navigation').getByRole('link', { name: 'Tidrapport' }).click();
  await expect(page.getByText('Testkund', { exact: true })).toBeVisible();
  expect(unexpected).toEqual([]);
});
