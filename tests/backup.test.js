import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const {
  backupFileName, cleanMachine, cleanLine, toBackup, toBackupJson, parseBackup, describeNotebook,
} = load('backup');

const notebook = {
  version: 1,
  machines: [{ id: 'm1', name: 'Leg press', step: 5 }],
  lines: [
    { id: 'a', type: 'date', date: '2026-11-16', example: true },
    { id: 'b', type: 'text', text: 'Biking' },
    { id: 'c', type: 'machine', machineId: 'm1', name: 'Leg press', weight: 80, sets: 3, reps: 12 },
  ],
};
const NOW = new Date('2026-11-19T18:30:00Z');

test('backupFileName: carries the date', () => {
  assert.equal(backupFileName('2026-11-19'), 'fitness-notebook-2026-11-19.json');
});

test('toBackup: header fields, and no housekeeping fields', () => {
  const backup = toBackup(notebook, NOW);
  assert.equal(backup.app, 'fitness-notebook');
  assert.equal(backup.version, 1);
  assert.equal(backup.unit, 'kg');
  assert.equal(backup.exportedAt, '2026-11-19T18:30:00.000Z');
  assert.deepEqual(backup.machines, [{ id: 'm1', name: 'Leg press' }]);
  assert.deepEqual(backup.lines[0], { id: 'a', type: 'date', date: '2026-11-16' });
});

test('round trip: export then import gives the same lines and machines', () => {
  const { notebook: back, error } = parseBackup(toBackupJson(notebook, NOW));
  assert.equal(error, undefined);
  assert.deepEqual(back.lines, toBackup(notebook, NOW).lines);
  assert.deepEqual(back.machines, [{ id: 'm1', name: 'Leg press' }]);
});

test('parseBackup: refuses what is not ours', () => {
  assert.equal(parseBackup('hello').error, 'That is not a JSON file');
  assert.equal(parseBackup('null').error, 'That is not a Fitness Notebook file');
  assert.equal(parseBackup(JSON.stringify({ lines: [], machines: [] })).error, 'That is not a Fitness Notebook file');
  assert.equal(parseBackup(JSON.stringify({ app: 'fitness-notebook', version: 1, lines: [] })).error, 'That is not a Fitness Notebook file');
});

test('parseBackup: refuses a newer version, accepts the current one', () => {
  const file = { app: 'fitness-notebook', version: 2, machines: [], lines: [] };
  assert.equal(parseBackup(JSON.stringify(file)).error, 'That file is from a newer version of the app');
  assert.deepEqual(parseBackup(JSON.stringify({ ...file, version: 1 })).notebook, { version: 1, machines: [], lines: [] });
});

test('parseBackup: ignores fields and line types it does not know', () => {
  const file = {
    app: 'fitness-notebook', version: 1, theme: 'dark',
    machines: [{ id: 'm1', name: ' Leg  press ', colour: 'red' }, { name: 'no id' }],
    lines: [
      { id: 'a', type: 'date', date: '2026-01-02', mood: 'good' },
      { id: 'b', type: 'photo', url: 'x' },
      { id: 'c', type: 'machine', machineId: 'm1', name: 'Leg press', weight: 80, sets: 3, reps: 12, note: 'easy' },
    ],
  };
  const { notebook: back } = parseBackup(JSON.stringify(file));
  assert.deepEqual(back.machines, [{ id: 'm1', name: 'Leg press' }]);
  assert.deepEqual(back.lines, [
    { id: 'a', type: 'date', date: '2026-01-02' },
    { id: 'c', type: 'machine', machineId: 'm1', name: 'Leg press', weight: 80, sets: 3, reps: 12 },
  ]);
});

test('cleanLine: drops broken lines, gives a missing id a new one', () => {
  assert.equal(cleanLine(null), null);
  assert.equal(cleanLine({ id: 'a', type: 'date', date: '16/11' }), null);
  assert.equal(cleanLine({ id: 'a', type: 'text', text: '   ' }), null);
  assert.equal(cleanLine({ id: 'a', type: 'machine', machineId: 'm', name: 'x', weight: '80', sets: 3, reps: 12 }), null);
  assert.equal(cleanLine({ id: 'a', type: 'machine', machineId: 'm', name: 'x', weight: -5, sets: 3, reps: 12 }), null);
  const line = cleanLine({ type: 'text', text: ' hi ' });
  assert.equal(line.text, 'hi');
  assert.equal(typeof line.id, 'string');
  assert.ok(line.id.length > 0);
});

test('cleanMachine: needs an id and a name', () => {
  assert.equal(cleanMachine({ id: 'm', name: '  ' }), null);
  assert.equal(cleanMachine({ id: 5, name: 'x' }), null);
  assert.deepEqual(cleanMachine({ id: 'm', name: 'Row' }), { id: 'm', name: 'Row' });
});

test('describeNotebook: counts, with singular and plural', () => {
  const thisYear = new Date().getFullYear();
  const one = { machines: [{}], lines: [{ type: 'date', date: `${thisYear}-03-05` }] };
  assert.deepEqual(describeNotebook(one), ['1 line, on 05/03', '1 machine']);
  const many = { machines: [{}, {}], lines: [{ type: 'date', date: `${thisYear}-03-05` }, { type: 'text' }, { type: 'date', date: `${thisYear}-01-02` }] };
  assert.deepEqual(describeNotebook(many), ['3 lines, from 02/01 to 05/03', '2 machines']);
  assert.deepEqual(describeNotebook({ machines: [], lines: [] }), ['0 lines', '0 machines']);
});
