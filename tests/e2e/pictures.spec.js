/** The drawings of the machines: in the panel above the wheels, on a machine's page, in settings; and who made them. */
import { test, expect } from './fixtures.js';
import { actionButton, backTo, machineRow, openApp, openSettings, pick, startDate, startWith } from './app.js';

const sheetPicture = (page) => page.locator('#sheetPicture');

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

test.describe('a machine\'s page', () => {
  test('three drawings of the move, then the chart', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Statistics' }).click();
    await page.locator('#statsBody').getByRole('button', { name: 'Leg press', exact: true }).click();
    const drawings = page.getByRole('img', { name: 'Leg press: how the move goes' });
    await expect(drawings).toBeVisible();
    const frames = drawings.locator('img');
    await expect(frames).toHaveCount(3);
    for (const n of [1, 2, 3]) {
      await expect(frames.nth(n - 1)).toHaveAttribute('src', `pictures/leg-press/frame-${n}.svg`);
      await expect.poll(() => loaded(frames.nth(n - 1))).toBe(true);
    }
    const [drawn, chart] = await Promise.all([drawings.boundingBox(), page.locator('#machineStatsBody .chart').boundingBox()]);
    expect(drawn.y + drawn.height).toBeLessThan(chart.y);
  });

  test('a machine without a drawing has none', async ({ page }) => {
    await startWith(page, {
      machines: [{ id: 'm-sled', name: 'Sled push' }],
      lines: [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-sled', name: 'Sled push', weight: 40, sets: 3, reps: 10 }],
    });
    await openApp(page);
    await page.getByRole('button', { name: 'Statistics' }).click();
    await page.locator('#statsBody').getByRole('button', { name: 'Sled push', exact: true }).click();
    await expect(page.locator('#machineStatsBody .chart')).toBeVisible();
    await expect(page.locator('#machineStatsBody .drawings')).toHaveCount(0);
  });
});

test('statistics lists only the machines that have been logged', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.locator('#statsBody [data-machine]')).toHaveText(['Chest press', 'Lat pulldown', 'Leg press', 'Seated row', 'Shoulder press']);
});

test.describe('settings', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await openSettings(page);
  });

  test('a machine with a drawing ends in a small one; a machine without ends in none', async ({ page }) => {
    const thumb = machineRow(page, 'Leg press').locator('img.thumb');
    await expect(thumb).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
    await expect(thumb).toHaveAttribute('alt', '');
    await thumb.scrollIntoViewIfNeeded();
    await expect.poll(() => loaded(thumb)).toBe(true);
    await expect(machineRow(page, 'Dumbbells').locator('img')).toHaveCount(0);
  });

  test('a machine written with a name from the list gets its drawing', async ({ page }) => {
    await machineRow(page, 'Belt squat').focus();
    await page.keyboard.press('Delete');
    await expect(machineRow(page, 'Belt squat')).toHaveCount(0);
    await page.getByRole('button', { name: 'tap here to add a machine' }).click();
    const field = page.locator('#addMachineRow input');
    await field.fill('belt SQUAT');
    await field.press('Enter');
    await field.press('Escape');
    await expect(machineRow(page, 'belt SQUAT').locator('img.thumb')).toHaveAttribute('src', 'pictures/belt-squat/frame-1.svg');
  });

  test('the drawings are credited: who made them, what they are based on, their license, and what was changed', async ({ page }) => {
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
});

test.describe('a notebook from before drawings', () => {
  const OLD = {
    machines: [{ id: 'm-leg-press', name: 'Leg press' }, { id: 'm-sled', name: 'Sled push' }],
    lines: [{ id: 'd', type: 'date', date: '2026-11-20' }, { id: 'l', type: 'machine', machineId: 'm-leg-press', name: 'Leg press', weight: 80, sets: 3, reps: 12 }],
  };
  const machineNames = (page) => page.locator('#machineList .row .name').allTextContents();

  test('gets the machines with drawings once: its own keep their place, and one you remove stays removed', async ({ page }) => {
    await startWith(page, OLD);
    await openApp(page);
    await openSettings(page);
    const names = await machineNames(page);
    expect(names).toHaveLength(144); // its 2 and 142 more: Leg press was there already
    expect(names.filter((n) => n === 'Leg press')).toHaveLength(1);
    await expect(machineRow(page, 'Leg press').locator('img.thumb')).toHaveAttribute('src', 'pictures/leg-press/frame-1.svg');
    await expect(machineRow(page, 'Sled push').locator('img')).toHaveCount(0);

    await machineRow(page, 'Hack squat').focus();
    await page.keyboard.press('Delete');
    await expect(machineRow(page, 'Hack squat')).toHaveCount(0);
    await page.reload();
    await openSettings(page);
    await expect(page.locator('#machineList .row')).toHaveCount(143);
    await expect(machineRow(page, 'Hack squat')).toHaveCount(0);
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
    await openSettings(page);
    expect(await machineNames(page)).toHaveLength(144);
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
