/** Holding a line, then dragging it up or down within its day. */
import { test, expect } from './fixtures.js';
import { EXAMPLE_LAST_DAY, HOLD_MS, holdAndDrag, lastDay, mouseHoldAndDrag, openApp, row, rows, sheet, touchHoldAndDrag } from './app.js';

const [ride, legPress, shoulderPress, seatedRow] = EXAMPLE_LAST_DAY;

test.beforeEach(async ({ page }) => {
  await openApp(page);
  expect(await lastDay(page)).toEqual(EXAMPLE_LAST_DAY);
});

test('hold the bottom line and drag it to the top of its day; it stays there after a reload', async ({ page, isMobile }) => {
  await holdAndDrag(page, row(page, seatedRow), row(page, ride), { touch: isMobile });
  await expect.poll(() => lastDay(page)).toEqual([seatedRow, ride, legPress, shoulderPress]);
  await expect(sheet(page)).not.toHaveClass(/is-open/); // the drag did not also count as a tap

  await page.reload();
  await expect.poll(() => lastDay(page)).toEqual([seatedRow, ride, legPress, shoulderPress]);
});

test('drag a line one place down', async ({ page, isMobile }) => {
  await holdAndDrag(page, row(page, legPress), row(page, shoulderPress), { touch: isMobile });
  await expect.poll(() => lastDay(page)).toEqual([ride, shoulderPress, legPress, seatedRow]);
});

test('a line never leaves its day: dragged above the date, it stops at the top', async ({ page, isMobile }) => {
  const date = page.locator('#lines .row--date').last();
  await holdAndDrag(page, row(page, legPress), date, { touch: isMobile });
  await expect.poll(() => lastDay(page)).toEqual([legPress, ride, shoulderPress, seatedRow]);
});

test('a date cannot be picked up', async ({ page, isMobile }) => {
  const date = page.locator('#lines .row--date').last();
  const before = await rows(page).allTextContents();
  await holdAndDrag(page, date, row(page, seatedRow), { touch: isMobile });
  await page.keyboard.press('Escape'); // in case the hold ended as a tap on the date
  expect(await rows(page).allTextContents()).toEqual(before);
});

test('a quick tap still opens the line', async ({ page }) => {
  await row(page, legPress).click();
  await expect(sheet(page)).toHaveClass(/is-open/);
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse and keyboard');

  test('a mouse drag without the hold moves nothing', async ({ page }) => {
    await mouseHoldAndDrag(page, row(page, seatedRow), row(page, ride), { hold: 0 });
    await page.waitForTimeout(HOLD_MS);
    expect(await lastDay(page)).toEqual(EXAMPLE_LAST_DAY);
  });

  test('Alt with arrow up or down moves the focused line, and keeps the focus on it', async ({ page }) => {
    await row(page, seatedRow).focus();
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Alt+ArrowUp');
    await expect.poll(() => lastDay(page)).toEqual([ride, seatedRow, legPress, shoulderPress]);
    await expect(row(page, seatedRow)).toBeFocused();
    await page.keyboard.press('Alt+ArrowDown');
    await expect.poll(() => lastDay(page)).toEqual([ride, legPress, seatedRow, shoulderPress]);
  });

  test('arrow keys without Alt do not move a line', async ({ page }) => {
    await row(page, seatedRow).focus();
    await page.keyboard.press('ArrowUp');
    expect(await lastDay(page)).toEqual(EXAMPLE_LAST_DAY);
  });
});

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch');
  test.skip(({ browserName }) => browserName !== 'chromium', 'only Chromium gets real touch events, which scroll the page');

  test('a quick swipe up scrolls the page and moves nothing', async ({ page }) => {
    await touchHoldAndDrag(page, row(page, seatedRow), row(page, ride), { hold: 30 });
    await page.waitForTimeout(HOLD_MS);
    expect(await lastDay(page)).toEqual(EXAMPLE_LAST_DAY);
  });

  test('the page does not scroll while a line is being dragged', async ({ page }) => {
    const before = await page.evaluate(() => scrollY);
    await touchHoldAndDrag(page, row(page, seatedRow), row(page, ride));
    expect(await page.evaluate(() => scrollY)).toBe(before);
  });
});

test('a picked-up line shows the drag icon; it goes away when the line is put down', async ({ page }) => {
  const target = row(page, seatedRow);
  const icon = () => target.locator('.row-content').evaluate((el) => getComputedStyle(el, '::before').content);
  expect(await icon()).toBe('none');

  const box = await target.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  await expect(target).toHaveClass(/is-moving/);
  expect(await icon()).not.toBe('none');
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).toBe('grabbing');

  await page.mouse.up();
  await expect(page.locator('#lines .row.is-moving')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe('grabbing');
});
