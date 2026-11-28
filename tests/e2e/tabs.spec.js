/** The tabs at the top: notebook, plans and machines, statistics, settings. They stay while you switch and scroll. */
import { test, expect } from './fixtures.js';
import { openApp, openMachines, tab } from './app.js';

const SCREENS = [
  ['machines', 'Plans & machines'],
  ['stats', 'Statistics'],
  ['settings', 'Settings'],
  ['notebook', null],
];
const tabs = (page) => page.getByRole('navigation', { name: 'Pages' });

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('four tabs; a tap on one switches to its screen, and that tab is marked', async ({ page }) => {
  await expect(tabs(page).getByRole('button')).toHaveCount(4);
  await expect(tab(page, 'notebook')).toHaveAttribute('aria-current', 'page');
  for (const [screen, title] of SCREENS) {
    await tab(page, screen).click();
    await expect(page.locator(`#${screen}`)).toBeVisible();
    for (const [other] of SCREENS) {
      if (other === screen) await expect(tab(page, other)).toHaveAttribute('aria-current', 'page');
      else await expect(tab(page, other)).not.toHaveAttribute('aria-current', 'page');
    }
    if (title) await expect(page.locator(`#${screen} h1`)).toHaveText(title);
  }
});

test('a tab screen has no back arrow; the tabs stay put while it scrolls', async ({ page }) => {
  for (const [screen] of SCREENS) {
    await tab(page, screen).click();
    await expect(page.locator('section:not([hidden]) .back-btn')).toHaveCount(0);
  }
  await tab(page, 'machines').click();
  const before = await tab(page, 'settings').boundingBox();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  await expect(tab(page, 'settings')).toBeInViewport();
  expect((await tab(page, 'settings').boundingBox()).y).toBe(before.y);
  await tab(page, 'settings').click();
  await expect(page.locator('#settings')).toBeVisible();
});

test('a page below a tab has a back arrow and no tabs; back is the tab again', async ({ page }) => {
  await openMachines(page);
  await page.locator('#machineList').getByRole('button', { name: 'Leg press', exact: true }).click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Leg press');
  await expect(tabs(page)).toBeHidden();
  await page.locator('section:not([hidden]) .back-btn').click();
  await expect(page.locator('#machines')).toBeVisible();
  await expect(tabs(page)).toBeVisible();
  await expect(tab(page, 'machines')).toHaveAttribute('aria-current', 'page');
});

test("the phone's back goes to the tab before", async ({ page }) => {
  await tab(page, 'stats').click();
  await tab(page, 'settings').click();
  await page.goBack();
  await expect(page.locator('#stats')).toBeVisible();
  await expect(tab(page, 'stats')).toHaveAttribute('aria-current', 'page');
});
