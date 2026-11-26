/** Settings: the machines list (add, rename, remove) and plan names. */
import { test, expect, RULES } from './fixtures.js';
import { HOLD_MS, actionButton, addLine, backTo, holdAndDrag, openApp, openSettings, pick, row, startDate } from './app.js';

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

test('a name that is taken is not accepted; Escape keeps the old name', RULES, async ({ page }) => {
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

test('a plan name that is taken is refused', RULES, async ({ page }) => {
  for (const attempt of [1, 2]) {
    await page.getByRole('button', { name: 'tap here to add a plan' }).click();
    await page.getByRole('textbox', { name: 'Name of the plan' }).fill('Arms');
    await actionButton(page).click();
    if (attempt === 1) await backTo(page, 'settings');
  }
  await expect(page.getByText('There is a plan with that name already')).toBeVisible();
});

test('the machine wheel lists the machines A to Z', RULES, async ({ page }) => {
  await backTo(page, 'notebook');
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  const items = await page.getByRole('spinbutton', { name: 'Machine', exact: true }).locator('.wheel-item').allTextContents();
  expect(items).toEqual([...items].sort((a, b) => a.localeCompare(b)));
});

/* ---- Plans in your own order ---- */

const planNames = (page) => page.locator('#planList .row .name').allTextContents();

/** Adds plans by name, coming back to settings after each. */
async function addPlans(page, names) {
  for (const name of names) {
    await page.getByRole('button', { name: 'tap here to add a plan' }).click();
    await page.getByRole('textbox', { name: 'Name of the plan' }).fill(name);
    await actionButton(page).click();
    await backTo(page, 'settings');
  }
}

test('plans stay in the order they were made, not A to Z', RULES, async ({ page }) => {
  await addPlans(page, ['Push', 'Pull', 'Legs']);
  expect(await planNames(page)).toEqual(['Push', 'Pull', 'Legs']);
});

const planRow = (page, name) => page.locator('#planList .row').filter({ hasText: name });

test('plans have no handle: the room is for the number of machines', async ({ page }) => {
  await addPlans(page, ['Push']);
  await expect(page.locator('#planList .row-handle')).toHaveCount(0);
  await expect(planRow(page, 'Push')).toContainText('0 machines');
});

test('hold a plan, then drag it to another place; it stays there after a reload', async ({ page, isMobile }) => {
  await addPlans(page, ['Push', 'Pull', 'Legs']);
  await holdAndDrag(page, planRow(page, 'Legs'), planRow(page, 'Push'), { touch: isMobile });
  await expect.poll(() => planNames(page)).toEqual(['Legs', 'Push', 'Pull']);
  await expect(page.locator('#plan')).toBeHidden(); // a drag is not a tap: the plan did not open

  await page.reload();
  await openSettings(page);
  expect(await planNames(page)).toEqual(['Legs', 'Push', 'Pull']);
});

test('while a plan is held it shows the drag icon; let go and it is gone', async ({ page }) => {
  await addPlans(page, ['Push', 'Pull']);
  const held = planRow(page, 'Pull');
  const icon = () => held.locator('.row-content').evaluate((el) => getComputedStyle(el, '::before').content);
  expect(await icon()).toBe('none');
  const box = await held.boundingBox();
  await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  await expect(held).toHaveClass(/is-moving/);
  expect(await icon()).not.toBe('none');
  await page.mouse.up();
  await expect(page.locator('#planList .row.is-moving')).toHaveCount(0);
});

test('Alt with arrow up or down moves the focused plan one place, and keeps the focus on it', async ({ page }) => {
  await addPlans(page, ['Push', 'Pull']);
  await planRow(page, 'Pull').focus();
  await page.keyboard.press('Alt+ArrowUp');
  expect(await planNames(page)).toEqual(['Pull', 'Push']);
  await expect(planRow(page, 'Pull')).toBeFocused();
});

test('the plan wheel of a new date follows your order', async ({ page }) => {
  await addPlans(page, ['Push', 'Pull']);
  await planRow(page, 'Pull').focus();
  await page.keyboard.press('Alt+ArrowUp');
  await backTo(page, 'notebook');
  await page.getByRole('button', { name: 'Start a new date' }).click();
  const items = await page.getByRole('spinbutton', { name: 'Plan', exact: true }).locator('.wheel-item').allTextContents();
  expect(items).toEqual(['No plan', 'Pull', 'Push']);
});

test('a quick tap on a plan still opens it', async ({ page }) => {
  await addPlans(page, ['Push']);
  await page.locator('#planList .row .name').filter({ hasText: 'Push' }).click();
  await expect(page.locator('#planTitle')).toHaveText('Push');
});

test('steps of 0.5 kg on the kg wheel, for small dumbbells; kept after a reload', async ({ page }) => {
  await expect(page.locator('#kgStepValue')).toHaveText('2.5 kg');
  await page.getByRole('button', { name: /steps of/ }).click();
  await pick(page, 'Kg step', '0.5 kg');
  await actionButton(page).click();
  await expect(page.locator('#kgStepValue')).toHaveText('0.5 kg');

  await page.reload(); // opens on the notebook
  await openSettings(page);
  await expect(page.locator('#kgStepValue')).toHaveText('0.5 kg');
  await backTo(page, 'notebook');
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  const kg = page.getByRole('spinbutton', { name: 'Weight in kg' });
  const items = await kg.locator('.wheel-item').allTextContents();
  expect(items.slice(0, 4)).toEqual(['0', '0.5', '1', '1.5']);
});

test('remove a plan, and Undo puts it back', async ({ page }) => {
  await addPlans(page, ['Push', 'Pull']);
  await planRow(page, 'Push').focus();
  await page.keyboard.press('Delete');
  await expect.poll(() => planNames(page)).toEqual(['Pull']);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => planNames(page)).toEqual(['Push', 'Pull']);
});

test('a tap somewhere else while writing a machine keeps what was written', async ({ page }) => {
  await page.getByRole('button', { name: 'tap here to add a machine' }).click();
  const field = page.locator('#addMachineRow input');
  await field.fill('Hip thrust');
  await page.getByRole('heading', { name: 'machines' }).click();
  await expect(field).toHaveCount(0);
  expect(await machineNames(page)).toContain('Hip thrust');
});

test('a tap in the field while renaming a machine keeps the field open', async ({ page }) => {
  await page.locator('#machineList .row').filter({ hasText: 'Leg press' }).click();
  const field = page.getByRole('textbox', { name: 'Machine name' });
  await field.fill('Leg press 2');
  await field.click();
  await expect(field).toHaveValue('Leg press 2');
  await field.press('Enter');
  expect(await machineNames(page)).toContain('Leg press 2');
});
