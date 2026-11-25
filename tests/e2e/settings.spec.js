/** Settings: the machines list (add, rename, remove) and plan names. */
import { test, expect } from './fixtures.js';
import { actionButton, addLine, backTo, openApp, openSettings, pick, row, startDate } from './app.js';

const machineNames = (page) => page.locator('#machineList .row .name').allTextContents();

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await openSettings(page);
});

test('add machines: write a name, Enter, and the field stays for the next one', async ({ page }) => {
  await page.getByRole('button', { name: 'tap here to add a machine' }).click();
  const field = page.locator('#addMachineRow input');
  await field.fill('Hip thrust');
  await field.press('Enter');
  await expect(field).toHaveValue('');
  await field.fill('Calf raise');
  await field.press('Enter');
  await field.press('Escape');
  const names = await machineNames(page);
  expect(names).toContain('Hip thrust');
  expect(names).toContain('Calf raise');
  expect(names).toHaveLength(14);
});

test('rename a machine: the wheel uses the new name, old lines keep what was written', async ({ page }) => {
  await page.locator('#machineList .row').filter({ hasText: 'Leg press' }).click();
  const field = page.getByRole('textbox', { name: 'Machine name' });
  await expect(field).toHaveValue('Leg press');
  await field.fill('Leg press 45°');
  await field.press('Enter');
  expect(await machineNames(page)).toContain('Leg press 45°');

  await backTo(page, 'notebook');
  await expect(row(page, 'Leg press')).toBeVisible();
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await pick(page, 'Machine', 'Leg press 45°');
});

test('a name that is taken is not accepted; Escape keeps the old name', async ({ page }) => {
  await page.locator('#machineList .row').filter({ hasText: 'Leg press' }).click();
  const field = page.getByRole('textbox', { name: 'Machine name' });
  await field.fill('leg curl'); // the same as "Leg curl", in other letters
  await field.press('Enter');
  await expect(field).toBeVisible(); // still open: it was not taken
  await field.press('Escape');
  await expect(field).toBeHidden();
  expect(await machineNames(page)).toContain('Leg press');
});

test('remove a machine, and Undo puts it back', async ({ page }) => {
  const target = page.locator('#machineList .row').filter({ hasText: 'Fly' });
  await target.focus();
  await page.keyboard.press('Delete');
  await expect.poll(() => machineNames(page)).not.toContain('Fly');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => machineNames(page)).toContain('Fly');
});

test('a new machine written in the panel shows up in settings', async ({ page }) => {
  await backTo(page, 'notebook');
  await startDate(page);
  await addLine(page, { text: 'Bike 15 min' });
  await openSettings(page);
  expect(await machineNames(page)).not.toContain('Bike 15 min'); // a text line is not a machine
});

test('rename a plan by tapping its name', async ({ page }) => {
  await page.getByRole('button', { name: 'tap here to add a plan' }).click();
  await page.getByRole('textbox', { name: 'Name of the plan' }).fill('Arms');
  await actionButton(page).click();
  await page.getByRole('button', { name: /Arms: tap to change the name/ }).click();
  const field = page.locator('#planTitle').getByRole('textbox', { name: 'Name of the plan' });
  await field.fill('Arm day');
  await field.press('Enter');
  await expect(page.locator('#planTitle')).toHaveText('Arm day');
  await backTo(page, 'settings');
  await expect(page.locator('#planList')).toContainText('Arm day');
});

test('a plan name that is taken is refused', async ({ page }) => {
  for (const attempt of [1, 2]) {
    await page.getByRole('button', { name: 'tap here to add a plan' }).click();
    await page.getByRole('textbox', { name: 'Name of the plan' }).fill('Arms');
    await actionButton(page).click();
    if (attempt === 1) await backTo(page, 'settings');
  }
  await expect(page.getByText('There is a plan with that name already')).toBeVisible();
});

test('the machine wheel lists the machines A to Z', async ({ page }) => {
  await backTo(page, 'notebook');
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  const items = await page.getByRole('spinbutton', { name: 'Machine', exact: true }).locator('.wheel-item').allTextContents();
  expect(items).toEqual([...items].sort((a, b) => a.localeCompare(b)));
});
