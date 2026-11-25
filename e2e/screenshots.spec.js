/**
 * Screenshot tests: each screen and panel must look the same as its saved picture (the baseline).
 *
 *   npm run test:e2e                       # compares with the baselines in e2e/screenshots/
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

/** Waits for the fonts, fixes the UI font, then compares the whole screen with its baseline. */
async function expectLooksLike(page, name) {
  await page.addStyleTag({ content: ':root { --font-ui: "Liberation Sans", sans-serif; }' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(`${name}.png`);
}

// Not on the Pixel: Chrome's phone mode draws text edges a little differently on GitHub's machines than
// anywhere else (1-2% of the pixels, every run). The iPhone covers the phone layout, desktop Chrome covers
// Chrome's drawing; the Pixel still runs every other browser test.
test.skip(({ isMobile, browserName }) => isMobile && browserName === 'chromium', 'Pixel screenshots differ between machines');

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('the notebook', async ({ page }) => {
  await expectLooksLike(page, 'notebook');
});

test('the panel to add a line', async ({ page }) => {
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await pick(page, 'Machine', 'Leg press');
  await expectLooksLike(page, 'add-line');
});

test('the panel to change a line', async ({ page }) => {
  await row(page, 'Seated row').click();
  await pick(page, 'Reps', '10');
  await expectLooksLike(page, 'change-line');
});

test('the panel to start a new date', async ({ page }) => {
  await page.getByRole('button', { name: 'Start a new date' }).click();
  await expectLooksLike(page, 'new-date');
});

test('settings', async ({ page }) => {
  await openSettings(page);
  await expectLooksLike(page, 'settings');
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
  await expectLooksLike(page, 'plan');
});

test('statistics: the month', async ({ page }) => {
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.locator('#stats')).toBeVisible();
  await expectLooksLike(page, 'stats-month');
});

test('statistics: one machine', async ({ page }) => {
  await page.getByRole('button', { name: 'Statistics' }).click();
  await page.locator('#statsBody [data-machine]').filter({ hasText: 'Leg press' }).click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Leg press');
  await expectLooksLike(page, 'stats-machine');
  await backTo(page, 'stats');
});
