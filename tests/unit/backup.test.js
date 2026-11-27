import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { Backup } = load('backup');

const data = {
  version: 1,
  machines: [{ id: 'm1', name: 'Leg press', step: 5 }],
  lines: [
    { id: 'a', type: 'date', date: '2026-11-16', example: true },
    { id: 'b', type: 'text', text: 'Biking' },
    { id: 'c', type: 'machine', machineId: 'm1', name: 'Leg press', weight: 80, sets: 3, reps: 12 },
  ],
};
const NOW = new Date('2026-11-19T18:30:00Z');

test('fileName: carries the date', () => {
  assert.equal(Backup.fileName('2026-11-19'), 'fitness-notebook-2026-11-19.json');
});

test('toObject: header fields, and no housekeeping fields', () => {
  const backup = Backup.toObject(data, NOW);
  assert.equal(backup.app, 'fitness-notebook');
  assert.equal(backup.version, 1);
  assert.equal(backup.unit, 'kg');
  assert.equal(backup.exportedAt, '2026-11-19T18:30:00.000Z');
  assert.deepEqual(backup.machines, [{ id: 'm1', name: 'Leg press' }]);
  assert.deepEqual(backup.lines[0], { id: 'a', type: 'date', date: '2026-11-16' });
});

test('round trip: export then import gives the same lines and machines', () => {
  const { data: back, error } = Backup.parse(Backup.toJson(data, NOW));
  assert.equal(error, undefined);
  assert.deepEqual(back.lines, Backup.toObject(data, NOW).lines);
  assert.deepEqual(back.machines, [{ id: 'm1', name: 'Leg press' }]);
});

test('parse: refuses what is not ours', () => {
  assert.equal(Backup.parse('hello').error, 'That is not a backup');
  assert.equal(Backup.parse('{"app": "fitness-notebook", "machines": [').error, 'That is not a backup'); // cut off while copying
  assert.equal(Backup.parse('').error, 'There is nothing to import');
  assert.equal(Backup.parse('  \n ').error, 'There is nothing to import');
  assert.equal(Backup.parse('null').error, 'That is not a Fitness Notebook backup');
  assert.equal(Backup.parse(JSON.stringify({ lines: [], machines: [] })).error, 'That is not a Fitness Notebook backup');
  assert.equal(Backup.parse(JSON.stringify({ app: 'fitness-notebook', version: 1, lines: [] })).error, 'That is not a Fitness Notebook backup');
});

test('parse: refuses a newer version, accepts the current one', () => {
  const file = { app: 'fitness-notebook', version: 2, machines: [], lines: [] };
  assert.equal(Backup.parse(JSON.stringify(file)).error, 'That backup is from a newer version of the app');
  assert.deepEqual(Backup.parse(JSON.stringify({ ...file, version: 1 })).data, { version: 1, machines: [], plans: [], lines: [] });
});

test('parse: ignores fields and line types it does not know', () => {
  const file = {
    app: 'fitness-notebook', version: 1, theme: 'dark',
    machines: [{ id: 'm1', name: ' Leg  press ', colour: 'red' }, { name: 'no id' }],
    lines: [
      { id: 'a', type: 'date', date: '2026-01-02', mood: 'good' },
      { id: 'b', type: 'photo', url: 'x' },
      { id: 'c', type: 'machine', machineId: 'm1', name: 'Leg press', weight: 80, sets: 3, reps: 12, note: 'easy' },
    ],
  };
  const { data: back } = Backup.parse(JSON.stringify(file));
  assert.deepEqual(back.machines, [{ id: 'm1', name: 'Leg press' }]);
  assert.deepEqual(back.lines, [
    { id: 'a', type: 'date', date: '2026-01-02' },
    { id: 'c', type: 'machine', machineId: 'm1', name: 'Leg press', weight: 80, sets: 3, reps: 12 },
  ]);
});

