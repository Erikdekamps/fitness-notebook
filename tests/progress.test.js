import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { Progress } = load('progress');

const date = (id, iso) => ({ id, type: 'date', date: iso });
const text = (id, words) => ({ id, type: 'text', text: words });
const lift = (id, machineId, weight) => ({ id, type: 'machine', machineId, name: machineId, weight, sets: 3, reps: 12 });

test('sessionDates: one entry per date line', () => {
  const dates = Progress.sessionDates([date('a', '2026-11-16'), lift('b', 'leg', 80), date('c', '2026-11-18'), date('d', '2026-11-16')]);
  assert.deepEqual([...dates].sort(), ['2026-11-16', '2026-11-18']);
});

test('machinesInCurrentDay: only what was written since the last date', () => {
  const lines = [date('d1', '2026-11-16'), lift('a', 'leg', 80), date('d2', '2026-11-18'), lift('b', 'chest', 35), text('t', 'bike')];
  assert.deepEqual([...Progress.machinesInCurrentDay(lines)], ['chest']);
  assert.deepEqual([...Progress.machinesInCurrentDay([])], []);
});

test('linesInDateOrder: undated lines first, same dates keep written order, date lines left out', () => {
  const lines = [text('t0', 'loose'), date('d1', '2026-01-02'), text('t1', 'b'), date('d2', '2026-01-01'), text('t2', 'a'), date('d3', '2026-01-02'), text('t3', 'c')];
  assert.deepEqual(Progress.linesInDateOrder(lines).map((l) => l.id), ['t0', 't2', 't1', 't3']);
});

test('markFor: first time has no mark', () => {
  assert.deepEqual(Progress.markFor(80, undefined), { mark: null, repeats: 0 });
});

test('markFor: heavier is up, lighter is down, same counts the repeats', () => {
  assert.deepEqual(Progress.markFor(85, { weight: 80, repeats: 3 }), { mark: 'up', repeats: 0 });
  assert.deepEqual(Progress.markFor(75, { weight: 80, repeats: 3 }), { mark: 'down', repeats: 0 });
  assert.deepEqual(Progress.markFor(80, { weight: 80, repeats: 0 }), { mark: 1, repeats: 1 });
  assert.deepEqual(Progress.markFor(80, { weight: 80, repeats: 2 }), { mark: 3, repeats: 3 });
});

test('analyzeLines: marks follow the machine across days', () => {
  const lines = [
    date('d1', '2026-11-07'), lift('a', 'leg', 75),
    date('d2', '2026-11-09'), lift('b', 'leg', 75), lift('x', 'chest', 30),
    date('d3', '2026-11-14'), lift('c', 'leg', 75),
    date('d4', '2026-11-16'), lift('d', 'leg', 80),
    date('d5', '2026-11-18'), lift('e', 'leg', 77.5),
  ];
  const { marks, latest } = Progress.analyzeLines(lines);
  assert.deepEqual(['a', 'b', 'c', 'd', 'e', 'x'].map((id) => marks.get(id)), [null, 1, 2, 'up', 'down', null]);
  assert.deepEqual(latest.get('leg'), { weight: 77.5, sets: 3, reps: 12, repeats: 0 });
});

test('analyzeLines: a day written later but dated earlier is compared in date order', () => {
  const lines = [
    date('d2', '2026-11-18'), lift('today', 'leg', 80),
    date('d1', '2026-11-17'), lift('yesterday', 'leg', 75),
  ];
  const { marks, latest } = Progress.analyzeLines(lines);
  assert.equal(marks.get('yesterday'), null);
  assert.equal(marks.get('today'), 'up');
  assert.equal(latest.get('leg').weight, 80);
});

test('machineHistory: dated lines of one machine, oldest first', () => {
  const lines = [
    lift('x', 'leg', 60), // before any date: left out
    date('d2', '2026-11-18'), lift('b', 'leg', 80), lift('c', 'chest', 35),
    date('d1', '2026-11-16'), lift('a', 'leg', 75),
  ];
  assert.deepEqual(Progress.machineHistory(lines, 'leg'), [
    { date: '2026-11-16', weight: 75 },
    { date: '2026-11-18', weight: 80 },
  ]);
  assert.deepEqual(Progress.machineHistory(lines, 'nothing'), []);
});

test('changeIndexes and weightChanges: the first time, and every time the weight is new', () => {
  const points = [
    { date: '2026-09-05', weight: 65 }, { date: '2026-09-12', weight: 65 },
    { date: '2026-09-19', weight: 70 }, { date: '2026-10-10', weight: 75 },
    { date: '2026-10-17', weight: 75 }, { date: '2026-11-16', weight: 70 },
  ];
  assert.deepEqual(Progress.changeIndexes(points), [0, 2, 3, 5]);
  assert.deepEqual(Progress.weightChanges(points).map((p) => `${p.date} ${p.weight}`), ['2026-09-05 65', '2026-09-19 70', '2026-10-10 75', '2026-11-16 70']);
  assert.deepEqual(Progress.changeIndexes([]), []);
});

test('kgOptions: steps of 2.5 from 0, and always holds the asked value', () => {
  const options = Progress.kgOptions(35);
  assert.deepEqual(options.slice(0, 4), [0, 2.5, 5, 7.5]);
  assert.equal(options.at(-1), 300);
  assert.ok(options.includes(35));
  const odd = Progress.kgOptions(41);
  assert.equal(odd[odd.indexOf(41) - 1], 40);
  assert.equal(odd[odd.indexOf(41) + 1], 42.5);
  assert.equal(Progress.kgOptions(320).at(-1), 320);
});

/* ---- Plan lines: machines a plan put on the page, not logged yet ---- */

const planned = (id, machineId) => ({ id, type: 'plan', machineId, name: machineId });

test('plannedInDay: the pencil lines of the day a line is in, top to bottom', () => {
  const lines = [
    date('d1', '2026-11-16'), planned('old', 'leg'),
    date('d2', '2026-11-18'), text('t', 'Leg day'), lift('a', 'leg', 80), planned('p1', 'curl'), planned('p2', 'calf'),
    date('d3', '2026-11-20'), lift('b', 'leg', 80),
  ];
  assert.deepEqual(Progress.plannedInDay(lines, 'a').map((l) => l.id), ['p1', 'p2']);
  assert.deepEqual(Progress.plannedInDay(lines, 'p2').map((l) => l.id), ['p1', 'p2']);
  assert.deepEqual(Progress.plannedInDay(lines, 'd2').map((l) => l.id), ['p1', 'p2']);
  assert.deepEqual(Progress.plannedInDay(lines, 'd1').map((l) => l.id), ['old']);
  assert.deepEqual(Progress.plannedInDay(lines, 'b'), []);
  assert.deepEqual(Progress.plannedInDay(lines, 'nope'), []);
});

test('plan lines never count: no mark, no history, not done today', () => {
  const lines = [date('d1', '2026-11-16'), lift('a', 'leg', 80), date('d2', '2026-11-18'), planned('p', 'leg'), planned('q', 'curl')];
  const { marks, latest } = Progress.analyzeLines(lines);
  assert.deepEqual([...marks.keys()], ['a']);
  assert.deepEqual([...latest.keys()], ['leg']);
  assert.deepEqual(Progress.machineHistory(lines, 'leg'), [{ date: '2026-11-16', weight: 80 }]);
  assert.deepEqual([...Progress.machinesInCurrentDay(lines)], []);
  assert.deepEqual([...Progress.sessionDates(lines)].sort(), ['2026-11-16', '2026-11-18']);
});
