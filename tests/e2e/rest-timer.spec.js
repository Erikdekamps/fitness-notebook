/** The rest timer: it starts after each set, counts down and goes away at 0:00. Time is fast-forwarded. */
import { test, expect, RULES } from './fixtures.js';
import { actionButton, addLine, backTo, openApp, openSettings, pick, startDate } from './app.js';

const timer = (page) => page.locator('#timerBtn');

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await startDate(page);
});

test('after a set the timer counts down from 1:30 and goes away at 0:00', RULES, async ({ page }) => {
  await expect(timer(page)).toBeHidden();
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10' });
  await expect(timer(page)).toBeVisible();
  await expect(timer(page)).toContainText(/1:(30|29)/);

  await page.clock.fastForward('00:30');
  await expect(timer(page)).toContainText(/1:00|0:59/);
  await page.clock.fastForward('01:01');
  await expect(timer(page)).toBeHidden();
});

test('a line of your own starts no timer', RULES, async ({ page }) => {
  await addLine(page, { text: 'Bike 15 min' });
  await expect(timer(page)).toBeHidden();
});

test('tap the timer to stop it', async ({ page }) => {
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10' });
  await timer(page).click();
  await expect(timer(page)).toBeHidden();
});

test('the timer keeps going after a reload', async ({ page }) => {
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10' });
  await page.clock.fastForward('00:20');
  await page.reload();
  await expect(timer(page)).toContainText(/1:(10|09)/);
});

test('settings: another rest time, or no timer at all', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('button', { name: /rest time/ }).click();
  await pick(page, 'Rest time', '2:00');
  await actionButton(page).click();
  await expect(page.locator('#restTimeValue')).toHaveText('2:00');
  await backTo(page, 'notebook');
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10' });
  await expect(timer(page)).toContainText(/2:00|1:59/);
  await timer(page).click();

  await openSettings(page);
  await page.getByRole('switch', { name: /timer after each set/ }).click();
  await expect(page.getByRole('switch', { name: /timer after each set/ })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('button', { name: /rest time/ })).toBeHidden();
  await backTo(page, 'notebook');
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10' });
  await expect(timer(page)).toBeHidden();
});

test('a timer started in one tab shows in another tab, and stops there too', async ({ page, newTab }) => {
  const other = await newTab();
  await other.goto('/index.html');
  await expect(timer(other)).toBeHidden();
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10' });
  await expect(timer(other)).toBeVisible();
  await timer(page).click();
  await expect(timer(other)).toBeHidden();
});
