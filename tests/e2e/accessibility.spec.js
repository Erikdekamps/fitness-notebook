/**
 * Accessibility of the moments that have no saved picture: a line about to go, the rest timer, a panel in settings.
 * The screens themselves are checked in screenshots.spec.js, on the same visit as their picture.
 */
import { test, expect, RULES } from './fixtures.js';
import { openApp, openSettings, row, startDate } from './app.js';
import { expectAccessible } from './look.js';

test.beforeEach(async ({ page }) => {
  await openApp(page);
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

test('the panel to import from text', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('button', { name: 'import from text' }).click();
  await expectAccessible(page);
});

/**
 * Text contrast, checked by hand: axe cannot judge text on the paper, because the ruled lines are drawn
 * behind it. Every pair of text and background colour the app uses must reach 4.5 : 1 (WCAG AA).
 * The colours are read from the page, so changing one in the CSS is checked too.
 */
test('text colours have enough contrast on their backgrounds', RULES, async ({ page }) => {
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