test('cleanLine: drops broken lines, gives a missing id a new one', () => {
  assert.equal(Backup.cleanLine(null), null);
  assert.equal(Backup.cleanLine({ id: 'a', type: 'date', date: '16/11' }), null);
  assert.equal(Backup.cleanLine({ id: 'a', type: 'text', text: '   ' }), null);
  assert.equal(Backup.cleanLine({ id: 'a', type: 'machine', machineId: 'm', name: 'x', weight: '80', sets: 3, reps: 12 }), null);
  assert.equal(Backup.cleanLine({ id: 'a', type: 'machine', machineId: 'm', name: 'x', weight: -5, sets: 3, reps: 12 }), null);
  const line = Backup.cleanLine({ type: 'text', text: ' hi ' });
  assert.equal(line.text, 'hi');
  assert.equal(typeof line.id, 'string');
  assert.ok(line.id.length > 0);
});

test('cleanMachine: needs an id and a name', () => {
  assert.equal(Backup.cleanMachine({ id: 'm', name: '  ' }), null);
  assert.equal(Backup.cleanMachine({ id: 5, name: 'x' }), null);
  assert.deepEqual(Backup.cleanMachine({ id: 'm', name: 'Row' }), { id: 'm', name: 'Row' });
});

test('cleanMachine: keeps a drawing this app has; leaves out one it has not got', () => {
  assert.deepEqual(Backup.cleanMachine({ id: 'm', name: 'Row', picture: 'seated-row' }), { id: 'm', name: 'Row', picture: 'seated-row' });
  assert.deepEqual(Backup.cleanMachine({ id: 'm', name: 'Row', picture: 'burpee' }), { id: 'm', name: 'Row' });
  assert.deepEqual(Backup.cleanMachine({ id: 'm', name: 'Row', picture: 7 }), { id: 'm', name: 'Row' });
});

test('round trip: a machine keeps its drawing', () => {
  const drawn = { ...data, machines: [{ id: 'm1', name: 'Leg press', picture: 'leg-press' }] };
  assert.deepEqual(Backup.parse(Backup.toJson(drawn, NOW)).data.machines, [{ id: 'm1', name: 'Leg press', picture: 'leg-press' }]);
});

test('describe: counts, with singular and plural', () => {
  const thisYear = new Date().getFullYear();
  const one = { machines: [{}], lines: [{ type: 'date', date: `${thisYear}-03-05` }] };
  assert.deepEqual(Backup.describe(one), ['1 line, on 05/03', '1 machine']);
  const many = { machines: [{}, {}], lines: [{ type: 'date', date: `${thisYear}-03-05` }, { type: 'text' }, { type: 'date', date: `${thisYear}-01-02` }] };
  assert.deepEqual(Backup.describe(many), ['3 lines, from 02/01 to 05/03', '2 machines']);
  assert.deepEqual(Backup.describe({ machines: [], lines: [] }), ['0 lines', '0 machines']);
});

/* ---- Plans ---- */

test('round trip: plans and pencil (plan) lines come back as they were', () => {
  const withPlans = {
    ...data,
    plans: [{ id: 'p1', name: 'Leg day', machineIds: ['m1'], colour: 'red' }],
    lines: [...data.lines, { id: 'd', type: 'plan', machineId: 'm1', name: 'Leg press', example: true }],
  };
  const { data: back } = Backup.parse(Backup.toJson(withPlans, NOW));
  assert.deepEqual(back.plans, [{ id: 'p1', name: 'Leg day', machineIds: ['m1'] }]);
  assert.deepEqual(back.lines.at(-1), { id: 'd', type: 'plan', machineId: 'm1', name: 'Leg press' });
});

test('parse: a file from before plans has no plans', () => {
  const file = { app: 'fitness-notebook', version: 1, machines: [], lines: [] };
  assert.deepEqual(Backup.parse(JSON.stringify(file)).data.plans, []);
  assert.deepEqual(Backup.toObject(data, NOW).plans, []);
});

