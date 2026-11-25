/**
 * Accessibility: every screen and panel is checked with axe against WCAG 2.2, levels A and AA.
 * Any violation fails the test, with what is wrong and where.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { backTo, openApp, openSettings, row, startDate } from './app.js';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

/** Checks the page once it is still: no panel sliding in, no wheel turning. axe would judge a half-faded frame. */
async function expectAccessible(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  // A wheel settles 160 ms after it last scrolled; give it two of those.
  await page.waitForTimeout(350);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const found = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n    ')}`);
  expect(found, 'WCAG violations').toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('the notebook', async ({ page }) => {
  await expectAccessible(page);
});

test('the panel to add a line', async ({ page }) => {
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await expectAccessible(page);
});

test('the panel to change a line', async ({ page }) => {
  await row(page, 'Leg press').click();
  await expectAccessible(page);
});

test('the panel to start a new date', async ({ page }) => {
  await page.getByRole('button', { name: 'Start a new date' }).click();
  await expectAccessible(page);
});

test('a line ready to be removed, and the message with Undo', async ({ page }) => {
  await row(page, 'Leg press').focus();
  await page.keyboard.press('Delete');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expectAccessible(page);
});

test('the rest timer', async ({ page }) => {
  await startDate(page);
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await page.locator('#sheetAction').click();
  await expect(page.locator('#timerBtn')).toBeVisible();
  await expectAccessible(page);
});

test('settings', async ({ page }) => {
  await openSettings(page);
  await expectAccessible(page);
});

test('the panel to import from text', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('button', { name: 'import from text' }).click();
  await expectAccessible(page);
});

test('a plan', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('button', { name: 'tap here to add a plan' }).click();
  await page.getByRole('textbox', { name: 'Name of the plan' }).fill('Leg day');
  await page.locator('#sheetAction').click();
  await page.getByRole('button', { name: 'tap here to add a machine' }).click();
  await page.locator('#sheetAction').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#planMachines .row')).toHaveCount(1);
  await expectAccessible(page);
});

test('statistics: the month and one machine', async ({ page }) => {
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expectAccessible(page);
  await page.locator('#statsBody [data-machine]').filter({ hasText: 'Leg press' }).click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Leg press');
  await expectAccessible(page);
  await backTo(page, 'stats');
});

/**
 * Text contrast, checked by hand: axe cannot judge text on the paper, because the ruled lines are drawn
 * behind it. Every pair of text and background colour the app uses must reach 4.5 : 1 (WCAG AA).
 * The colours are read from the page, so changing one in the CSS is checked too.
 */
test('text colours have enough contrast on their backgrounds', async ({ page }) => {
  const pairs = await page.evaluate(() => {
    const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const css = (selector, property) => getComputedStyle(document.querySelector(selector))[property];
    return [
      ['pen on paper', token('--pen'), token('--paper')],
      ['pencil on paper', token('--pencil'), token('--paper')],
      ['ink on the panel', token('--ink'), token('--sheet')],
      ['muted on the panel', token('--muted'), token('--sheet')],
      ['pencil on the panel', token('--pencil'), token('--sheet')],
      ['pen on the panel', token('--pen'), token('--sheet')],
      ['an error on the panel', token('--danger'), token('--sheet')],
      ['the big button', css('#sheetAction', 'color'), css('#sheetAction', 'backgroundColor')],
      ['Delete', '#ffffff', token('--danger')],
      ['Delete, about to go', '#ffffff', token('--danger-armed')],
      ['the message', css('#toast', 'color'), css('#toast', 'backgroundColor')],
      ['Undo in the message', css('#toastUndo', 'color'), css('#toast', 'backgroundColor')],
    ];
  });

  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const rgb = (color) => {
    const hex = color.match(/^#([0-9a-f]{6})$/i);
    const parts = hex ? hex[1].match(/../g).map((h) => parseInt(h, 16)) : color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    return parts.map((v) => channel(v / 255));
  };
  const luminance = (color) => {
    const [r, g, b] = rgb(color);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const tooLow = pairs.filter(([, fg, bg]) => contrast(fg, bg) < 4.5).map(([name, fg, bg]) => `${name}: ${fg} on ${bg} is ${contrast(fg, bg).toFixed(2)} : 1`);
  expect(tooLow).toEqual([]);
});
