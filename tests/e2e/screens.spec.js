/** Every screen opens, shows what it should, and the way back works. */
import { test, expect } from './fixtures.js';
import { backTo, openApp, openSettings, rows } from './app.js';

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

test('settings lists the twelve starting machines, A to Z', async ({ page }) => {
  await openSettings(page);
  const names = await page.locator('#machineList .row').allTextContents();
  expect(names).toHaveLength(12);
  const clean = names.map((n) => n.replace(/Delete$/, '').trim());
  expect(clean).toEqual([...clean].sort((a, b) => a.localeCompare(b)));
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