test('cleanPlan: needs an id and a name; machine ids are text, each once', () => {
  assert.deepEqual(Backup.cleanPlan({ id: 'p', name: ' Leg  day ', machineIds: ['a', 7, 'a', 'b'] }), { id: 'p', name: 'Leg day', machineIds: ['a', 'b'] });
  assert.deepEqual(Backup.cleanPlan({ id: 'p', name: 'Leg day' }), { id: 'p', name: 'Leg day', machineIds: [] });
  assert.equal(Backup.cleanPlan({ name: 'no id' }), null);
  assert.equal(Backup.cleanPlan({ id: 'p', name: '  ' }), null);
  assert.equal(Backup.cleanPlan(null), null);
  assert.deepEqual(Backup.cleanPlans('nope'), []);
});

test('cleanLine: a date keeps the name of the plan it started from, when it has one', () => {
  assert.deepEqual(Backup.cleanLine({ id: 'x', type: 'date', date: '2026-11-23', plan: ' Leg  day ' }), { id: 'x', type: 'date', date: '2026-11-23', plan: 'Leg day' });
  assert.deepEqual(Backup.cleanLine({ id: 'x', type: 'date', date: '2026-11-23', plan: 7 }), { id: 'x', type: 'date', date: '2026-11-23' });
  assert.deepEqual(Backup.cleanLine({ id: 'x', type: 'date', date: '2026-11-23', plan: '  ' }), { id: 'x', type: 'date', date: '2026-11-23' });
});

test('cleanLine: a plan line needs a machine and a name', () => {
  assert.equal(Backup.cleanLine({ id: 'x', type: 'plan', machineId: 'm1' }), null);
  assert.equal(Backup.cleanLine({ id: 'x', type: 'plan', name: 'Leg press' }), null);
});

test('describe: names the plans only when there are any', () => {
  const some = { machines: [], lines: [], plans: [{ id: 'p', name: 'Leg day', machineIds: [] }] };
  assert.deepEqual(Backup.describe(some), ['0 lines', '0 machines', '1 plan']);
  assert.deepEqual(Backup.describe({ machines: [], lines: [], plans: [] }), ['0 lines', '0 machines']);
});

test('parse: pasted text reads the same as a file, also with space around it', () => {
  const pasted = `\n\n  ${Backup.toJson(data, NOW)}  \n`;
  assert.deepEqual(Backup.parse(pasted).data, Backup.parse(Backup.toJson(data, NOW)).data);
});

/* ---- What a file may hold, field by field ---- */

const machineLine = (fields) => ({ id: 'x', type: 'machine', machineId: 'm1', name: 'Leg press', weight: 80, sets: 3, reps: 12, ...fields });

test('cleanLine: zero kg, zero sets and zero reps are fine; anything below zero is not', () => {
  assert.deepEqual(Backup.cleanLine(machineLine({ weight: 0, sets: 0, reps: 0 })), machineLine({ weight: 0, sets: 0, reps: 0 }));
  assert.equal(Backup.cleanLine(machineLine({ sets: -1 })), null);
  assert.equal(Backup.cleanLine(machineLine({ reps: -1 })), null);
  assert.equal(Backup.cleanLine(machineLine({ weight: Infinity })), null);
});

test('cleanLine: a machine line needs a machine id and a name', () => {
  assert.equal(Backup.cleanLine(machineLine({ machineId: undefined })), null);
  assert.equal(Backup.cleanLine(machineLine({ machineId: 7 })), null);
  assert.equal(Backup.cleanLine(machineLine({ name: undefined })), null);
});

test('cleanLine: the type decides what a line is, not the fields it happens to carry', () => {
  // A line type this app does not know is dropped, whatever fields it has.
  assert.equal(Backup.cleanLine({ id: 'x', type: 'photo', date: '2026-11-23' }), null);
  assert.equal(Backup.cleanLine({ id: 'x', type: 'photo', text: 'caption' }), null);
  assert.equal(Backup.cleanLine(machineLine({ type: 'photo' })), null);
  assert.equal(Backup.cleanLine({ id: 'x', type: 'photo', name: 'Leg press', weight: 80, sets: 3, reps: 12 }), null);
  // A known type keeps its own shape, even with another type's fields on it.
  assert.deepEqual(Backup.cleanLine({ id: 'x', type: 'text', text: 'Biking', date: '2026-11-23' }), { id: 'x', type: 'text', text: 'Biking' });
  assert.deepEqual(Backup.cleanLine({ id: 'x', type: 'plan', machineId: 'm1', name: 'Leg press', weight: 80, sets: 3, reps: 12 }),
    { id: 'x', type: 'plan', machineId: 'm1', name: 'Leg press' });
  assert.deepEqual(Backup.cleanLine(machineLine({ text: 'note' })), machineLine({}));
});

