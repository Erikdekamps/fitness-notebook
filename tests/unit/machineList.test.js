import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { MachineList } = load('machineList');
const { Notebook } = load('notebook');

const legPress = { id: 'm-leg', name: 'Leg press' };
const ownMachine = { id: 'm-own', name: 'My own machine' };
const LISTED = MachineList.LIST.map(([name]) => name);

/* ---- The list ---- */

test('the list: 146 machines A to Z, every name once, every id once', () => {
  assert.equal(LISTED.length, 146);
  assert.deepEqual(Notebook.sortMachines(LISTED.map((name) => ({ name }))).map((m) => m.name), LISTED);
  assert.equal(new Set(LISTED.map((n) => n.toLowerCase())).size, 146);
  assert.equal(new Set(LISTED.map(MachineList.idFor)).size, 146);
  assert.ok(!LISTED.includes('Dumbbells')); // a new notebook gets it too, but it works nothing in particular
});

test('the list: names are clean, and short enough for the machine wheel', () => {
  for (const name of LISTED) {
    assert.equal(name, name.trim().replace(/\s+/g, ' '));
    assert.ok(name.length <= 22, name);
    assert.match(name, /^[A-Z]/);
  }
});

test('the list: every machine says what it works mostly, what else, and with what, in small letters', () => {
  for (const [name, about] of MachineList.LIST) {
    const [mostly, also, what, ...rest] = about.split('; ');
    assert.match(mostly, /^[a-z][a-z ]+$/, name);
    assert.match(also, /^([a-z][a-z ]+(, [a-z][a-z ]+)*)?$/, name);
    assert.match(what, /^(a |dumbbells|your own weight)/, name);
    assert.deepEqual(rest, [], name);
  }
});

