/**
 * The machines: the list of machines, one machine's page, plans; names that follow the list; where what each
 * machine works comes from (credited in README.md, not in the app); and no drawings anywhere.
 */
import { test, expect } from './fixtures.js';
import { actionButton, backTo, bringBack, machineNames, machineRow, openApp, openMachines, openSettings, pick, startWith } from './app.js';

const SLED = [{ id: 'm-sled', name: 'Sled push' }];
const SLED_LINES = [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-sled', name: 'Sled push', weight: 40, sets: 3, reps: 10 }];

/** Opens the page of a machine from the list of machines. */
async function openMachine(page, name) {
  await openMachines(page);
  await machineRow(page, name).click();
  await expect(page.locator('#machineStatsTitle')).toHaveText(name);
}

test('no screen or panel shows a drawing, or asks for one', async ({ page }) => {
  const asked = [];
  page.on('request', (request) => {
    if (request.url().includes('/pictures/')) asked.push(request.url());
  });
  await openApp(page);
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await pick(page, 'Machine', 'Leg press');
  await expect(page.locator('img')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await openMachine(page, 'Leg press');
  await expect(page.locator('img')).toHaveCount(0);
  await page.locator('section:not([hidden]) .back-btn').click();
  await expect(page.locator('#machines')).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);
  expect(asked).toEqual([]);
});

test('the list of machines: tap a machine to open its page; back goes to the list', async ({ page }) => {
  await openApp(page);
  await openMachines(page);
  await machineRow(page, 'Hack squat').click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Hack squat');
  await page.locator('section:not([hidden]) .back-btn').click();
  await expect(page.locator('#machines')).toBeVisible();
});

test.describe('a machine\'s page', () => {
  test('what it works, and with what; then your weights', async ({ page }) => {
    await openApp(page);
    await openMachine(page, 'Leg press');
    const info = page.locator('#machineStatsBody .info');
    await expect(info).toHaveText(['mostlyquads', 'alsoglutes, hamstrings', 'witha machine']);
    await expect(page.locator('#machineStatsBody h2')).toHaveText(['what it works', 'your weights']);
    await expect(page.locator('#machineStatsBody .chart')).toBeVisible();
    const [about, chart] = await Promise.all([info.last().boundingBox(), page.locator('#machineStatsBody .chart').boundingBox()]);
    expect(about.y).toBeLessThan(chart.y);
  });

  test('a machine that works nothing else says only what it works mostly', async ({ page }) => {
    await openApp(page);
    await openMachine(page, 'Leg extension');
    await expect(page.locator('#machineStatsBody .info')).toHaveText(['mostlyquads', 'witha machine']);
    await expect(page.locator('#machineStatsBody')).toContainText('nothing logged yet');
  });

  test('Dumbbells: nothing about what it works, only your weights', async ({ page }) => {
    await openApp(page);
    await openMachine(page, 'Dumbbells');
    await expect(page.locator('#machineStatsBody .info')).toHaveCount(0);
    await expect(page.locator('#machineStatsBody h2')).toHaveText(['your weights']);
  });

  test('a machine of your own, from before the list: nothing about what it works, only your weights', async ({ page }) => {
    await startWith(page, { machines: SLED, lines: SLED_LINES });
    await openApp(page);
    await openMachine(page, 'Sled push');
    await expect(page.locator('#machineStatsBody .info')).toHaveCount(0);
    await expect(page.locator('#machineStatsBody h2')).toHaveText(['your weights']);
    await expect(page.locator('#machineStatsBody .chart')).toBeVisible();
  });
});

test('statistics lists only the machines that have been logged, and opens the same page', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.locator('#statsBody [data-machine]')).toHaveText(['Chest press', 'Lat pulldown', 'Leg press', 'Seated row', 'Shoulder press']);
  await page.locator('#statsBody').getByRole('button', { name: 'Chest press', exact: true }).click();
  await expect(page.locator('#machineStatsBody .info')).toHaveText(['mostlychest', 'alsotriceps, shoulders', 'witha machine']);
});

test('settings has no credits: no links out of the app', async ({ page }) => {
  await openApp(page);
  await openSettings(page);
  await expect(page.locator('#settings').getByRole('link')).toHaveCount(0);
  await expect(page.getByText('Workout Guide')).toHaveCount(0);
});

test('a plan: tap a machine to open its page', async ({ page }) => {
  await startWith(page, {
    machines: [{ id: 'm-leg-press', name: 'Leg press' }, ...SLED],
    plans: [{ id: 'p', name: 'Leg day', machineIds: ['m-leg-press', 'm-sled'] }],
    lines: SLED_LINES,
  });
  await openApp(page);
  await openMachines(page);
  await page.locator('#planList .row').filter({ hasText: 'Leg day' }).click();
  await expect(page.locator('#planMachines .name')).toHaveText(['Leg press', 'Sled push']);
  await page.locator('#planMachines .row').first().locator('.name').click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Leg press');
  await page.locator('section:not([hidden]) .back-btn').click();
  await expect(page.locator('#planTitle')).toHaveText('Leg day');
});

test.describe('a notebook from before the list', () => {
  const OLD = {
    machines: [{ id: 'm-leg-press', name: 'Leg press' }, ...SLED],
    lines: [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-leg-press', name: 'Leg press', weight: 80, sets: 3, reps: 12 }],
  };

  test('gets the machines of the list once, and keeps its own', async ({ page }) => {
    await startWith(page, OLD);
    await openApp(page);
    await openMachines(page);
    const names = await machineNames(page);
    expect(names).toHaveLength(147); // its 2, and 145 more: Leg press was there already
    expect(names.filter((n) => n === 'Leg press')).toHaveLength(1);
    expect(names).toContain('Sled push');
    await page.reload();
    await openMachines(page);
    await expect(page.locator('#machineList [data-machine]')).toHaveCount(147);
  });

  test('a machine renamed, or named the way another app names it, takes its name in the list, in the notebook too', async ({ page }) => {
    await startWith(page, {
      machines: [{ id: 'm-leg-press', name: 'Seated leg press' }, { id: 'm-h1', name: 'Squat (barbell)' }],
      lines: [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-leg-press', name: 'Seated leg press', weight: 80, sets: 3, reps: 12 }],
    });
    await openApp(page);
    await expect(page.locator('#lines .row .name')).toHaveText(['Leg press']);
    await openMachines(page);
    const names = await machineNames(page);
    expect(names).toEqual(expect.arrayContaining(['Leg press', 'Squat']));
    expect(names).not.toContain('Seated leg press');
    expect(names).not.toContain('Squat (barbell)');
  });

  test('a backup from before the list gets them when it is imported', async ({ page }) => {
    await openApp(page);
    const backup = { app: 'fitness-notebook', version: 1, ...OLD };
    await bringBack(page, 'text');
    await page.getByRole('textbox', { name: 'Text of a backup' }).fill(JSON.stringify(backup));
    await actionButton(page).click(); // Check the text
    await actionButton(page).click(); // Replace my notebook
    await backTo(page, 'notebook');
    await openMachines(page);
    expect(await machineNames(page)).toHaveLength(147);
  });

  test('the drawing a machine had is left out of the saved notebook', async ({ page }) => {
    await startWith(page, { ...OLD, machines: [{ id: 'm-leg-press', name: 'Leg press', picture: 'leg-press' }] });
    await openApp(page);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fitness-notebook.v1')));
    expect(saved.machines).toHaveLength(146);
    expect(saved.machines[0]).toEqual({ id: 'm-leg-press', name: 'Leg press' });
    expect(saved.machines.filter((m) => 'picture' in m)).toEqual([]);
  });
});
