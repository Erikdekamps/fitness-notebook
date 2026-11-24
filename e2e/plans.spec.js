/** Making a plan in settings, then a day from it: the machines in pencil, logged one after the other. */
import { test, expect } from './fixtures.js';
import { actionButton, addLine, backTo, holdAndDrag, lastDay, numbers, openApp, openSettings, otherButton, pick, row, sheet, startDate } from './app.js';

/** Makes "Leg day" with Leg press and Leg curl, and goes back to the notebook. */
async function makeLegDay(page) {
  await openSettings(page);
  await page.getByRole('button', { name: 'tap here to add a plan' }).click();
  await page.getByRole('textbox', { name: 'Name of the plan' }).fill('Leg day');
  await actionButton(page).click();
  await expect(page.locator('#planTitle')).toHaveText('Leg day');

  await page.getByRole('button', { name: 'tap here to add a machine' }).click();
  for (const machine of ['Leg press', 'Leg curl']) {
    await pick(page, 'Machine', machine);
    await expect(actionButton(page)).toHaveText('Add to Leg day');
    await actionButton(page).click();
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#planMachines .name')).toHaveText(['Leg press', 'Leg curl']);

  await backTo(page, 'settings');
  await expect(page.locator('#planList')).toContainText('Leg day');
  await backTo(page, 'notebook');
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await makeLegDay(page);
});

test('a plan keeps its machines in the order you put them; the handle moves one', async ({ page }) => {
  await openSettings(page);
  await page.locator('#planList .row').filter({ hasText: 'Leg day' }).click();
  await page.getByRole('button', { name: /Move Leg curl/ }).focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#planMachines .name')).toHaveText(['Leg curl', 'Leg press']);
});

test('drag a machine in a plan by its handle', async ({ page, isMobile }) => {
  await openSettings(page);
  await page.locator('#planList .row').filter({ hasText: 'Leg day' }).click();
  const handle = (name) => page.getByRole('button', { name: `Move ${name}: drag, or use arrow up and down` });
  const from = await handle('Leg curl').boundingBox();
  const to = await handle('Leg press').boundingBox();
  const x = from.x + from.width / 2;
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', from.y + from.height / 2);
    for (let i = 1; i <= 8; i++) await touch('touchMove', from.y + from.height / 2 + ((to.y - from.y) * i) / 8);
    await touch('touchEnd');
  } else {
    await page.mouse.move(x, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
  }
  await expect(page.locator('#planMachines .name')).toHaveText(['Leg curl', 'Leg press']);
});

test('a day from a plan: log each machine in turn, the pencil lines turn into pen', async ({ page }) => {
  await startDate(page, 'Leg day');
  await expect(page.locator('#lines .row--date').last()).toContainText('Leg day');

  // The panel opens on the first machine of the plan.
  await expect(sheet(page)).toHaveClass(/is-open/);
  await expect(actionButton(page)).toHaveText('Log set 1');
  await actionButton(page).click();
  await expect(numbers(row(page, 'Leg press'))).toHaveText('80 × 12 × 1');

  // It comes back for the next set, with a button to the next machine.
  await expect(actionButton(page)).toHaveText('Log set 2');
  await expect(otherButton(page)).toHaveText('Next: Leg curl');
  await actionButton(page).click();
  await expect(numbers(row(page, 'Leg press'))).toHaveText('80 × 12 × 2');
  await otherButton(page).click();

  await expect(actionButton(page)).toHaveText('Log set 1');
  await actionButton(page).click();
  await expect(otherButton(page)).toHaveText('Done');
  await otherButton(page).click();
  await expect(sheet(page)).not.toHaveClass(/is-open/);

  expect(await lastDay(page)).toEqual(['Leg press', 'Leg curl']);
  await expect(page.locator('#lines .row-content.is-pencil')).toHaveCount(0);
});

test('cardio first: a line you write goes under the machines, then drag it above them', async ({ page, isMobile }) => {
  await startDate(page, 'Leg day');
  await page.keyboard.press('Escape'); // not now: first the bike
  await addLine(page, { text: 'Bike 15 min' });
  expect(await lastDay(page)).toEqual(['Leg press', 'Leg curl', 'Bike 15 min']);

  await holdAndDrag(page, row(page, 'Bike 15 min'), row(page, 'Leg press'), { touch: isMobile });
  await expect.poll(() => lastDay(page)).toEqual(['Bike 15 min', 'Leg press', 'Leg curl']);

  // The machines are still the plan's pencil lines, ready to log.
  await row(page, 'Leg press').click();
  await expect(actionButton(page)).toHaveText('Log set 1');
});

test('removing the date of a plan day removes the whole day; Undo brings it back', async ({ page }) => {
  await startDate(page, 'Leg day');
  await page.keyboard.press('Escape');
  const date = page.locator('#lines .row--date').last();
  await date.focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('#lines .row--date').last()).not.toContainText('Leg day');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('#lines .row--date').last()).toContainText('Leg day');
  expect(await lastDay(page)).toEqual(['Leg press', 'Leg curl']);
});
