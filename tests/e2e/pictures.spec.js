/**
 * The drawings of the machines, and the machines' own pages: the panel above the wheels, the list of machines,
 * one machine's page, plans; names that follow the drawings; and who made the drawings.
 */
import { test, expect } from './fixtures.js';
import { actionButton, backTo, machineNames, machineRow, openApp, openMachines, openSettings, pick, startDate, startWith } from './app.js';

const sheetPicture = (page) => page.locator('#sheetPicture');
const bigDrawing = (page) => page.locator('#machineStatsBody .big-drawing img');
const SLED = [{ id: 'm-sled', name: 'Sled push' }];
const SLED_LINES = [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-sled', name: 'Sled push', weight: 40, sets: 3, reps: 10 }];

/** Opens the page of a machine from the list of machines. */
async function openMachine(page, name) {
  await openMachines(page);
  await machineRow(page, name).click();
  await expect(page.locator('#machineStatsTitle')).toHaveText(name);
}

/** Whether an image has loaded: the browser knows its size. */
const loaded = (img) => img.evaluate((el) => el.complete && el.naturalWidth > 0);

test.describe('the panel', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('to log a set: the drawing of the machine on the wheel, which follows the wheel; "no picture" for one without', async ({ page }) => {
    await page.getByRole('button', { name: 'tap to add a line' }).click();
    await pick(page, 'Machine', 'Leg press');
    const img = sheetPicture(page).locator('img');
    await expect(img).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
    await expect(img).toHaveAttribute('alt', '');
    await expect.poll(() => loaded(img)).toBe(true);

    await pick(page, 'Machine', 'Leg curl');
    await expect(img).toHaveAttribute('src', 'pictures/leg-curl/frame-1.svg');

    await pick(page, 'Machine', 'Dumbbells');
    await expect(sheetPicture(page)).toHaveText('no picture');
    await expect(sheetPicture(page).locator('img')).toHaveCount(0);
  });

  test('writing your own line folds the drawing away with the wheels', async ({ page }) => {
    await page.getByRole('button', { name: 'tap to add a line' }).click();
    await expect(sheetPicture(page)).toBeVisible();
    await page.getByRole('textbox', { name: 'Write your own line' }).fill('Bike 15 min');
    await expect(sheetPicture(page)).toBeHidden();
  });

  test('a panel without machines has no room for a drawing', async ({ page }) => {
    await page.getByRole('button', { name: 'Start a new date' }).click();
    await expect(actionButton(page)).toBeVisible();
    await expect(sheetPicture(page)).toBeHidden();
  });

  test('to add a machine to a plan: the drawing of the machine on the wheel', async ({ page }) => {
    await openSettings(page);
    await page.getByRole('button', { name: 'tap here to add a plan' }).click();
    await page.getByRole('textbox', { name: 'Name of the plan' }).fill('Leg day');
    await actionButton(page).click();
    await page.getByRole('button', { name: 'tap here to add a machine' }).click();
    await pick(page, 'Machine', 'Hack squat');
    await expect(sheetPicture(page).locator('img')).toHaveAttribute('src', 'pictures/hack-squat/frame-1.svg');
  });
});

test.describe('the list of machines', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await openMachines(page);
  });

  test('a machine with a drawing ends in a small one; a machine without ends in none', async ({ page }) => {
    const thumb = machineRow(page, 'Leg press').locator('img.thumb');
    await expect(thumb).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
    await expect(thumb).toHaveAttribute('alt', '');
    await thumb.scrollIntoViewIfNeeded();
    await expect.poll(() => loaded(thumb)).toBe(true);
    await expect(machineRow(page, 'Dumbbells').locator('img')).toHaveCount(0);
  });

  test('tap a machine to open its page; back goes to the list', async ({ page }) => {
    await machineRow(page, 'Hack squat').click();
    await expect(page.locator('#machineStatsTitle')).toHaveText('Hack squat');
    await page.locator('section:not([hidden]) .back-btn').click();
    await expect(page.locator('#machines')).toBeVisible();
  });
});

