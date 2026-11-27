/** Every screen opens, shows what it should, and the way back works. */
import { test, expect } from './fixtures.js';
import { backTo, machineNames, openApp, openMachines, openSettings, rows } from './app.js';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('the notebook opens on the example days, at the bottom', async ({ page }) => {
  await expect(page.locator('#lines .row--date')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'tap to add a line' })).toBeInViewport();
});

test('statistics: this month, then one machine, then back', async ({ page }) => {
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.locator('#stats')).toBeVisible();
  await expect(page.locator('#statsBody')).toContainText('november');
  await page.locator('#statsBody [data-machine]').filter({ hasText: 'Leg press' }).click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Leg press');
  await expect(page.locator('#machineStatsBody')).toContainText('80');
  await backTo(page, 'stats');
  await expect(page.locator('#stats')).toBeVisible();
  await backTo(page, 'notebook');
  await expect(page.locator('#notebook')).toBeVisible();
});

test('the machines: the 147 a notebook starts with, A to Z', async ({ page }) => {
  await openMachines(page);
  const names = await machineNames(page);
  expect(names).toHaveLength(147);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
});

test('the title line stays at the top while a screen scrolls', async ({ page }) => {
  await openMachines(page);
  const title = page.locator('#machines .title-row');
  const before = await title.boundingBox();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  await expect(title).toBeInViewport();
  expect((await title.boundingBox()).y).toBe(before.y);
  // The title covers what scrolls under it: at its middle, the top thing is the title or a part of it.
  const covered = await title.evaluate((row) => {
    const box = row.getBoundingClientRect();
    return row.contains(document.elementFromPoint(box.right - 60, box.top + box.height / 2));
  });
  expect(covered).toBe(true);
});

test('settings: remove the example lines, and Undo puts them back', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('button', { name: 'remove the example lines' }).click();
  await backTo(page, 'notebook');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start a new date' })).toHaveText('tap to start with a date');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('#lines .row--date')).toHaveCount(5);
});

test('a tap on the empty paper below the add line starts a new date', async ({ page }) => {
  await page.locator('#notebookFiller').click();
  await expect(page.locator('#sheet')).toHaveClass(/is-open/);
  await expect(page.getByRole('spinbutton', { name: 'Day', exact: true })).toHaveAttribute('aria-valuetext', '23');
});
