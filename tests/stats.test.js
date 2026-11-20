import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const {
  sessionDates, mondayOf, weekBefore, weeksInARow, monthCells, countTrained, inRows,
  tallyMarks, machineHistory, chartScale, chartPoints, monthLabels,
} = load('stats');

const date = (iso) => ({ type: 'date', date: iso });
const lift = (machineId, weight) => ({ type: 'machine', machineId, weight });

test('sessionDates: one entry per date line', () => {
  const dates = sessionDates([date('2026-11-16'), lift('leg', 80), date('2026-11-18'), date('2026-11-16')]);
  assert.deepEqual([...dates].sort(), ['2026-11-16', '2026-11-18']);
});

test('mondayOf and weekBefore', () => {
  assert.equal(mondayOf('2026-11-18'), '2026-11-16'); // a Wednesday
  assert.equal(mondayOf('2026-11-16'), '2026-11-16'); // a Monday
  assert.equal(mondayOf('2026-11-22'), '2026-11-16'); // a Sunday
  assert.equal(mondayOf('2026-01-01'), '2025-12-29'); // across a year
  assert.equal(weekBefore('2026-11-16'), '2026-11-09');
  assert.equal(weekBefore('2026-01-05'), '2025-12-29');
});

test('weeksInARow: counts back from this week', () => {
  const dates = new Set(['2026-11-07', '2026-11-09', '2026-11-16']);
  assert.equal(weeksInARow(dates, '2026-11-19'), 3);
});

test('weeksInARow: an empty current week does not break the run, a skipped week does', () => {
  assert.equal(weeksInARow(new Set(['2026-11-07', '2026-11-14']), '2026-11-17'), 2);
  assert.equal(weeksInARow(new Set(['2026-11-02', '2026-11-16']), '2026-11-19'), 1);
  assert.equal(weeksInARow(new Set(['2026-10-01']), '2026-11-19'), 0);
  assert.equal(weeksInARow(new Set(), '2026-11-19'), 0);
});

test('monthCells: blanks before the 1st, stops at today', () => {
  const cells = monthCells(new Set(['2026-11-07', '2026-11-16']), 2026, 11, '2026-11-18');
  assert.equal(cells.length, 6 + 18); // 1 November 2026 is a Sunday
  assert.deepEqual(cells.slice(0, 6).map((c) => c.state), Array(6).fill('blank'));
  assert.deepEqual(cells[6], { day: 1, state: 'rest' });
  assert.equal(cells[6 + 6].state, 'trained');
  assert.equal(cells.at(-1).day, 18);
  assert.equal(countTrained(cells), 2);
});

test('monthCells: a past month is shown whole', () => {
  const cells = monthCells(new Set(), 2026, 10, '2026-11-18');
  assert.equal(cells.filter((c) => c.day).length, 31);
  assert.equal(cells.filter((c) => c.state === 'blank').length, 3); // 1 October 2026 is a Thursday
});

test('inRows', () => {
  assert.deepEqual(inRows([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(inRows([], 7), []);
});

test('tallyMarks: a slash for every five', () => {
  const slashes = (count) => (tallyMarks(count).path.match(/L/g) || []).length;
  const strokes = (count) => (tallyMarks(count).path.match(/M/g) || []).length;
  assert.equal(tallyMarks(0).path, '');
  assert.equal(tallyMarks(0).width, 0);
  assert.deepEqual([slashes(3), strokes(3)], [0, 3]);
  assert.deepEqual([slashes(5), strokes(5)], [1, 5]);
  assert.deepEqual([slashes(12), strokes(12)], [2, 12]);
  assert.ok(tallyMarks(12).width > tallyMarks(5).width);
});

test('machineHistory: dated lines of one machine, oldest first', () => {
  const lines = [
    lift('leg', 60),                       // before any date: left out
    date('2026-11-18'), lift('leg', 80), lift('chest', 35),
    date('2026-11-16'), lift('leg', 75),
  ];
  assert.deepEqual(machineHistory(lines, 'leg'), [
    { date: '2026-11-16', weight: 75 },
    { date: '2026-11-18', weight: 80 },
  ]);
  assert.deepEqual(machineHistory(lines, 'nothing'), []);
});

test('chartScale: the smallest kg per line that still fits', () => {
  assert.deepEqual(chartScale([75, 80], 5), { top: 80, perLine: 2.5 });
  assert.deepEqual(chartScale([65, 80], 5), { top: 80, perLine: 5 });
  assert.deepEqual(chartScale([45, 80], 5), { top: 80, perLine: 10 });
  assert.deepEqual(chartScale([37.5], 5), { top: 37.5, perLine: 2.5 });
  assert.deepEqual(chartScale([0, 1000], 5), { top: 1000, perLine: 100 });
});

test('chartPoints: spread evenly, weights on a ruled line sit exactly on it', () => {
  const points = [{ weight: 70 }, { weight: 75 }, { weight: 80 }];
  const box = { left: 50, right: 250, firstLineY: 36.5, lineHeight: 44 };
  assert.deepEqual(chartPoints(points, { top: 80, perLine: 5 }, box), [
    { x: 50, y: 124.5 }, { x: 150, y: 80.5 }, { x: 250, y: 36.5 },
  ]);
  assert.deepEqual(chartPoints([{ weight: 80 }], { top: 80, perLine: 5 }, box), [{ x: 250, y: 36.5 }]);
});

test('monthLabels: first point of each month, skipping labels that would collide', () => {
  const points = [{ date: '2026-09-05' }, { date: '2026-09-19' }, { date: '2026-10-10' }, { date: '2026-11-16' }];
  const at = (xs) => xs.map((x) => ({ x, y: 0 }));
  assert.deepEqual(monthLabels(points, at([0, 50, 100, 150]), 44), [
    { x: 0, month: 9 }, { x: 100, month: 10 }, { x: 150, month: 11 },
  ]);
  assert.deepEqual(monthLabels(points, at([0, 10, 20, 60]), 44), [{ x: 0, month: 9 }, { x: 60, month: 11 }]);
});