test.describe('a machine\'s page', () => {
  test('a big drawing: tap it for the next step of the move, or tap the number of a step', async ({ page }) => {
    await openApp(page);
    await openMachine(page, 'Leg press');
    await expect(bigDrawing(page)).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
    await expect.poll(() => loaded(bigDrawing(page))).toBe(true);
    const step = (n) => page.getByRole('group', { name: 'Steps of the move' }).getByRole('button', { name: String(n), exact: true });
    await expect(step(1)).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Leg press: the next step of the move' }).click();
    await expect(bigDrawing(page)).toHaveAttribute('src', 'pictures/leg-press/frame-2.svg');
    await expect(step(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(step(1)).toHaveAttribute('aria-pressed', 'false');

    await step(3).click();
    await expect(bigDrawing(page)).toHaveAttribute('src', 'pictures/leg-press/frame-3.svg');
    await page.getByRole('button', { name: 'Leg press: the next step of the move' }).click();
    await expect(bigDrawing(page)).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
  });

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

  test('a machine without a drawing: no drawing, nothing about what it works, only your weights', async ({ page }) => {
    await startWith(page, { machines: SLED, lines: SLED_LINES });
    await openApp(page);
    await openMachine(page, 'Sled push');
    await expect(page.locator('#machineStatsBody .big-drawing')).toHaveCount(0);
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
  await expect(bigDrawing(page)).toHaveAttribute('src', 'pictures/machine-chest-press/frame-1.svg');
});

test('settings credits the drawings: who made them, what they are based on, their license, and what was changed', async ({ page }) => {
  await openApp(page);
  await openSettings(page);
  const credits = [
    ['Workout Guide, by Bryl Lim', 'https://github.com/bryllim/workout-guide'],
    ['based on Everkinetic', 'https://github.com/everkinetic/data'],
    ['license CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  ];
  await expect(page.getByRole('heading', { name: 'drawings' })).toBeVisible();
  for (const [name, href] of credits) {
    const link = page.getByRole('link', { name });
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
  }
  await expect(page.getByText('cropped and colored for this notebook')).toBeVisible();
});

test('a plan: each machine with its drawing; tap one to open its page', async ({ page }) => {
  await startWith(page, {
    machines: [{ id: 'm-leg-press', name: 'Leg press', picture: 'leg-press' }, ...SLED],
    plans: [{ id: 'p', name: 'Leg day', machineIds: ['m-leg-press', 'm-sled'] }],
    lines: SLED_LINES,
  });
  await openApp(page);
  await openSettings(page);
  await page.locator('#planList .row').filter({ hasText: 'Leg day' }).click();
  const rows = page.locator('#planMachines .row');
  await expect(rows.first().locator('img.thumb')).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
  await expect(rows.last().locator('img')).toHaveCount(0);
  await rows.first().locator('.name').click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Leg press');
  await page.locator('section:not([hidden]) .back-btn').click();
  await expect(page.locator('#planTitle')).toHaveText('Leg day');
});

test('a machine you made before its drawing came gets it, in the list and the notebook', async ({ page }) => {
  await startWith(page, {
    machines: [{ id: 'm-leg-press', name: 'Leg press', picture: 'leg-press' }, { id: 'm-own', name: 'Rotary torso' }],
    lines: [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-own', name: 'Rotary torso', weight: 30, sets: 3, reps: 12 }],
  });
  await openApp(page);
  await expect(page.locator('#lines .row .name')).toHaveText(['Rotary torso']);
  await openMachines(page);
  expect(await machineNames(page)).toEqual(['Leg press', 'Rotary torso']);
  await expect(machineRow(page, 'Rotary torso').locator('img.thumb')).toHaveAttribute('src', 'pictures/rotary-torso/frame-1.svg');
});

test.describe('a notebook from before drawings', () => {
  const OLD = {
    machines: [{ id: 'm-leg-press', name: 'Leg press' }, ...SLED],
    lines: [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-leg-press', name: 'Leg press', weight: 80, sets: 3, reps: 12 }],
  };

  test('gets the machines with drawings once, and keeps its own', async ({ page }) => {
    await startWith(page, OLD);
    await openApp(page);
    await openMachines(page);
    const names = await machineNames(page);
    expect(names).toHaveLength(148); // its 2, and 146 more: Leg press was there already
    expect(names.filter((n) => n === 'Leg press')).toHaveLength(1);
    await expect(machineRow(page, 'Leg press').locator('img.thumb')).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
    await expect(machineRow(page, 'Sled push').locator('img')).toHaveCount(0);
    await page.reload();
    await openMachines(page);
    await expect(page.locator('#machineList [data-machine]')).toHaveCount(148);
  });

  test('a machine renamed, or named the way another app names it, takes the name of its drawing, in the notebook too', async ({ page }) => {
    await startWith(page, {
      machines: [{ id: 'm-leg-press', name: 'Seated leg press' }, { id: 'm-h1', name: 'Squat (barbell)' }],
      lines: [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-leg-press', name: 'Seated leg press', weight: 80, sets: 3, reps: 12 }],
    });
    await openApp(page);
    await expect(page.locator('#lines .row .name')).toHaveText(['Leg press']);
    await openMachines(page);
    await expect(machineRow(page, 'Leg press').locator('img.thumb')).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
    await expect(machineRow(page, 'Squat').locator('img.thumb')).toHaveAttribute('src', 'pictures/squat/frame-1.svg');
    expect(await machineNames(page)).not.toContain('Seated leg press');
    expect(await machineNames(page)).not.toContain('Squat (barbell)');
  });

  test('a backup from before drawings gets them when it is imported', async ({ page }) => {
    await openApp(page);
    await openSettings(page);
    const backup = { app: 'fitness-notebook', version: 1, ...OLD };
    await page.getByRole('button', { name: 'import from text' }).click();
    await page.getByRole('textbox', { name: 'Text of a backup' }).fill(JSON.stringify(backup));
    await actionButton(page).click(); // Check the text
    await actionButton(page).click(); // Replace my notebook
    await backTo(page, 'notebook');
    await openMachines(page);
    expect(await machineNames(page)).toHaveLength(148);
    await expect(machineRow(page, 'Leg press').locator('img.thumb')).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
  });
});

test('a new date from a plan: the panel opens on the first machine, with its drawing', async ({ page }) => {
  await startWith(page, {
    machines: [{ id: 'm-leg-press', name: 'Leg press', picture: 'leg-press' }, { id: 'm-leg-curl', name: 'Leg curl', picture: 'leg-curl' }],
    plans: [{ id: 'p', name: 'Leg day', machineIds: ['m-leg-curl', 'm-leg-press'] }],
    lines: [{ id: 'd', type: 'date', date: '2026-11-20' }],
  });
  await openApp(page);
  await startDate(page, 'Leg day');
  await expect(page.getByRole('spinbutton', { name: 'Machine', exact: true })).toHaveAttribute('aria-valuetext', 'Leg curl');
  await expect(sheetPicture(page).locator('img')).toHaveAttribute('src', 'pictures/leg-curl/frame-1.svg');
});
