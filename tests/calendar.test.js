import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { Calendar } = load('calendar');

test('days: iso and parts', () => {
  assert.equal(Calendar.toIso(2026, 3, 5), '2026-03-05');
  assert.deepEqual(Calendar.parts('2026-03-05'), { y: 2026, m: 3, d: 5 });
  assert.match(Calendar.today(), /^\d{4}-\d{2}-\d{2}$/);
});

test('days: days in a month, leap years', () => {
  assert.equal(Calendar.daysInMonth(2026, 2), 28);
  assert.equal(Calendar.daysInMonth(2028, 2), 29);
  assert.equal(Calendar.daysInMonth(2026, 11), 30);
});

test('written: Dutch day, year only when it is not this year', () => {
  const thisYear = new Date().getFullYear();
  assert.equal(Calendar.written(`${thisYear}-01-07`).date, '07/01');
  assert.deepEqual(Calendar.written('2020-11-18'), { date: '18/11/20', day: 'wo' });
  assert.equal(Calendar.written('2020-11-22').day, 'zo');
});

test('weeks: mondayOf and weekBefore', () => {
  assert.equal(Calendar.mondayOf('2026-11-18'), '2026-11-16'); // a Wednesday
  assert.equal(Calendar.mondayOf('2026-11-16'), '2026-11-16'); // a Monday
  assert.equal(Calendar.mondayOf('2026-11-22'), '2026-11-16'); // a Sunday
  assert.equal(Calendar.mondayOf('2026-01-01'), '2025-12-29'); // across a year
  assert.equal(Calendar.weekBefore('2026-11-16'), '2026-11-09');
  assert.equal(Calendar.weekBefore('2026-01-05'), '2025-12-29');
});

test('weeksInARow: counts back from this week', () => {
  assert.equal(Calendar.weeksInARow(new Set(['2026-11-07', '2026-11-09', '2026-11-16']), '2026-11-19'), 3);
});

test('weeksInARow: an empty current week does not break the run, a skipped week does', () => {
  assert.equal(Calendar.weeksInARow(new Set(['2026-11-07', '2026-11-14']), '2026-11-17'), 2);
  assert.equal(Calendar.weeksInARow(new Set(['2026-11-02', '2026-11-16']), '2026-11-19'), 1);
  assert.equal(Calendar.weeksInARow(new Set(['2026-10-01']), '2026-11-19'), 0);
  assert.equal(Calendar.weeksInARow(new Set(), '2026-11-19'), 0);
});

test('months: of a date, parts, and stepping across a year', () => {
  assert.equal(Calendar.monthOf('2026-11-18'), '2026-11');
  assert.deepEqual(Calendar.monthParts('2026-03'), { y: 2026, m: 3 });
  assert.equal(Calendar.shiftMonth('2026-11', -1), '2026-10');
  assert.equal(Calendar.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(Calendar.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(Calendar.shiftMonth('2026-03', -14), '2025-01');
});

test('monthRange: from the oldest month among the dates to the month of today', () => {
  assert.deepEqual(Calendar.monthRange(new Set(['2026-09-05', '2025-12-06', '2026-11-16']), '2026-11-20'), { first: '2025-12', last: '2026-11' });
  assert.deepEqual(Calendar.monthRange(new Set(), '2026-11-20'), { first: '2026-11', last: '2026-11' });
  // a date after today does not stretch the range forward
  assert.deepEqual(Calendar.monthRange(new Set(['2027-01-01']), '2026-11-20'), { first: '2026-11', last: '2026-11' });
});

test('clampMonth: stays inside the range', () => {
  const range = { first: '2026-09', last: '2026-11' };
  assert.equal(Calendar.clampMonth('2026-10', range), '2026-10');
  assert.equal(Calendar.clampMonth('2026-08', range), '2026-09');
  assert.equal(Calendar.clampMonth('2026-12', range), '2026-11');
});

test('monthCells: blanks before the 1st, stops at today', () => {
  const cells = Calendar.monthCells(new Set(['2026-11-07', '2026-11-16']), 2026, 11, '2026-11-18');
  assert.equal(cells.length, 6 + 18); // 1 November 2026 is a Sunday
  assert.deepEqual(cells.slice(0, 6).map((c) => c.state), Array(6).fill('blank'));
  assert.deepEqual(cells[6], { day: 1, state: 'rest' });
  assert.equal(cells[6 + 6].state, 'trained');
  assert.equal(cells.at(-1).day, 18);
  assert.equal(Calendar.countTrained(cells), 2);
});

test('monthCells: a past month is shown whole', () => {
  const cells = Calendar.monthCells(new Set(), 2026, 10, '2026-11-18');
  assert.equal(cells.filter((c) => c.day).length, 31);
  assert.equal(cells.filter((c) => c.state === 'blank').length, 3); // 1 October 2026 is a Thursday
});
