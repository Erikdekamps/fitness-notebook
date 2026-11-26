/**
 * Each screen and panel, visited once for two checks: it is accessible (axe, WCAG 2.2 A and AA),
 * and it looks the same as its saved picture (the baseline).
 *
 *   npm run test:e2e                       # compares with the baselines in tests/e2e/screenshots/
 *   npm run test:screenshots:update        # takes new baselines, after a change to the look on purpose
 *
 * When one differs, the report (reports/e2e/) shows the baseline, the new picture and the difference.
 *
 * Baselines are taken on Linux, like the machines GitHub runs the tests on: fonts draw a little
 * differently on every system. For the same reason the UI text uses Liberation Sans here, which
 * Playwright installs with its browsers everywhere: the app's own UI font (San Francisco) only exists
 * on Apple devices. The handwriting font, Caveat, comes with the app.
 */
import { test, expect } from './fixtures.js';
import { backTo, openApp, openSettings, pick, row } from './app.js';
import { expectAccessible, expectLooksLike } from './look.js';

/** Both checks of the screen as it stands. */
async function expectFine(page, name) {
  await expectAccessible(page);
  await expectLooksLike(page, name);
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('the notebook', async ({ page }) => {
  await expectFine(page, 'notebook');
});

test('the panel to add a line', async ({ page }) => {
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await pick(page, 'Machine', 'Leg press');
  await expectFine(page, 'add-line');
});

test('the panel to change a line', async ({ page }) => {
  await row(page, 'Seated row').click();
  await pick(page, 'Reps', '10');
  await expectFine(page, 'change-line');
});

test('the panel to start a new date', async ({ page }) => {
  await page.getByRole('button', { name: 'Start a new date' }).click();
  await expectFine(page, 'new-date');
});

test('settings', async ({ page }) => {
  await openSettings(page);
  await expectFine(page, 'settings');
});

test('a plan', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('button', { name: 'tap here to add a plan' }).click();
  await page.getByRole('textbox', { name: 'Name of the plan' }).fill('Leg day');
  await page.locator('#sheetAction').click();
  await page.getByRole('button', { name: 'tap here to add a machine' }).click();
  for (const machine of ['Leg press', 'Leg curl']) {
    await pick(page, 'Machine', machine);
    await page.locator('#sheetAction').click();
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#planMachines .row')).toHaveCount(2);
  await expectFine(page, 'plan');
});

test('statistics: the month', async ({ page }) => {
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.locator('#stats')).toBeVisible();
  await expectFine(page, 'stats-month');
});

test('statistics: one machine', async ({ page }) => {
  await page.getByRole('button', { name: 'Statistics' }).click();
  await page.locator('#statsBody [data-machine]').filter({ hasText: 'Leg press' }).click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Leg press');
  await expectFine(page, 'stats-machine');
  await backTo(page, 'stats');
});
