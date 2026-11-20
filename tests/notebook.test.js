import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const {
  linesInDateOrder, markFor, analyzeLines, machinesInCurrentDay, kgOptions,
  sortMachines, withoutExamples, exampleNotebook,
} = load('notebook');

const date = (id, iso) => ({ id, type: 'date', date: iso });
const text = (id, words) => ({ id, type: 'text', text: words });
const lift = (id, machineId, weight) => ({ id, type: 'machine', machineId, name: machineId, weight, sets: 3, reps: 12 });

test('markFor: first time has no mark', () => {
  assert.deepEqual(markFor(80, undefined), { mark: null, repeats: 0 });
});

test('markFor: heavier is up, lighter is down, same counts the repeats', () => {
  assert.deepEqual(markFor(85, { weight: 80, repeats: 3 }), { mark: 'up', repeats: 0 });
  assert.deepEqual(markFor(75, { weight: 80, repeats: 3 }), { mark: 'down', repeats: 0 });
  assert.deepEqual(markFor(80, { weight: 80, repeats: 0 }), { mark: 1, repeats: 1 });
  assert.deepEqual(markFor(80, { weight: 80, repeats: 2 }), { mark: 3, repeats: 3 });
});

test('analyzeLines: marks follow the machine across days', () => {
  const lines = [
    date('d1', '2026-11-07'), lift('a', 'leg', 75),
    date('d2', '2026-11-09'), lift('b', 'leg', 75), lift('x', 'chest', 30),
    date('d3', '2026-11-14'), lift('c', 'leg', 75),
    date('d4', '2026-11-16'), lift('d', 'leg', 80),
    date('d5', '2026-11-18'), lift('e', 'leg', 77.5),
  ];
  const { marks, latest } = analyzeLines(lines);
  assert.deepEqual(['a', 'b', 'c', 'd', 'e', 'x'].map((id) => marks.get(id)), [null, 1, 2, 'up', 'down', null]);
  assert.deepEqual(latest.get('leg'), { weight: 77.5, sets: 3, reps: 12, repeats: 0 });
});

test('analyzeLines: a day written later but dated earlier is compared in date order', () => {
  const lines = [
    date('d2', '2026-11-18'), lift('today', 'leg', 80),
    date('d1', '2026-11-17'), lift('yesterday', 'leg', 75),
  ];
  const { marks, latest } = analyzeLines(lines);
  assert.equal(marks.get('yesterday'), null);
  assert.equal(marks.get('today'), 'up');
  assert.equal(latest.get('leg').weight, 80);
});

test('linesInDateOrder: undated lines first, same dates keep written order, date lines left out', () => {
  const lines = [text('t0', 'loose'), date('d1', '2026-01-02'), text('t1', 'b'), date('d2', '2026-01-01'), text('t2', 'a'), date('d3', '2026-01-02'), text('t3', 'c')];
  assert.deepEqual(linesInDateOrder(lines).map((l) => l.id), ['t0', 't2', 't1', 't3']);
});

test('machinesInCurrentDay: only what was written since the last date', () => {
  const lines = [date('d1', '2026-11-16'), lift('a', 'leg', 80), date('d2', '2026-11-18'), lift('b', 'chest', 35), text('t', 'bike')];
  assert.deepEqual([...machinesInCurrentDay(lines)], ['chest']);
  assert.deepEqual([...machinesInCurrentDay([])], []);
});

test('kgOptions: steps of 2.5 from 0, and always holds the asked value', () => {
  const options = kgOptions(35);
  assert.deepEqual(options.slice(0, 4), [0, 2.5, 5, 7.5]);
  assert.equal(options[options.length - 1], 300);
  assert.ok(options.includes(35));
  const odd = kgOptions(41);
  assert.equal(odd[odd.indexOf(41) - 1], 40);
  assert.equal(odd[odd.indexOf(41) + 1], 42.5);
  assert.equal(kgOptions(320).at(-1), 320);
});

test('sortMachines: alphabetical, ignoring case, without changing the original', () => {
  const machines = [{ name: 'Leg press' }, { name: 'abductor' }, { name: 'Chest press' }];
  assert.deepEqual(sortMachines(machines).map((m) => m.name), ['abductor', 'Chest press', 'Leg press']);
  assert.equal(machines[0].name, 'Leg press');
});

test('withoutExamples: removes demo lines but keeps a demo date that has your own lines under it', () => {
  const lines = [
    { ...date('d1', '2026-11-14'), example: true }, { ...text('t1', 'demo'), example: true },
    { ...date('d2', '2026-11-16'), example: true }, { ...text('t2', 'demo'), example: true }, text('mine', 'my line'),
    date('d3', '2026-11-18'), text('mine2', 'another'),
  ];
  const kept = withoutExamples(lines);
  assert.deepEqual(kept.map((l) => l.id), ['d2', 'mine', 'd3', 'mine2']);
  assert.ok(!kept[0].example);
});

test('exampleNotebook: five days, every machine line points at a machine', () => {
  const notebook = exampleNotebook();
  assert.equal(notebook.lines.filter((l) => l.type === 'date').length, 5);
  const ids = new Set(notebook.machines.map((m) => m.id));
  assert.ok(notebook.lines.filter((l) => l.type === 'machine').every((l) => ids.has(l.machineId)));
  assert.equal(new Set(notebook.lines.map((l) => l.id)).size, notebook.lines.length);
});
