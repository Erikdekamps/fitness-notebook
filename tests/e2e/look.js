/**
 * The two checks of a screen as it stands: it is accessible, and it looks like its saved picture.
 * tests/e2e/screenshots.spec.js does both on one visit of each screen.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { stillness } from './app.js';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

/**
 * Checks the page with axe against WCAG 2.2, levels A and AA. Any violation fails, with what is wrong and where.
 * It waits until the page is still: no panel sliding in, no wheel turning. axe would judge a half-faded frame.
 */
export async function expectAccessible(page) {
  await page.evaluate(() => document.fonts.ready);
  await stillness(page);
  // A wheel settles 160 ms after it last scrolled; give it two of those.
  await page.waitForTimeout(350);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const found = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n    ')}`);
  expect(found, 'WCAG violations').toEqual([]);
}

/**
 * Waits for the fonts, fixes the UI font, then compares the whole screen with its baseline.
 *
 * Not on the iPhone screen in Chrome: Chrome's phone mode draws text edges a little differently on GitHub's
 * machines than anywhere else (1-2% of the pixels, every run). The iPhone in Safari covers the phone layout,
 * desktop Chrome covers Chrome's drawing.
 */
export async function expectLooksLike(page, name) {
  if (test.info().project.name === 'iphone-chrome') return;
  await page.addStyleTag({ content: ':root { --font-ui: "Liberation Sans", sans-serif; }' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(`${name}.png`);
}
