import { test, expect } from './dispatch-fixture';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

test('customer notification waits for delivery confirmation and preserves the request for retry', async ({ page, dispatchApi }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/admin/assignments/${dispatchApi.assignments[0].id}`);
  await page.getByRole('button', { name: 'Avisera', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('customer@example.test');
  dispatchApi.failNextMail = true;
  await page.getByLabel('Meddelande (valfritt)').fill('Vi anländer till lastport 2.');
  await page.getByRole('button', { name: 'Skicka mejl', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('tillfälligt otillgänglig');
  await expect(page.getByLabel('Meddelande (valfritt)')).toHaveValue('Vi anländer till lastport 2.');
  await page.getByRole('button', { name: 'Försök skicka igen' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  expect(dispatchApi.mailRequests).toHaveLength(2);
  expect(dispatchApi.mailRequests[0]).toEqual(dispatchApi.mailRequests[1]);
  expect(dispatchApi.mailRequests[0].mode).toBe('customer_notification');
  expect(errors).toEqual([]);
});

test('mobile profile preview changes nothing until saved and persists all five preferences', async ({ page, dispatchApi }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/driver-settings');
  await page.getByRole('button', { name: /Bud & distribution/ }).click();
  await expect(page.getByText('Tidrapport: döljs i navigationen')).toBeVisible();
  expect(dispatchApi.settingsWrites).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath('driver-profile-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Använd vald mall' }).click();
  await expect(page.getByText('Nuvarande förarinställningar')).toBeVisible();
  expect(dispatchApi.settingsWrites).toHaveLength(1);
  expect(dispatchApi.driverSettings).toMatchObject({ require_signature: true, require_photo: true, show_time_report: false, show_availability_toggle: true, show_total_hours: false });
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Visa tidrapporter', exact: true })).not.toBeChecked();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('saving an unchanged assignment amount cannot erase it', async ({ page, dispatchApi }) => {
  Object.assign(dispatchApi.assignments[0], { cost: 1250 });
  await page.goto(`/admin/assignments/${dispatchApi.assignments[0].id}`);
  await expect(page.getByLabel('Kostnad / fakturabelopp (kr)')).toHaveValue('1250');
  await expect(page.getByRole('button', { name: 'Spara', exact: true })).toBeDisabled();
  expect(dispatchApi.writes).toHaveLength(0);
});

test('new assignments inherit company delivery requirements and allow explicit changes', async ({ page, dispatchApi }) => {
  dispatchApi.driverSettings.require_signature = true;
  dispatchApi.driverSettings.require_photo = false;
  await page.goto('/admin/assignments/new');
  const signature = page.getByRole('switch', { name: 'Kräv mottagarsignatur', exact: true });
  const photo = page.getByRole('switch', { name: 'Kräv fraktsedelsfoto', exact: true });
  await expect(signature).toBeChecked();
  await expect(photo).not.toBeChecked();
  await signature.click();
  await photo.click();
  await expect(signature).not.toBeChecked();
  await expect(photo).toBeChecked();
  expect(dispatchApi.writes).toHaveLength(0);
});

test('Excel export produces a readable workbook with time and salary sheets', async ({ page }) => {
  await page.goto('/admin/reports');
  await page.getByText('Löneunderlag och uppdragsdetaljer', { exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Signerad leverans Täby' })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^rapporter-.*\.xlsx$/);
  const file = await download.path();
  expect(file).toBeTruthy();
  const workbook = XLSX.read(await readFile(file!), { type: 'buffer' });
  expect(workbook.SheetNames).toEqual(['Tidrapport', 'Löneunderlag']);
  expect(XLSX.utils.sheet_to_json(workbook.Sheets.Tidrapport)).toContainEqual(expect.objectContaining({ Uppdrag: 'Signerad leverans Täby', Timmar: 2 }));
});

test('invoice review keeps customer-month selection and excludes incomplete delivery evidence', async ({ page, dispatchApi }) => {
  const completed = dispatchApi.assignments[4];
  const ready = { ...completed, id: '30000000-0000-4000-8000-000000000008', title: 'Klar september', require_signature: false };
  const previous = { ...ready, id: '30000000-0000-4000-8000-000000000009', title: 'Klar augusti', actual_start: '2026-08-20T05:00:00Z', actual_stop: '2026-08-20T07:00:00Z' };
  dispatchApi.assignments.push(ready, previous);
  await page.goto('/admin/invoice-basis');
  await page.getByRole('checkbox', { name: 'Välj Nordic Distribution 2026-09', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: `Markera ${completed.title}`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Skapa fakturor (1)', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Skapa fakturor (1)' });
  await expect(panel.getByRole('link', { name: 'Granska faktura' })).toHaveCount(1);
  const url = new URL((await panel.getByRole('link', { name: 'Granska faktura' }).getAttribute('href'))!, 'http://localhost');
  expect(url.pathname).toBe('/admin/invoices/new');
  expect(url.searchParams.get('customer')).toBe(ready.customer_id);
  expect(url.searchParams.get('assignments')).toBe(ready.id);
  expect(dispatchApi.writes).toHaveLength(0);
});

test('bulk attestation retries a failed request and only approves pending reports in the visible period', async ({ page, dispatchApi }) => {
  const completed = dispatchApi.assignments[4];
  const older = { ...completed, id: '30000000-0000-4000-8000-000000000010', actual_start: '2026-08-20T05:00:00Z', actual_stop: '2026-08-20T07:00:00Z' };
  dispatchApi.assignments.push(older);
  const approvals = [
    { id: 'approval-current', assignment_id: completed.id, status: 'pending', assignment: completed },
    { id: 'approval-older', assignment_id: older.id, status: 'pending', assignment: older },
  ];
  const writes: Array<{ id: string; status: string }> = [];
  let fail = true;
  await page.route('**/rest/v1/assignment_approvals*', async route => {
    if (route.request().method() === 'PATCH') {
      const id = new URL(route.request().url()).searchParams.get('id')!.slice(3);
      const body = route.request().postDataJSON();
      writes.push({ id, status: body.status });
      if (fail) { fail = false; return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Försök igen' }) }); }
      Object.assign(approvals.find(item => item.id === id)!, body);
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(approvals) });
  });
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: 'Attestera alla (1)', exact: true }).click();
  await expect(page.getByText('Alla rader kunde inte attesteras. Kontrollera status och försök igen.')).toBeVisible();
  expect(approvals[0].status).toBe('pending');
  await page.getByRole('button', { name: 'Attestera alla (1)', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Attesterad', exact: true })).toBeVisible();
  expect(writes).toEqual([{ id: 'approval-current', status: 'approved' }, { id: 'approval-current', status: 'approved' }]);
  expect(approvals[1].status).toBe('pending');
});