test('cleanLine: a date must be exactly YYYY-MM-DD', () => {
  assert.equal(Backup.cleanLine({ id: 'x', type: 'date', date: '2026-11-233' }), null);
  assert.equal(Backup.cleanLine({ id: 'x', type: 'date', date: 'on 2026-11-23' }), null);
  assert.equal(Backup.cleanLine({ id: 'x', type: 'date', date: '2026-11-23T10:00' }), null);
  assert.equal(Backup.cleanLine({ id: 'x', type: 'date' }), null);
});

test('cleanLine: a text line needs text', () => {
  assert.equal(Backup.cleanLine({ id: 'x', type: 'text', text: 42 }), null);
  assert.equal(Backup.cleanLine({ id: 'x', type: 'text' }), null);
});

test('cleanLine: a plan line with a blank name is dropped', () => {
  assert.equal(Backup.cleanLine({ id: 'x', type: 'plan', machineId: 'm1', name: '   ' }), null);
});

test('cleanLine: an id that is not text, or is empty, is replaced by a new text id', () => {
  for (const id of [7, '', null]) {
    const line = Backup.cleanLine({ id, type: 'text', text: 'hi' });
    assert.equal(typeof line.id, 'string');
    assert.ok(line.id.length > 0);
  }
});

test('cleanMachine and cleanPlan: a name that is not text is refused', () => {
  assert.equal(Backup.cleanMachine({ id: 'm', name: 42 }), null);
  assert.equal(Backup.cleanMachine({ id: 'm', name: ['Row'] }), null);
  assert.equal(Backup.cleanPlan({ id: 'p', name: 42 }), null);
});

test('parse and toObject: broken machines, plans and lines are left out, the good ones kept', () => {
  const messy = {
    app: 'fitness-notebook', version: 1,
    machines: [{ id: 'm1', name: 'Row' }, { id: 'm2' }, null],
    plans: [{ id: 'p1', name: 'Back day', machineIds: ['m1'] }, { id: 'p2' }, null],
    lines: [{ id: 'a', type: 'text', text: 'hi' }, { id: 'b', type: 'photo' }, null],
  };
  const { data: back } = Backup.parse(JSON.stringify(messy));
  assert.deepEqual(back.machines, [{ id: 'm1', name: 'Row' }]);
  assert.deepEqual(back.plans, [{ id: 'p1', name: 'Back day', machineIds: ['m1'] }]);
  assert.deepEqual(back.lines, [{ id: 'a', type: 'text', text: 'hi' }]);
  const exported = Backup.toObject(messy, NOW);
  assert.deepEqual(exported.machines, back.machines);
  assert.deepEqual(exported.plans, back.plans);
  assert.deepEqual(exported.lines, back.lines);
});

test('parse: a file without a version number is refused, never half-read', () => {
  const file = { app: 'fitness-notebook', machines: [], lines: [] };
  assert.ok(Backup.parse(JSON.stringify(file)).error);
  assert.ok(Backup.parse(JSON.stringify({ ...file, version: '1' })).error);
  assert.equal(Backup.parse(JSON.stringify(file)).data, undefined);
});

test('cleanLine: a line without an id gets one that starts with l, whatever the clock says', (t) => {
  t.mock.method(Date, 'now', () => 0); // Date.now() in base 36 would otherwise start with "m"
  assert.match(Backup.cleanLine({ type: 'text', text: 'Bike' }).id, /^l0/);
});
