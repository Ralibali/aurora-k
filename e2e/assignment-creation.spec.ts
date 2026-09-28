import type { Page } from '@playwright/test';
import { test, expect } from './dispatch-fixture';

async function fillAssignment(page: Page, service: string) {
  await page.goto('/admin/assignments/new');
  await page.getByLabel('Uppdragstyp', { exact: true }).click();
  await page.getByRole('option', { name: service, exact: true }).click();
  await page.getByLabel('Kund', { exact: true }).click();
  await page.getByRole('option', { name: 'Nordic Distribution' }).click();
  await page.getByLabel('Arbetsplats / hämtningsadress', { exact: true }).fill('Industrigatan 10, Linköping');
  await page.getByLabel('Datum och starttid').fill('2026-09-28T08:00');
  await page.getByLabel('Tilldela chaufför', { exact: true }).click();
  await page.getByRole('option', { name: 'Erik Andersson' }).click();
}

test('creates a container swap when company settings are missing, with a complete driver brief', async ({ page, dispatchApi }, testInfo) => {
  dispatchApi.missingDriverSettings = true;
  await fillAssignment(page, 'Container – byte');
  await expect(page.getByText('Företaget saknar sparade förval.', { exact: false })).toBeVisible();
  await page.getByLabel('Container ut – ID').fill('C-024');
  await page.getByLabel('Container in – ID').fill('C-018');
  await page.getByLabel('Volym (m³)').fill('10');
  await page.getByLabel('Material / avfallsslag').fill('Trä');
  await page.getByLabel('Planerat hämtdatum').fill('2026-10-05');
  await page.getByLabel('Avtalad dygnshyra (kr exkl. moms)').fill('80');
  await page.getByLabel('Kontakt på plats').fill('Platschef, 0700000000');
  await page.screenshot({ path: testInfo.outputPath('container-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Skapa uppdrag', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/assignments$/);
  expect(dispatchApi.assignmentCreates).toHaveLength(1);
  expect(dispatchApi.assignmentCreates[0]).toHaveLength(1);
  expect(dispatchApi.assignmentCreates[0][0]).toMatchObject({
    service_type: 'Container – byte', require_signature: true, require_photo: true,
    company_id: '10000000-0000-4000-8000-000000000001',
    scheduled_start: '2026-09-28T06:00:00.000Z',
  });
  expect(dispatchApi.assignmentCreates[0][0].instructions).toContain('Container in: C-018');
  expect(dispatchApi.assignmentCreates[0][0].instructions).toContain('80 kr/dygn');
});

test('retains crane details after a database error and retries without a saved partial series', async ({ page, dispatchApi }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fillAssignment(page, 'Kranbil – lyft');
  await page.getByLabel('Gods / lyftobjekt').fill('Maskin');
  await page.getByLabel('Uppgiven vikt (kg)').fill('2500');
  await page.getByLabel('Önskad räckvidd (m)').fill('12');
  await page.screenshot({ path: testInfo.outputPath('crane-mobile.png'), fullPage: true });
  await page.getByRole('switch').last().click();
  await page.getByLabel('Upprepa till och med').fill('2026-10-12');
  dispatchApi.failNextMutation = true;
  await page.getByRole('button', { name: 'Skapa uppdrag', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Kontrollera vald kund' })).toBeVisible();
  await expect(page.getByLabel('Uppgiven vikt (kg)')).toHaveValue('2500');
  expect(dispatchApi.assignmentCreates[0]).toHaveLength(3);
  expect(dispatchApi.assignments).toHaveLength(7);
  await page.getByRole('button', { name: 'Skapa uppdrag', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/assignments$/);
  expect(dispatchApi.assignments).toHaveLength(10);
  expect(dispatchApi.assignmentCreates).toHaveLength(2);
  expect(dispatchApi.assignmentCreates[1].every(row => String(row.instructions).includes('Uppgiven vikt: 2500 kg'))).toBe(true);
});

test('does not silently replace a failed settings request with defaults', async ({ page, dispatchApi }) => {
  dispatchApi.settingsReadError = true;
  await fillAssignment(page, 'Kranbil – lyft');
  await page.getByRole('button', { name: 'Skapa uppdrag', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'standardkrav kunde inte hämtas' })).toBeVisible();
  expect(dispatchApi.assignmentCreates).toHaveLength(0);
});
