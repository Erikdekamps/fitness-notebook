/** Settings: text size, the kg wheel, the rest timer and backups. Plans and machines have a tab of their own. */
import { test, expect, RULES } from './fixtures.js';
import { backTo, bringBack, openApp, openSettings, sheet } from './app.js';

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await openSettings(page);
});

test('settings has no plans and no machines: they have a tab of their own', async ({ page }) => {
  await expect(page.locator('#settings')).not.toContainText('plan');
  await expect(page.locator('#settings')).not.toContainText('machines');
});

test('steps of 0.5 or 2.5 kg on the kg wheel, in one tap; kept after a reload', async ({ page }) => {
  const step = (kg) => page.getByRole('radiogroup', { name: 'Steps on the kg wheel' }).getByRole('radio', { name: `${kg} kg` });
  await expect(step('2.5')).toHaveAttribute('aria-checked', 'true');
  await step('0.5').click();
  await expect(step('0.5')).toHaveAttribute('aria-checked', 'true');
  await expect(step('2.5')).toHaveAttribute('aria-checked', 'false');

  await page.reload(); // opens on the notebook
  await openSettings(page);
  await expect(step('0.5')).toHaveAttribute('aria-checked', 'true');
  await backTo(page, 'notebook');
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  const items = await page.getByRole('spinbutton', { name: 'Weight in kg' }).locator('.wheel-item').allTextContents();
  expect(items.slice(0, 4)).toEqual(['0', '0.5', '1', '1.5']);
});

test('rest time: 15 seconds less or more a tap, never under 0:15', RULES, async ({ page }) => {
  const less = page.getByRole('button', { name: '15 seconds less' });
  const more = page.getByRole('button', { name: '15 seconds more' });
  await more.click();
  await expect(page.locator('#restTimeValue')).toHaveText('1:45');
  for (let i = 0; i < 6; i++) await less.click();
  await expect(page.locator('#restTimeValue')).toHaveText('0:15');
  await expect(less).toBeDisabled();
  await expect(more).toBeEnabled();
});

/** The size of the handwriting and the room between the ruled lines. */
const look = (page) => page.evaluate(() => {
  const body = getComputedStyle(document.body);
  return { text: body.fontSize, line: body.lineHeight };
});

test('text size: small, normal or large; the paper and its lines grow with it; kept after a reload', async ({ page }) => {
  const size = (name) => page.getByRole('radiogroup', { name: 'Text size' }).getByRole('radio', { name, exact: true });
  await expect(size('Normal')).toHaveAttribute('aria-checked', 'true');
  expect(await look(page)).toEqual({ text: '27px', line: '44px' });

  await size('Small').click();
  expect(await look(page)).toEqual({ text: '23px', line: '44px' }); // a line stays big enough for a finger
  await size('Large').click();
  await expect(size('Large')).toHaveAttribute('aria-checked', 'true');
  expect(await look(page)).toEqual({ text: '32px', line: '52px' });

  await page.reload();
  expect(await look(page)).toEqual({ text: '32px', line: '52px' });
  const first = await page.locator('#lines .row--machine').first().boundingBox();
  expect(first.height).toBe(52);
});

test('large text: the chart of a machine stands on the wider lines', async ({ page }) => {
  await page.getByRole('radiogroup', { name: 'Text size' }).getByRole('radio', { name: 'Large', exact: true }).click();
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: 'Statistics' }).click();
  await page.locator('#statsBody').getByRole('button', { name: 'Leg press', exact: true }).click();
  const chart = await page.locator('#machineStatsBody .chart').boundingBox();
  expect(chart.height % 52).toBe(0);
});

test('bring a copy back: from a file you saved, or from its text', async ({ page }) => {
  expect(await bringBack(page, 'file')).toBeTruthy(); // the file picker opened
  await expect(sheet(page)).not.toHaveClass(/is-open/);
  await bringBack(page, 'text');
  await expect(sheet(page)).toHaveClass(/is-open/);
});
