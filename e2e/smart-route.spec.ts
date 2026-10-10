import { test, expect, drivers } from './dispatch-fixture';
test('day proposal has honest metrics, review gate and recoverable stale approval', async ({ page, dispatchApi }, testInfo) => {
  let approvals = 0;
  const job = dispatchApi.assignments.find(item => item.status === 'pending') ?? dispatchApi.assignments[0];
  await page.route('**/functions/v1/optimize-routes', async route => {
    expect(route.request().postDataJSON()).toEqual({ planDate: '2026-09-08' });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      plan: { id: 'plan', plan_date: '2026-09-08', optimizer_provider: 'vroom', status: 'proposed', distance_before_m: null, distance_after_m: 7000, duration_before_s: null, duration_after_s: 1000, warning: 'Jämförbar baslinje saknas.' },
      stops: [{ assignmentId: job.id, driverId: drivers[0].id, vehicleId: null, sequence: 1, arrivalAt: '2026-09-08T10:00:00Z', departureAt: '2026-09-08T10:15:00Z', distanceM: 7000, durationS: 1000, reason: 'Fixture' }], unassignedIds: [],
    }) });
  });
  await page.route('**/rest/v1/rpc/approve_route_plan', route => {
    approvals++;
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Uppdrag eller chaufförer har ändrats. Optimera dagen igen.' }) });
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/admin/routes');
  await page.getByRole('button', { name: 'Optimera dagen', exact: true }).click();
  await expect(page.getByText('Ej jämförbart', { exact: true })).toHaveCount(2);
  expect(approvals).toBe(0);
  await page.getByRole('button', { name: 'Godkänn och skicka', exact: true }).click();
  await expect(page.getByRole('alertdialog', { name: 'Skicka den nya körordningen?' })).toBeVisible();
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
  expect(approvals).toBe(0);
  await page.getByRole('button', { name: 'Godkänn och skicka', exact: true }).click();
  await page.getByRole('button', { name: 'Godkänn', exact: true }).click();
  await expect(page.getByText('Uppdrag eller chaufförer har ändrats. Optimera dagen igen.', { exact: true })).toBeVisible();
  await expect(page.getByText('Godkänd och skickad', { exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('smart-route-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed'; }).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 50), width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right })))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('smart-route-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});
