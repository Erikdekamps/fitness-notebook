/** The picker wheels: besides the arrow keys, tap an item, or drag the wheel with the mouse. */
import { test, expect } from './fixtures.js';
import { openApp, sheet, stillness } from './app.js';

const reps = (page) => page.getByRole('spinbutton', { name: 'Reps', exact: true });
const item = (page, text) => reps(page).locator('.wheel-item').filter({ hasText: new RegExp(`^${text}$`) });

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await expect(sheet(page)).toHaveClass(/is-open/);
  await expect(reps(page)).toHaveAttribute('aria-valuetext', '12');
  await stillness(page); // the panel has slid up: the wheels are where they stay
});

test('tap an item on a wheel to pick it', async ({ page }) => {
  await item(page, '13').click();
  await expect(reps(page)).toHaveAttribute('aria-valuetext', '13');
  await item(page, '11').click();
  await expect(reps(page)).toHaveAttribute('aria-valuetext', '11');
});

test.describe('with a mouse', () => {
  test.skip(({ isMobile }) => isMobile, 'a finger scrolls the wheel itself');

  test('drag a wheel up to turn it; letting go on an item does not also tap it', async ({ page }) => {
    const box = await reps(page).boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 72, { steps: 6 }); // two items of 36 px
    await expect(reps(page)).toHaveClass(/is-dragging/);
    await page.mouse.up();
    await expect(reps(page)).not.toHaveClass(/is-dragging/);
    await expect(reps(page)).toHaveAttribute('aria-valuetext', '14');
    await page.waitForTimeout(300); // a tap on the item under the mouse would have turned it on
    await expect(reps(page)).toHaveAttribute('aria-valuetext', '14');
  });

  test('a press without a drag changes nothing', async ({ page }) => {
    const box = await reps(page).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // the middle item: the picked one
    await expect(reps(page)).toHaveAttribute('aria-valuetext', '12');
  });
});
