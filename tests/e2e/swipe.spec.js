/** Dragging a line to the left: a little way shows Delete, far removes it at once, not far enough snaps back. */
import { test, expect } from './fixtures.js';
import { EXAMPLE_LAST_DAY, finger, lastDay, openApp, row, sheet, stillness, swipe } from './app.js';

const deleteButton = (page, text) => row(page, text).locator('.row-delete');
const isOpen = (page, text) => deleteButton(page, text).evaluate((b) => b.getBoundingClientRect().width > 40);

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('drag a little way left: Delete shows; tap it to remove the line', async ({ page, isMobile }) => {
  await swipe(page, row(page, 'Leg press'), -110, { touch: isMobile });
  await expect.poll(() => isOpen(page, 'Leg press')).toBe(true);
  await deleteButton(page, 'Leg press').click();
  await expect.poll(() => lastDay(page)).not.toContain('Leg press');
});

test('a short drag left snaps back and changes nothing', async ({ page, isMobile }) => {
  await swipe(page, row(page, 'Leg press'), -30, { touch: isMobile });
  await expect.poll(() => isOpen(page, 'Leg press')).toBe(false);
  expect(await lastDay(page)).toEqual(EXAMPLE_LAST_DAY);
});

test('an open line closes when dragged back to the right', async ({ page, isMobile }) => {
  await swipe(page, row(page, 'Leg press'), -110, { touch: isMobile });
  await expect.poll(() => isOpen(page, 'Leg press')).toBe(true);
  await swipe(page, row(page, 'Leg press'), 110, { touch: isMobile });
  await expect.poll(() => isOpen(page, 'Leg press')).toBe(false);
  expect(await lastDay(page)).toEqual(EXAMPLE_LAST_DAY);
});

test('while a line is open, the next touch elsewhere only closes it', async ({ page, isMobile }) => {
  await swipe(page, row(page, 'Leg press'), -110, { touch: isMobile });
  await swipe(page, row(page, 'Seated row'), -110, { touch: isMobile }); // this touch only closes Leg press
  await expect.poll(() => isOpen(page, 'Leg press')).toBe(false);
  await expect.poll(() => isOpen(page, 'Seated row')).toBe(false);

  await swipe(page, row(page, 'Seated row'), -110, { touch: isMobile }); // now it opens
  await expect.poll(() => isOpen(page, 'Seated row')).toBe(true);

  await row(page, 'Shoulder press').click();
  await expect.poll(() => isOpen(page, 'Seated row')).toBe(false);
  await expect(sheet(page)).not.toHaveClass(/is-open/); // that tap only closed the open line
});

test('a mouse wheel on the dark area above a panel does not scroll the paper', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a phone has no mouse wheel: the finger test below is for the phone');
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await expect(sheet(page)).toHaveClass(/is-open/);
  await stillness(page);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(40, 120);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(300); // a scroll would have started by now
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test.describe('phone', () => {
  test.skip(({ isMobile, browserName }) => !isMobile || browserName !== 'chromium', 'only Chromium gets real touch events, which scroll the page');

  test('the paper stays still while a finger drags on the panel, or on the dark area above it', async ({ page }) => {
    await page.getByRole('button', { name: 'tap to add a line' }).click();
    await expect(page.locator('#sheet')).toHaveClass(/is-open/);
    await stillness(page);
    const before = await page.evaluate(() => window.scrollY);
    const box = await page.locator('#sheetAction').boundingBox();
    // On the big button the finger drags up; on the dark area it drags down, as if to pull the paper back.
    for (const [x, y, dy] of [[box.x + box.width / 2, box.y + box.height / 2, -20], [40, 120, 20]]) {
      const touch = await finger(page);
      await touch.down(x, y);
      for (let i = 1; i <= 8; i++) await touch.move(x, y + i * dy);
      await touch.up();
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
    }
    await expect(page.locator('#sheet')).toHaveClass(/is-open/); // a drag is not a tap: the panel stays
  });
});
