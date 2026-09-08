import { test, expect } from './dispatch-fixture';

test('integration settings report missing setup on desktop and mobile', async ({ page }) => {
  await page.route('**/functions/v1/fortnox', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ configured: false, organizationValid: false, company: { name: 'Testbolag', organizationNumber: '5591234567' }, connection: null }) }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin/settings?section=integrations');
  await expect(page.getByRole('button', { name: 'Anslut Fortnox', exact: true })).toBeDisabled();
  await expect(page.getByText('Väntar på konfiguration', { exact: true })).toBeVisible();
  await expect(page.getByText('Grundkarta och navigeringslänkar tillgängliga', { exact: true })).toBeVisible();
  await page.screenshot({ path: '../outputs/fortnox-settings-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Anslut Fortnox', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('main .max-w-3xl > div')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '../outputs/fortnox-settings-mobile.png' });
  expect(errors).toEqual([]);
});

test('callback scrubs code before scripts and waits for explicit confirmation', async ({ page, context }) => {
  const state = 'a'.repeat(72);
  await context.addInitScript(value => sessionStorage.setItem('aurora-fortnox-state', value), state);
  let completed = 0;
  await page.route('**/functions/v1/fortnox', async route => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({ action: 'complete', state, code: 'test-only-authorization-code' });
    completed++;
    await route.fulfill({ contentType: 'application/json', body: '{"connected":true,"name":"Testbolag"}' });
  });
  await page.goto(`/integrations/fortnox/callback?code=test-only-authorization-code&state=${state}`);
  await expect(page.getByRole('button', { name: 'Bekräfta anslutning', exact: true })).toBeEnabled();
  expect(new URL(page.url()).search).toBe('');
  expect(await page.evaluate(() => '__auroraTakeFortnoxCallback' in window)).toBe(false);
  expect(completed).toBe(0);
  await page.getByRole('button', { name: 'Bekräfta anslutning', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fortnox är anslutet', exact: true })).toBeVisible();
  expect(completed).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem('aurora-fortnox-state'))).toBeNull();
});

test('callback rejects an unrelated browser state without contacting Fortnox', async ({ page }) => {
  let requests = 0;
  await page.route('**/functions/v1/fortnox', async route => { requests++; await route.abort(); });
  await page.goto(`/integrations/fortnox/callback?code=test-only&state=${'b'.repeat(72)}`);
  await expect(page.getByRole('button', { name: 'Bekräfta anslutning', exact: true })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Anslutningsförsöket saknas');
  expect(requests).toBe(0);
});

test('invoice export requires checking and confirming the customer before creating a draft', async ({ page }) => {
  await page.route('**/rest/v1/invoices*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'invoice-a', status: 'draft', invoice_number: 42, invoice_date: '2026-09-08', due_date: '2026-10-08', total_inc_vat: 250, customer: { name: 'Testkund' } }]) }));
  const actions: string[] = [];
  await page.route('**/functions/v1/fortnox', async route => {
    const body = route.request().postDataJSON(); actions.push(body.action);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body.action === 'customer' ? { customer: { number: '1001', name: 'Testkund Fortnox', organizationNumber: '5592720220' }, total: 250 } : { documentNumber: '123' }) });
  });
  await page.goto('/admin/invoices');
  await page.getByRole('button', { name: 'Fortnox', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Kundnummer i Fortnox').fill('1001');
  expect(actions).toEqual([]);
  await dialog.getByRole('button', { name: 'Kontrollera kund och underlag' }).click();
  await expect(dialog.getByText('Testkund Fortnox', { exact: true })).toBeVisible();
  expect(actions).toEqual(['customer']);
  await dialog.getByRole('button', { name: 'Bekräfta kund och skapa utkast' }).click();
  await expect(dialog.getByRole('status')).toContainText('faktura 123');
  expect(actions).toEqual(['customer', 'export']);
});
