/** Writing the notebook: a new date, sets on a machine, a line of your own, changing and removing lines. */
import { test, expect, RULES } from './fixtures.js';
import { actionButton, addLine, lastDay, numbers, openApp, pick, row, sheet, startDate, swipe } from './app.js';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('a new date starts on today', async ({ page }) => {
  await startDate(page);
  await expect(page.locator('#lines .row--date').last()).toHaveText(/23\/11/);
  expect(await lastDay(page)).toEqual([]);
});

test('log a set, then the same machine, kg and reps again counts up the sets on that line', RULES, async ({ page }) => {
  await startDate(page);
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10', expectButton: 'Log set 1' });
  await expect(numbers(row(page, 'Fly'))).toHaveText('20 × 10 × 1');

  // The panel starts on the machine and numbers of the bottom line: one tap for the next set.
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await expect(actionButton(page)).toHaveText('Log set 2');
  await actionButton(page).click();
  await expect(numbers(row(page, 'Fly'))).toHaveText('20 × 10 × 2');
  expect(await lastDay(page)).toEqual(['Fly']);
});

test('other reps start a new line', RULES, async ({ page }) => {
  await startDate(page);
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10' });
  await addLine(page, { machine: 'Fly', kg: '20', reps: '8', expectButton: 'Log set 1' });
  expect(await lastDay(page)).toEqual(['Fly', 'Fly']);
});

test('a machine starts on the kg and reps of the last time', RULES, async ({ page }) => {
  await startDate(page);
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await pick(page, 'Machine', 'Leg press');
  // 16/11: Leg press 80 × 12 × 3
  await expect(page.getByRole('spinbutton', { name: 'Weight in kg' })).toHaveAttribute('aria-valuetext', '80');
  await expect(page.getByRole('spinbutton', { name: 'Reps' })).toHaveAttribute('aria-valuetext', '12');
});

test('write a line of your own', async ({ page }) => {
  await startDate(page);
  await addLine(page, { text: 'Bike 15 min' });
  expect(await lastDay(page)).toEqual(['Bike 15 min']);
});

test('Enter in the text field logs the line, like the button', async ({ page }) => {
  await startDate(page);
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await page.getByRole('textbox', { name: 'Write your own line' }).fill('Stretch 5 min');
  await page.getByRole('textbox', { name: 'Write your own line' }).press('Enter');
  await expect(sheet(page)).not.toHaveClass(/is-open/);
  expect(await lastDay(page)).toEqual(['Stretch 5 min']);
});

test('Enter on a wheel logs the set', async ({ page }) => {
  await startDate(page);
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await pick(page, 'Machine', 'Fly');
  await page.getByRole('spinbutton', { name: 'Machine', exact: true }).press('Enter');
  expect(await lastDay(page)).toEqual(['Fly']);
});

test('change a line: other reps, then Save', async ({ page }) => {
  await row(page, 'Seated row').click();
  await expect(sheet(page)).toHaveClass(/is-open/);
  await pick(page, 'Reps', '10');
  await expect(actionButton(page)).toHaveText('Save');
  await actionButton(page).click();
  await expect(numbers(row(page, 'Seated row'))).toHaveText('40 × 10 × 3');
});

test('tapping outside the panel changes nothing', async ({ page }) => {
  await row(page, 'Seated row').click();
  await pick(page, 'Reps', '10');
  await page.keyboard.press('Escape');
  await expect(sheet(page)).not.toHaveClass(/is-open/);
  await expect(numbers(row(page, 'Seated row'))).toHaveText('40 × 12 × 3');
});

test('remove a line, and Undo brings it back in its place', async ({ page }) => {
  const before = await lastDay(page);
  await row(page, 'Leg press').focus();
  await page.keyboard.press('Delete');
  await expect.poll(() => lastDay(page)).toEqual(before.filter((n) => n !== 'Leg press'));
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => lastDay(page)).toEqual(before);
});

test('swipe a line far to the left to remove it', async ({ page, isMobile }) => {
  const { width } = await row(page, 'Leg press').boundingBox();
  await swipe(page, row(page, 'Leg press'), -width * 0.8, { touch: isMobile }); // more than half the line: gone at once
  await expect.poll(() => lastDay(page)).not.toContain('Leg press');
});

test('a line gets a mark: an arrow up when heavier than last time', RULES, async ({ page }) => {
  await startDate(page);
  await addLine(page, { machine: 'Leg press', kg: '85', reps: '12' });
  await expect(row(page, 'Leg press').getByRole('img', { name: 'heavier than last time' })).toBeVisible();
});

test('change a line of your own: other words, then Save', async ({ page }) => {
  await row(page, 'Biking Basics New Zealand #15').click();
  const field = page.getByRole('textbox', { name: 'Write your own line' });
  await expect(field).toHaveValue('Biking Basics New Zealand #15');
  await expect(actionButton(page)).toHaveText('Save');
  await field.fill('Spinning class');
  await actionButton(page).click();
  expect((await lastDay(page))[0]).toBe('Spinning class');
});

test('change a date: tap it, pick another day, then Save', async ({ page }) => {
  await startDate(page);
  await page.locator('#lines .row--date').last().click();
  await expect(sheet(page)).toHaveClass(/is-open/);
  await expect(actionButton(page)).toHaveText('Save');
  await expect(page.getByRole('spinbutton', { name: 'Plan', exact: true })).toHaveCount(0); // only a new date starts from a plan
  await pick(page, 'Day', '22');
  await actionButton(page).click();
  await expect(page.locator('#lines .row--date').last()).toHaveText(/22\/11/);
});
