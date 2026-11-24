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

/* ---- Edges ---- */

test('scale: weights that exactly fill the rows keep the finer scale', () => {
  // 70 to 80 at 2.5 kg a line is 4 steps: exactly the 5 rows.
  assert.deepEqual(ChartMath.scale([70, 80], 5), { top: 80, perLine: 2.5 });
  // One step more and it needs the next scale.
  assert.deepEqual(ChartMath.scale([67.5, 80], 5), { top: 80, perLine: 5 });
});

test('spacedOut: exactly the minimum gap is spaced out enough', () => {
  assert.equal(ChartMath.spacedOut([0, 50, 100], 50), true);
  assert.equal(ChartMath.spacedOut([0, 49.9], 50), false);
});

test('monthLabels: a label exactly the minimum gap away is kept', () => {
  const points = [{ date: '2026-09-05' }, { date: '2026-10-10' }, { date: '2026-11-16' }];
  assert.deepEqual(ChartMath.monthLabels(points, [{ x: 0 }, { x: 44 }, { x: 87 }], 44), [
    { x: 0, year: 2026, month: 9 }, { x: 44, year: 2026, month: 10 },
  ]);
});

/* ---- Tally marks: how they are laid out ---- */

// The strokes of a tally path: upright marks ("M x y l dx dy") and slashes ("M x y L x2 y2").
const strokesOf = (count) => {
  const marks = [];
  const slashes = [];
  for (const [, x, y, rel, a, b] of ChartMath.tallyMarks(count).path.matchAll(/M(-?[\d.]+) (-?[\d.]+)\s*([lL])(-?[\d.]+) (-?[\d.]+)/g)) {
    const [x1, y1] = [Number(x), Number(y)];
    if (rel === 'l') marks.push({ x1, y1, x2: x1 + Number(a), y2: y1 + Number(b) });
    else slashes.push({ x1, y1, x2: Number(a), y2: Number(b) });
  }
  return { marks, slashes };
};
const STROKE = 2.2; // the stroke width the page draws tally marks with

test('tallyMarks: every stroke sits inside the width, with room for the pen', () => {
  for (let count = 1; count <= 17; count++) {
    const { width } = ChartMath.tallyMarks(count);
    const { marks, slashes } = strokesOf(count);
    for (const s of [...marks, ...slashes]) {
      assert.ok(Math.min(s.x1, s.x2) >= 0, `count ${count}: stroke starts left of 0`);
      assert.ok(Math.max(s.x1, s.x2) + STROKE / 2 <= width, `count ${count}: stroke runs past the width`);
    }
  }
});

test('tallyMarks: upright marks never overlap', () => {
  for (let count = 1; count <= 17; count++) {
    const xs = strokesOf(count).marks.map((m) => m.x1);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 2 * STROKE, `count ${count}: marks ${i - 1} and ${i} touch`);
  }
});

test('tallyMarks: marks never move as the count grows; the next mark goes where the next five has it', () => {
  const full = strokesOf(15).marks.map(({ x1, y1 }) => [x1, y1]);
  for (let count = 1; count < 15; count++) {
    const upright = 4 * Math.floor(count / 5) + (count % 5); // the fifth of a group is the slash
    assert.deepEqual(strokesOf(count).marks.map(({ x1, y1 }) => [x1, y1]), full.slice(0, upright), `count ${count}`);
  }
});

test('tallyMarks: groups of five are spaced evenly, with a gap between them', () => {
  const { slashes } = strokesOf(15);
  const starts = slashes.map((s) => s.x1);
  assert.equal(starts.length, 3);
  assert.equal(starts[1] - starts[0], starts[2] - starts[1]);
  assert.ok(starts[1] - starts[0] > Math.max(...slashes.map((s) => s.x2 - s.x1)), 'groups touch');
  assert.equal(ChartMath.tallyMarks(10).width, 2 * ChartMath.tallyMarks(5).width);
  assert.equal(ChartMath.tallyMarks(15).width, 3 * ChartMath.tallyMarks(5).width);
});

test('tallyMarks: the fifth mark is a slash across the four before it', () => {
  for (const count of [5, 9, 10]) {
    const { marks, slashes } = strokesOf(count);
    slashes.forEach((slash, g) => {
      const four = marks.slice(g * 4, g * 4 + 4);
      assert.equal(four.length, 4);
      assert.ok(slash.x1 < Math.min(...four.map((m) => Math.min(m.x1, m.x2))), 'slash starts left of the first mark');
      assert.ok(slash.x2 > Math.max(...four.map((m) => Math.max(m.x1, m.x2))), 'slash ends right of the fourth mark');
      // It runs between the tops and bottoms of the marks, so it crosses each one.
      for (const y of [slash.y1, slash.y2]) {
        assert.ok(four.every((m) => y > Math.min(m.y1, m.y2) && y < Math.max(m.y1, m.y2)));
      }
    });
  }
});

test('tallyMarks: width grows with the count; each loose mark adds one mark of room', () => {
  const widths = [0, 1, 2, 3, 4, 5, 6, 7].map((count) => ChartMath.tallyMarks(count).width);
  for (let i = 1; i < widths.length; i++) assert.ok(widths[i] > widths[i - 1], `width of ${i}`);
  assert.deepEqual(widths, [0, 11, 20, 29, 38, 46, 57, 66]);
});
