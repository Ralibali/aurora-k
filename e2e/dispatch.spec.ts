import type { Page } from '@playwright/test';
import { test, expect, drivers } from './dispatch-fixture';

const express = 'Expressleverans Södermalm';
const pallet = 'Pallgods Solna';
const city = 'Butiksrunda City';
const active = 'Temperaturtransport Nacka';
const completed = 'Signerad leverans Täby';
const cancelled = 'Avbokad hämtning Bromma';
const tomorrow = 'Morgondagens leverans Uppsala';

async function openDispatch(page: Page) {
  await page.goto('/admin/assignments');
  await expect(page.getByRole('heading', { name: 'Transportdispatch', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: express, exact: true })).toBeVisible();
  // Playwright's visible check accepts opacity: 0. Verify the page transition
  // cannot hide the entire board for users who request reduced motion.
  await expect(page.locator('main > div > div')).toHaveCSS('opacity', '1');
}

async function openBulkDialog(page: Page, titles = [express, pallet]) {
  for (const title of titles) await page.getByRole('checkbox', { name: `Markera ${title}`, exact: true }).check();
  await page.getByRole('region', { name: 'Valda uppdrag' }).getByRole('button', { name: 'Tilldela chaufför', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tilldela chaufför' })).toBeVisible();
}

async function chooseDriver(page: Page, name: string) {
  await page.getByRole('dialog').getByLabel('Chaufför', { exact: true }).click();
  await page.getByRole('option', { name: new RegExp(`^${name}`) }).click();
}

test('dispatch renders with scoped filters, shareable date/search and no runtime errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openDispatch(page);
  await expect(page.getByRole('button', { name: tomorrow, exact: true })).toBeHidden();
  await expect(page.getByRole('checkbox', { name: `Markera ${completed}`, exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('dispatch-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: 'Brådskande', exact: true }).click();
  await expect(page.getByRole('button', { name: express, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: cancelled, exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: pallet, exact: true })).toBeHidden();

  await page.getByRole('button', { name: 'Alla', exact: true }).click();
  await page.getByRole('textbox', { name: 'Sök uppdrag' }).fill('erik city');
  await expect(page.getByRole('button', { name: city, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: active, exact: true })).toBeHidden();
  await expect(page).toHaveURL(/q=erik\+city/);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Sök uppdrag' })).toHaveValue('erik city');
  await expect(page.getByRole('button', { name: city, exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Rensa sökning' }).click();
  await page.getByRole('button', { name: 'Imorgon', exact: true }).click();
  await expect(page.getByRole('button', { name: tomorrow, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: express, exact: true })).toBeHidden();
  await page.getByLabel('Välj datum', { exact: true }).fill('2026-09-08');
  await expect(page.getByRole('button', { name: express, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Saknar leveransbevis', exact: true }).click();
  await expect(page.getByRole('button', { name: completed, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: active, exact: true })).toBeHidden();
  expect(errors).toEqual([]);
});

test('select all includes only planned visible jobs and filter changes clear the selection', async ({ page, dispatchApi }) => {
  await openDispatch(page);
  await page.getByRole('checkbox', { name: 'Markera alla planerade uppdrag', exact: true }).check();
  await expect(page.getByRole('region', { name: 'Valda uppdrag' })).toContainText('3 valda uppdrag');
  for (const title of [express, pallet, city]) await expect(page.getByRole('checkbox', { name: `Markera ${title}`, exact: true })).toBeChecked();
  for (const title of [active, completed, cancelled]) {
    await expect(page.getByRole('checkbox', { name: `Markera ${title}`, exact: true })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: `Markera ${title}`, exact: true })).toBeDisabled();
  }
  await page.getByRole('button', { name: 'Saknar förare', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Valda uppdrag' })).toBeHidden();
  await page.getByRole('checkbox', { name: 'Markera alla planerade uppdrag', exact: true }).check();
  await expect(page.getByRole('region', { name: 'Valda uppdrag' })).toContainText('2 valda uppdrag');
  await page.getByRole('textbox', { name: 'Sök uppdrag' }).fill('Solna');
  await expect(page.getByRole('region', { name: 'Valda uppdrag' })).toBeHidden();
  expect(dispatchApi.writes).toHaveLength(0);
});

test('driver selection requires review and successful confirmation changes exactly the selected jobs', async ({ page, dispatchApi }) => {
  await openDispatch(page);
  await openBulkDialog(page);
  const dialog = page.getByRole('dialog', { name: 'Tilldela chaufför' });
  await expect(dialog).toContainText(express);
  await expect(dialog).toContainText(pallet);
  await expect(dialog.getByRole('button', { name: 'Tilldela 2 uppdrag', exact: true })).toBeDisabled();
  await chooseDriver(page, 'Maria Lind');
  expect(dispatchApi.writes).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Tillbaka', exact: true }).click();
  expect(dispatchApi.writes).toHaveLength(0);

  await page.getByRole('region', { name: 'Valda uppdrag' }).getByRole('button', { name: 'Tilldela chaufför', exact: true }).click();
  await chooseDriver(page, 'Maria Lind');
  await dialog.getByRole('button', { name: 'Tilldela 2 uppdrag', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('region', { name: 'Valda uppdrag' })).toBeHidden();
  expect(dispatchApi.writes).toHaveLength(1);
  expect(dispatchApi.writes[0].ids).toEqual(dispatchApi.assignments.slice(0, 2).map(item => item.id));
  expect(dispatchApi.writes[0].body).toEqual({ assigned_driver_id: drivers[1].id });
  expect(dispatchApi.writes[0].query.get('status')).toBe('in.(pending,unassigned)');
  expect(dispatchApi.writes[0].query.get('actual_start')).toBe('is.null');
  expect(dispatchApi.writes[0].query.get('company_id')).toBe(`eq.${dispatchApi.assignments[0].company_id}`);
  for (const title of [express, pallet]) await expect(page.getByRole('row').filter({ hasText: title })).toContainText('Maria Lind');
  expect(dispatchApi.assignments[2].assigned_driver_id).toBe(drivers[0].id);
});

test('a failed assignment keeps the dialog and selection available for a retry', async ({ page, dispatchApi }) => {
  await openDispatch(page);
  await openBulkDialog(page);
  await chooseDriver(page, 'Maria Lind');
  dispatchApi.failNextMutation = true;
  const dialog = page.getByRole('dialog', { name: 'Tilldela chaufför' });
  await dialog.getByRole('button', { name: 'Tilldela 2 uppdrag', exact: true }).click();
  await expect(dialog).toContainText('Tilldelningen kunde inte bekräftas');
  expect(dispatchApi.assignments[0].assigned_driver_id).toBeNull();
  expect(dispatchApi.assignments[1].assigned_driver_id).toBeNull();
  await expect(dialog.getByRole('button', { name: 'Tilldela 2 uppdrag', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Tilldela 2 uppdrag', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(dispatchApi.writes).toHaveLength(2);
  expect(dispatchApi.assignments[0].assigned_driver_id).toBe(drivers[1].id);
});

test('known schedule conflicts and unavailable drivers require explicit acknowledgement', async ({ page, dispatchApi }) => {
  await openDispatch(page);
  await openBulkDialog(page, [express]);
  await chooseDriver(page, 'Erik Andersson');
  const dialog = page.getByRole('dialog', { name: 'Tilldela chaufför' });
  const submit = dialog.getByRole('button', { name: 'Tilldela 1 uppdrag', exact: true });
  await expect(dialog).toContainText(`${express} överlappar ${active}`);
  await expect(submit).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Jag har kontrollerat planeringen och vill tilldela ändå.' }).check();
  await expect(submit).toBeEnabled();
  await chooseDriver(page, 'Ledig från tjänst');
  await expect(dialog).toContainText('är markerad som ej tillgänglig');
  await expect(submit).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Jag har kontrollerat planeringen och vill tilldela ändå.' }).check();
  await expect(submit).toBeEnabled();
  expect(dispatchApi.writes).toHaveLength(0);
});

test('a partial update refreshes the actual data and never reports complete success', async ({ page, dispatchApi }) => {
  await openDispatch(page);
  await openBulkDialog(page);
  await chooseDriver(page, 'Maria Lind');
  dispatchApi.partialNextMutation = true;
  const dialog = page.getByRole('dialog', { name: 'Tilldela chaufför' });
  await dialog.getByRole('button', { name: 'Tilldela 2 uppdrag', exact: true }).click();
  await expect(dialog).toContainText('Tilldelningen kunde inte bekräftas');
  expect(dispatchApi.assignments[0].assigned_driver_id).toBe(drivers[1].id);
  expect(dispatchApi.assignments[1].assigned_driver_id).toBeNull();
  await expect(page.getByText('2 uppdrag tilldelade Maria Lind', { exact: true })).toBeHidden();
  await dialog.getByRole('button', { name: 'Tillbaka', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: express })).toContainText('Maria Lind');
  await expect(page.getByRole('row').filter({ hasText: pallet }).getByRole('button', { name: 'Tilldela', exact: true })).toBeVisible();
});

test('cancellation is confirmed, handles failure, and remains visible in cancelled history', async ({ page, dispatchApi }) => {
  await openDispatch(page);
  await page.getByRole('button', { name: `Åtgärder för ${express}`, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Avboka', exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Avboka uppdrag?' });
  await expect(dialog).toContainText(express);
  expect(dispatchApi.writes).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Behåll uppdrag', exact: true }).click();
  expect(dispatchApi.writes).toHaveLength(0);

  await page.getByRole('button', { name: `Åtgärder för ${express}`, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Avboka', exact: true }).click();
  dispatchApi.failNextMutation = true;
  await dialog.getByRole('button', { name: 'Avboka uppdrag', exact: true }).click();
  await expect(dialog).toContainText('Uppdraget kunde inte avbokas');
  expect(dispatchApi.assignments[0].status).toBe('pending');
  await dialog.getByRole('button', { name: 'Avboka uppdrag', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(dispatchApi.assignments[0].status).toBe('cancelled');
  await page.getByRole('button', { name: 'Avbokade', exact: true }).click();
  await expect(page.getByRole('button', { name: express, exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: `Markera ${express}`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Saknar förare', exact: true }).click();
  await expect(page.getByRole('button', { name: express, exact: true })).toBeHidden();
  expect(dispatchApi.writes).toHaveLength(2);
});

test('mobile dispatch exposes selection and assignment without horizontal page overflow', async ({ page, dispatchApi }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDispatch(page);
  await expect(page.getByRole('table')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('dispatch-mobile.png'), fullPage: true });
  await openBulkDialog(page, [pallet]);
  await chooseDriver(page, 'Maria Lind');
  const dialog = page.getByRole('dialog', { name: 'Tilldela chaufför' });
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await dialog.getByRole('button', { name: 'Tilldela 1 uppdrag', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(dispatchApi.writes).toHaveLength(1);
  await expect(page.getByRole('article').filter({ hasText: pallet })).toContainText('Maria Lind');
});

test('a job completed while cancellation is being reviewed cannot be overwritten', async ({ page, dispatchApi }) => {
  await openDispatch(page);
  await page.getByRole('button', { name: `Åtgärder för ${express}`, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Avboka', exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Avboka uppdrag?' });
  await expect(dialog).toBeVisible();
  // Another user's completion has reached the backend, but not this browser yet.
  dispatchApi.assignments[0].status = 'completed';
  await dialog.getByRole('button', { name: 'Avboka uppdrag', exact: true }).click();
  await expect(dialog).toContainText('Uppdraget kunde inte avbokas');
  expect(dispatchApi.assignments[0].status).toBe('completed');
  expect(dispatchApi.writes).toHaveLength(1);
  expect(dispatchApi.writes[0].query.get('status')).toBe('in.(pending,unassigned,active,delayed)');
  await expect(page.getByText('Uppdraget avbokat', { exact: true })).toBeHidden();
  await dialog.getByRole('button', { name: 'Behåll uppdrag', exact: true }).click();
  await page.getByRole('button', { name: 'Slutförda', exact: true }).click();
  await expect(page.getByRole('button', { name: express, exact: true })).toBeVisible();
  // Playwright's visible check accepts opacity: 0. Verify the page transition
  // cannot hide the entire board for users who request reduced motion.
  await expect(page.locator('main > div > div')).toHaveCSS('opacity', '1');
});
