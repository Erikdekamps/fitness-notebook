import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { ChartMath } = load('chartMath');

test('scale: the smallest kg per line that still fits', () => {
  assert.deepEqual(ChartMath.scale([75, 80], 5), { top: 80, perLine: 2.5 });
  assert.deepEqual(ChartMath.scale([65, 80], 5), { top: 80, perLine: 5 });
  assert.deepEqual(ChartMath.scale([45, 80], 5), { top: 80, perLine: 10 });
  assert.deepEqual(ChartMath.scale([37.5], 5), { top: 37.5, perLine: 2.5 });
  assert.deepEqual(ChartMath.scale([0, 1000], 5), { top: 1000, perLine: 100 });
});

test('rowsNeeded: just enough lines, never fewer than 2 or more than the maximum', () => {
  assert.equal(ChartMath.rowsNeeded([65, 80], { top: 80, perLine: 5 }, 5), 4);
  assert.equal(ChartMath.rowsNeeded([45, 80], { top: 80, perLine: 10 }, 5), 5);
  assert.equal(ChartMath.rowsNeeded([80], { top: 80, perLine: 2.5 }, 5), 2);
  assert.equal(ChartMath.rowsNeeded([0, 1000], { top: 1000, perLine: 100 }, 5), 5);
});

test('axisValues: one kg value per line, top first, never below zero', () => {
  assert.deepEqual(ChartMath.axisValues({ top: 80, perLine: 5 }, 4), [
    { row: 0, value: 80 }, { row: 1, value: 75 }, { row: 2, value: 70 }, { row: 3, value: 65 },
  ]);
  assert.deepEqual(ChartMath.axisValues({ top: 2.5, perLine: 2.5 }, 3), [{ row: 0, value: 2.5 }, { row: 1, value: 0 }]);
});

test('pointPositions: spread evenly, weights on a ruled line sit exactly on it', () => {
  const points = [{ weight: 70 }, { weight: 75 }, { weight: 80 }];
  const box = { left: 50, right: 250, firstLineY: 36.5, lineHeight: 44 };
  assert.deepEqual(ChartMath.pointPositions(points, { top: 80, perLine: 5 }, box), [
    { x: 50, y: 124.5 }, { x: 150, y: 80.5 }, { x: 250, y: 36.5 },
  ]);
  assert.deepEqual(ChartMath.pointPositions([{ weight: 80 }], { top: 80, perLine: 5 }, box), [{ x: 250, y: 36.5 }]);
});

test('spacedOut', () => {
  assert.equal(ChartMath.spacedOut([66, 124, 211, 298], 50), true);
  assert.equal(ChartMath.spacedOut([66, 100, 211], 50), false);
  assert.equal(ChartMath.spacedOut([], 50), true);
});

test('monthLabels: first point of each month, skipping labels that would collide', () => {
  const points = [{ date: '2026-09-05' }, { date: '2026-09-19' }, { date: '2026-10-10' }, { date: '2026-11-16' }];
  const at = (xs) => xs.map((x) => ({ x, y: 0 }));
  assert.deepEqual(ChartMath.monthLabels(points, at([0, 50, 100, 150]), 44), [
    { x: 0, year: 2026, month: 9 }, { x: 100, year: 2026, month: 10 }, { x: 150, year: 2026, month: 11 },
  ]);
  assert.deepEqual(ChartMath.monthLabels(points, at([0, 10, 20, 60]), 44), [{ x: 0, year: 2026, month: 9 }, { x: 60, year: 2026, month: 11 }]);
});

test('monthLabels: carries the year, so a label can show it', () => {
  const points = [{ date: '2025-12-06' }, { date: '2026-01-24' }];
  assert.deepEqual(ChartMath.monthLabels(points, [{ x: 0 }, { x: 100 }], 44), [{ x: 0, year: 2025, month: 12 }, { x: 100, year: 2026, month: 1 }]);
});

test('tallyMarks: a slash for every five', () => {
  const slashes = (count) => (ChartMath.tallyMarks(count).path.match(/L/g) || []).length;
  const strokes = (count) => (ChartMath.tallyMarks(count).path.match(/M/g) || []).length;
  assert.equal(ChartMath.tallyMarks(0).path, '');
  assert.equal(ChartMath.tallyMarks(0).width, 0);
  assert.deepEqual([slashes(3), strokes(3)], [0, 3]);
  assert.deepEqual([slashes(5), strokes(5)], [1, 5]);
  assert.deepEqual([slashes(12), strokes(12)], [2, 12]);
  assert.ok(ChartMath.tallyMarks(12).width > ChartMath.tallyMarks(5).width);
});
