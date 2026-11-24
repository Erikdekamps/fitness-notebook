/** Dragging a line to the left: a little way shows Delete, far removes it at once, not far enough snaps back. */
import { test, expect } from './fixtures.js';
import { EXAMPLE_LAST_DAY, lastDay, openApp, row, sheet, swipe } from './app.js';

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
