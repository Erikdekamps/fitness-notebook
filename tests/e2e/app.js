/**
 * Helpers that use the app the way a person does: tap, hold, drag, turn a wheel.
 * The tests read like steps; the how lives here.
 */
import { expect } from './fixtures.js';

export const SETTLE_MS = 250; // a bit longer than a wheel takes to settle (160 ms)
export const HOLD_MS = 600; // a bit longer than the app's HOLD_MS (450), so a hold is a hold

/** The example notebook: the last day, 16 November, as the app starts it. */
export const EXAMPLE_LAST_DAY = ['Biking Basics New Zealand #15', 'Leg press', 'Shoulder press', 'Seated row'];

export async function openApp(page) {
  await page.goto('/index.html');
  await expect(page.locator('#lines .row').first()).toBeVisible();
}

export const sheet = (page) => page.locator('#sheet');

/** Waits until nothing slides or fades any more, so a place measured on the screen is where things stay. */
export const stillness = (page) => page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
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
    await pressUntilItMoves(wheel, now < target ? 'ArrowDown' : 'ArrowUp', now);
  }
  await expect(wheel).toHaveAttribute('aria-valuetext', value);
  // A wheel settles 160 ms after it stops, and that can change the others (a machine loads its kg and reps):
  // wait for it, as a person would, before turning the next wheel.
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * Presses a key on a wheel and waits for it to move. The wheel reports a key at once, so no move means
 * the press was lost: WebKit's scroll snapping sometimes puts the wheel straight back. Then press again.
 */
async function pressUntilItMoves(wheel, key, from) {
  for (let attempt = 1; ; attempt++) {
    await wheel.press(key);
    try {
      await expect(wheel).not.toHaveAttribute('aria-valuenow', String(from), { timeout: 1000 });
      return;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
}

/** Waits until a wheel shows a value (it follows another wheel after that one stops). */
export const expectWheel = (page, label, value) =>
  expect(page.getByRole('spinbutton', { name: label, exact: true })).toHaveAttribute('aria-valuetext', value);

/** The middle of an element on the screen. */
async function middle(locator) {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * After the press: waits until the app has picked the row up (450 ms after the touch), not for a fixed time,
 * which is too short on a busy machine. A row that cannot be picked up (a date) never is: then go on after a while.
 * A hold shorter than HOLD_MS is on purpose too short: that one is just waited out.
 */
async function waitPickedUp(page, from, hold) {
  if (hold < HOLD_MS) {
    await page.waitForTimeout(hold);
    return;
  }
  await from.and(page.locator('.is-moving')).waitFor({ timeout: 2000 }).catch(() => {});
}

/** Mouse: press on a line, hold it still, then drag it onto the place of another line. */
export async function mouseHoldAndDrag(page, from, to, { hold = HOLD_MS } = {}) {
  const a = await middle(from);
  const b = await middle(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await waitPickedUp(page, from, hold);
  await page.mouse.move(a.x, b.y, { steps: 12 });
  await page.mouse.up();
}

/**
 * One finger on the screen: down, move, up.
 * Chromium gets real touch events, so the browser also scrolls and cancels the way a phone does.
 * WebKit cannot be sent touch moves by Playwright, so there the finger's pointer events go straight
 * to the page: the app gets the same events, but the browser itself does not scroll.
 */
export async function finger(page) {
  if (realTouch(page)) {
    const cdp = await page.context().newCDPSession(page);
    const send = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
    return {
      down: (x, y) => send('touchStart', { x, y }),
      move: (x, y) => send('touchMove', { x, y }),
      up: async () => {
        await send('touchEnd');
        await cdp.detach();
      },
    };
  }
  let last = { x: 0, y: 0 };
  const fire = (type, x, y) =>
    page.evaluate(([type, x, y]) => {
      // A touch pointer stays with the element it went down on, like a real finger.
      if (type === 'pointerdown') window.__fingerTarget = document.elementFromPoint(x, y);
      const init = { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true };
      window.__fingerTarget.dispatchEvent(new PointerEvent(type, { ...init, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
    }, [type, x, y]);
  return {
    down: (x, y) => fire('pointerdown', (last = { x, y }).x, y),
    move: (x, y) => fire('pointermove', (last = { x, y }).x, y),
    up: () => fire('pointerup', last.x, last.y),
  };
}

/** Whether this browser gets real touch events (Chromium), so the page scrolls under a finger. */
export const realTouch = (page) => page.context().browser().browserType().name() === 'chromium';

/** Touch: hold a finger still on a line, then drag it onto the place of another line. */
export async function touchHoldAndDrag(page, from, to, { hold = HOLD_MS } = {}) {
  const a = await middle(from);
  const b = await middle(to);
  const touch = await finger(page);
  await touch.down(a.x, a.y);
  await waitPickedUp(page, from, hold);
  for (let i = 1; i <= 12; i++) {
    await touch.move(a.x, a.y + ((b.y - a.y) * i) / 12);
    await page.waitForTimeout(16);
  }
  await touch.up();
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
  // Start in the middle (on an open line the right side is the Delete button), or near the right edge for a long swipe.
  const x = Math.abs(dx) > box.width / 2 ? box.x + box.width - 10 : box.x + box.width / 2;
  if (touch) {
    const f = await finger(page);
    await f.down(x, y);
    for (let i = 1; i <= 10; i++) await f.move(x + (dx * i) / 10, y);
    await f.up();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 10 });
    await page.mouse.up();
  }
}

/**
 * Starts the app on a notebook of the test's own instead of the example one. Call it before openApp.
 * Only fills an empty browser, so a reload keeps what the test did since.
 */
export async function startWith(page, { machines = [], plans = [], lines = [] }) {
  const data = JSON.stringify({ version: 1, machines, plans, lines });
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('fitness-notebook.v1')) localStorage.setItem('fitness-notebook.v1', saved);
  }, data);
}
