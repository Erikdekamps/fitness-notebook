/** Notebooks that are not the example one: a year of training, one without any machines, and one with a date still to come. */
import { test, expect, RULES } from './fixtures.js';
import { actionButton, expectWheel, lastDay, openApp, sheet, startWith } from './app.js';

const LEG_PRESS = { id: 'm-leg-press', name: 'Leg press' };

/** A set of leg press every Monday for `weeks` weeks from 1 December 2025, 2.5 kg heavier each week. */
function weeklyLegPress(weeks) {
  const lines = [];
  for (let week = 0; week < weeks; week++) {
    const date = new Date(Date.UTC(2025, 11, 1 + week * 7)).toISOString().slice(0, 10);
    lines.push({ id: `d${week}`, type: 'date', date });
    lines.push({ id: `l${week}`, type: 'machine', machineId: LEG_PRESS.id, name: LEG_PRESS.name, weight: 60 + week * 2.5, sets: 3, reps: 12 });
  }
  return lines;
}

test('a machine with a year of changes: the chart names the months, with the year on the first', RULES, async ({ page }) => {
  await startWith(page, { machines: [LEG_PRESS], lines: weeklyLegPress(50) });
  await openApp(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await page.locator('#statsBody [data-machine]').filter({ hasText: 'Leg press' }).click();
  await expect(page.locator('#machineStatsTitle')).toHaveText('Leg press');

  const labels = await page.locator('#machineStatsBody .x-labels span').allTextContents();
  expect(labels[0]).toBe("dec '25"); // not this year: the year is written with it
  expect(labels.length).toBeGreaterThan(3);
  for (const label of labels.slice(1)) expect(label).toMatch(/^[a-z]{3}$/); // month names, no dates
});

test('a machine with a few changes: the chart writes the date under each change', RULES, async ({ page }) => {
  await startWith(page, { machines: [LEG_PRESS], lines: weeklyLegPress(3) });
  await openApp(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await page.locator('#statsBody [data-machine]').filter({ hasText: 'Leg press' }).click();
  await expect(page.locator('#machineStatsBody .x-labels span')).toHaveText(['01/12/25', '08/12/25', '15/12/25']); // last year: written with the year
});

test('a notebook without machines: the panel has no wheels, only a line to write', async ({ page }) => {
  await startWith(page, { lines: [{ id: 'd1', type: 'date', date: '2026-11-23' }] });
  await openApp(page);
  await page.getByRole('button', { name: 'tap to add a line' }).click();
  await expect(sheet(page)).toHaveClass(/is-open/);
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  const field = page.getByRole('textbox', { name: 'Write your own line' });
  await expect(field).toHaveAttribute('placeholder', 'write a line');

  await field.fill('Walk 30 min');
  await expect(page.locator('#rowNext')).toHaveText('Walk 30 min'); // in pencil on the paper while typing
  await field.fill('');
  await expect(page.locator('#rowNext')).toHaveText('');
  await field.fill('Walk 30 min');
  await actionButton(page).click();
  expect(await lastDay(page)).toEqual(['Walk 30 min']);
});

test('statistics: the arrows go to the month before, and back to this one', async ({ page }) => {
  await startWith(page, { machines: [LEG_PRESS], lines: weeklyLegPress(50) }); // until 9 November 2026
  await openApp(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.locator('#statsBody')).toContainText('november');
  await expect(page.getByRole('button', { name: 'Month after' })).toHaveCount(0); // nothing after this month
  await page.getByRole('button', { name: 'Month before' }).click();
  await expect(page.locator('#statsBody')).toContainText('oktober');
  await page.getByRole('button', { name: 'Month after' }).click();
  await expect(page.locator('#statsBody')).toContainText('november');
});

test('a date still to come, from a phone with its clock wrong: changing it turns it back to today', async ({ page }) => {
  await startWith(page, { lines: [{ id: 'd1', type: 'date', date: '2027-01-05' }, { id: 't1', type: 'text', text: 'Walk 30 min' }] });
  await openApp(page);
  await page.locator('#lines .row--date').click();
  await expectWheel(page, 'Year', '2026');
  await expectWheel(page, 'Month', '11');
  await expectWheel(page, 'Day', '23');
  await actionButton(page).click();
  await expect(page.locator('#lines .row--date')).toHaveText(/^23\/11/);
});
