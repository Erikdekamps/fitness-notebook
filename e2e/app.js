/**
 * Helpers that use the app the way a person does: tap, hold, drag, turn a wheel.
 * The tests read like steps; the how lives here.
 */
import { expect } from './fixtures.js';

export const HOLD_MS = 600; // a bit longer than the app's HOLD_MS (450), so a hold is a hold

/** The example notebook: the last day, 16 November, as the app starts it. */
export const EXAMPLE_LAST_DAY = ['Biking Basics New Zealand #15', 'Leg press', 'Shoulder press', 'Seated row'];

export async function openApp(page) {
  await page.goto('/index.html');
  await expect(page.locator('#lines .row').first()).toBeVisible();
}

export const sheet = (page) => page.locator('#sheet');
export const actionButton = (page) => page.locator('#sheetAction');
export const otherButton = (page) => page.locator('#sheetCancel');
export const rows = (page) => page.locator('#lines .row');
export const row = (page, text) => page.locator('#lines .row').filter({ hasText: text }).last();

/** What each line of the last day says: the machine name, or the text. */
export function lastDay(page) {
  return page.locator('#lines').evaluate((lines) => {
    const all = [...lines.querySelectorAll('.row')];
    const date = all.findLastIndex((r) => r.classList.contains('row--date'));
    return all.slice(date + 1).map((r) => (r.querySelector('.name') || r.querySelector('.row-content')).textContent.trim());
  });
}

/** The numbers of a machine line, "kg × reps × sets". */
export const numbers = (rowLocator) => rowLocator.locator('.nums');

/** Turns a wheel (found by its label) to an item, with the arrow keys, like a keyboard user. */
export async function pick(page, label, value) {
  const wheel = page.getByRole('spinbutton', { name: label, exact: true });
  const items = await wheel.locator('.wheel-item').allTextContents();
  const target = items.indexOf(value);
  if (target === -1) throw new Error(`The ${label} wheel has no "${value}": ${items.join(', ')}`);
  await wheel.focus();
  for (let i = 0; i < items.length; i++) {
    const now = Number(await wheel.getAttribute('aria-valuenow'));
    if (now === target) break;
    await wheel.press(now < target ? 'ArrowDown' : 'ArrowUp');
    await expect(wheel).not.toHaveAttribute('aria-valuenow', String(now));
  }
  await expect(wheel).toHaveAttribute('aria-valuetext', value);
}

/** Waits until a wheel shows a value (it follows another wheel after that one stops). */
export const expectWheel = (page, label, value) =>
  expect(page.getByRole('spinbutton', { name: label, exact: true })).toHaveAttribute('aria-valuetext', value);

/** The middle of an element on the screen. */
async function middle(locator) {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Mouse: press on a line, hold it still, then drag it onto the place of another line. */
export async function mouseHoldAndDrag(page, from, to, { hold = HOLD_MS } = {}) {
  const a = await middle(from);
  const b = await middle(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.waitForTimeout(hold);
  await page.mouse.move(a.x, b.y, { steps: 12 });
  await page.mouse.up();
}

/** Touch: the same with a finger, sent as real touch events. */
export async function touchHoldAndDrag(page, from, to, { hold = HOLD_MS } = {}) {
  const a = await middle(from);
  const b = await middle(to);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: a.x, y }] });
  await touch('touchStart', a.y);
  await page.waitForTimeout(hold);
  for (let i = 1; i <= 12; i++) {
    await touch('touchMove', a.y + ((b.y - a.y) * i) / 12);
    await page.waitForTimeout(16);
  }
  await touch('touchEnd');
  await cdp.detach();
}

/** Hold and drag with what the project has: a finger on the phone (`touch`), else a mouse. */
export const holdAndDrag = (page, from, to, { touch, ...options }) =>
  touch ? touchHoldAndDrag(page, from, to, options) : mouseHoldAndDrag(page, from, to, options);

export async function openSettings(page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('#settings')).toBeVisible();
}

export async function backTo(page, screen) {
  await page.locator(`section:not([hidden]) .back-btn[data-back="${screen}"]`).click();
}

/** Starts a new date (today), optionally from a plan. */
export async function startDate(page, plan) {
  await page.getByRole('button', { name: 'Start a new date' }).click();
  await expect(sheet(page)).toHaveClass(/is-open/);
  if (plan) await pick(page, 'Plan', plan);
  await actionButton(page).click();
}

/** Adds a line with the panel: a machine set (with kg and reps) or a text. */
export async function addLine(page, line) {
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await expect(sheet(page)).toHaveClass(/is-open/);
  if (line.text) {
    await page.getByRole('textbox', { name: 'Write your own line' }).fill(line.text);
  } else {
    await pick(page, 'Machine', line.machine);
    if (line.kg) await pick(page, 'Weight in kg', line.kg);
    if (line.reps) await pick(page, 'Reps', line.reps);
  }
  if (line.expectButton) await expect(actionButton(page)).toHaveText(line.expectButton);
  await actionButton(page).click();
}

/** Drags a line sideways by `dx` pixels (negative is left), with a finger or the mouse, without holding first. */
export async function swipe(page, rowLocator, dx, { touch }) {
  const box = await rowLocator.boundingBox();
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2; // the middle: on an open line, the right side is the Delete button
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    const send = (type, at) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: at, y }] });
    await send('touchStart', x);
    for (let i = 1; i <= 10; i++) await send('touchMove', x + (dx * i) / 10);
    await send('touchEnd');
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 10 });
    await page.mouse.up();
  }
}