test('OTHER_NAMES: clean names the list does not have, each once, each for a machine of the list', () => {
  const names = MachineList.OTHER_NAMES.map(([name]) => name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  for (const [name, listName] of MachineList.OTHER_NAMES) {
    assert.match(name, /^[A-Z][a-z]+( |-)/); // a real name of two words or more, never empty
    assert.equal(name, name.trim().replace(/\s+/g, ' '));
    assert.ok(!LISTED.some((own) => own.toLowerCase() === name.toLowerCase()), name);
    assert.ok(LISTED.includes(listName), listName);
    assert.equal(MachineList.nameFor(name), listName);
  }
});

/* ---- One machine ---- */

test('idFor: "m-" and the name, small letters, a dash for each space', () => {
  assert.equal(MachineList.idFor('Leg press calf raise'), 'm-leg-press-calf-raise');
  assert.equal(MachineList.idFor('EZ-bar curl'), 'm-ez-bar-curl');
});

test('nameFor: the name in the list, whatever the case and spaces; else null', () => {
  assert.equal(MachineList.nameFor('Leg press'), 'Leg press');
  assert.equal(MachineList.nameFor('  LEG   press '), 'Leg press');
  assert.equal(MachineList.nameFor('Abdominal'), 'Abdominal');
  assert.equal(MachineList.nameFor('Dumbbells'), null);
  assert.equal(MachineList.nameFor('My own machine'), null);
});

test('nameFor: the other names too, such as another app writes them', () => {
  assert.equal(MachineList.nameFor('Squat (barbell)'), 'Squat');
  assert.equal(MachineList.nameFor('bench press (BARBELL)'), 'Bench press');
  assert.equal(MachineList.nameFor('Pull up'), 'Pull-up');
});

test('nameForId: the name in the list of the machine with that id; else null', () => {
  assert.equal(MachineList.nameForId('m-leg-press'), 'Leg press');
  assert.equal(MachineList.nameForId('m-abdominal'), 'Abdominal');
  assert.equal(MachineList.nameForId('m-squat-(barbell)'), null); // an other name has no id of its own
  assert.equal(MachineList.nameForId('mx7f2k'), null);
});

test('listNameOf: by its name, else by its id: a machine the notebook started with is still itself after a rename', () => {
  assert.equal(MachineList.listNameOf(legPress), 'Leg press');
  assert.equal(MachineList.listNameOf({ id: 'm-x', name: 'Bicep curl (dumbbell)' }), 'Dumbbell curl');
  assert.equal(MachineList.listNameOf({ id: 'm-leg-press', name: 'Seated leg press' }), 'Leg press');
  assert.equal(MachineList.listNameOf({ id: 'm-leg-curl', name: 'Seated leg curl' }), 'Seated leg curl'); // its name wins over its id
  assert.equal(MachineList.listNameOf(ownMachine), null);
});

test('aboutOf: what a machine works, and with what, in plain words; null for a machine that is not in the list', () => {
  assert.deepEqual(MachineList.aboutOf(legPress), { mostly: 'quads', also: 'glutes, hamstrings', with: 'a machine' });
  assert.deepEqual(MachineList.aboutOf({ id: 'm-1', name: 'Leg extension' }), { mostly: 'quads', also: '', with: 'a machine' });
  assert.deepEqual(MachineList.aboutOf({ id: 'm-1', name: 'Row rear deltoid' }), { mostly: 'back of the shoulders', also: 'upper back', with: 'a machine' });
  assert.equal(MachineList.aboutOf({ id: 'm-1', name: 'Abdominal' }).with, 'a machine'); // the ab machine
  assert.deepEqual(MachineList.aboutOf({ id: 'm-1', name: 'Squat (barbell)' }), MachineList.aboutOf({ id: 'm-2', name: 'Squat' }));
  assert.equal(MachineList.aboutOf({ id: 'm-leg-press', name: 'Seated leg press' }).mostly, 'quads');
  assert.equal(MachineList.aboutOf({ id: 'm-dumbbells', name: 'Dumbbells' }), null);
  assert.equal(MachineList.aboutOf(ownMachine), null);
  assert.equal(MachineList.aboutOf({ id: 'm-1', name: 'toString' }), null); // only machines, nothing every object has
});

/* ---- Machines from before the list ---- */

test('named: a machine takes its name in the list; one not in the list, or whose name is taken, keeps its own', () => {
  const machines = [
    { id: 'a', name: 'Squat (barbell)' },
    { id: 'b', name: 'Seated Leg curl' },
    { id: 'c', name: 'Pull up' },
    { id: 'd', name: 'pull-up' },
    { id: 'e', name: 'Rotary torso' },
    { id: 'f', name: 'Leg press' },
    { id: 'm-fly', name: 'Pec fly' },
  ];
  const named = MachineList.named(machines);
  assert.deepEqual(named.map((m) => m.name), ['Squat', 'Seated leg curl', 'Pull up', 'Pull-up', 'Rotary torso', 'Leg press', 'Fly']);
  assert.deepEqual(named[0], { id: 'a', name: 'Squat' });
  assert.equal(named[4], machines[4]);
  assert.equal(named[5], machines[5]); // a machine that has its name already is left as it is
  assert.equal(machines[0].name, 'Squat (barbell)'); // the list given is left alone
});

test('missing: a machine of the list is there when a machine has its name, one of its other names, or its id', () => {
  const missing = MachineList.missing([{ id: 'm-1', name: 'SQUAT' }, { id: 'm-2', name: 'Bench press (barbell)' }, { id: 'm-leg-press', name: 'Leg press 45°' }]);
  assert.equal(missing.length, 143);
  assert.ok(!missing.some((m) => ['Squat', 'Bench press', 'Leg press'].includes(m.name)));
  assert.deepEqual(missing[0], { id: 'm-abdominal', name: 'Abdominal' });
});

test('missing: a machine of the list gets a new id when its usual one is taken by another machine', (t) => {
  t.mock.method(Date, 'now', () => 0); // Date.now() in base 36 starts with "m" until about 2029, which would hide a missing prefix
  const missing = MachineList.missing([{ id: 'm-abdominal', name: 'Cable crunch' }]);
  const abdominal = missing.find((m) => m.name === 'Abdominal');
  assert.notEqual(abdominal.id, 'm-abdominal');
  assert.match(abdominal.id, /^m0/);
  assert.equal(missing.find((m) => m.name === 'Leg press').id, 'm-leg-press');
  assert.ok(!missing.some((m) => m.name === 'Cable crunch'));
});

test('complete: machines from before the list keep theirs, and get the machines of the list they lack', () => {
  const machines = MachineList.complete([legPress, ownMachine]);
  assert.equal(machines.length, 2 + 145);
  assert.deepEqual(machines.slice(0, 2), [legPress, ownMachine]);
  assert.ok(machines.slice(2).every((m) => m.id === MachineList.idFor(m.name)));
  assert.equal(machines.filter((m) => m.name === 'Leg press').length, 1);
  assert.ok(!machines.some((m) => m.name === 'Pull up')); // an other name is never added by itself
});

test('complete: a machine renamed, or named the way another app names it, takes its name in the list, and no second machine is added for it', () => {
  const machines = MachineList.complete([{ id: 'm-h1', name: 'Squat (barbell)' }, { id: 'm-leg-press', name: 'Seated leg press' }]);
  assert.deepEqual(machines.slice(0, 2), [{ id: 'm-h1', name: 'Squat' }, { id: 'm-leg-press', name: 'Leg press' }]);
  assert.equal(machines.length, 146);
  assert.equal(machines.filter((m) => m.name === 'Squat' || m.name === 'Leg press').length, 2);
});

test('complete: a notebook with every machine stays as it is; one without machines stays without', () => {
  const all = Notebook.exampleData().machines;
  assert.deepEqual(MachineList.complete(all), all);
  const none = [];
  assert.equal(MachineList.complete(none), none);
});
