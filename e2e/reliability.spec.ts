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
  await expect(page.getByRole('dialog')).toHaveCount(0);
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
