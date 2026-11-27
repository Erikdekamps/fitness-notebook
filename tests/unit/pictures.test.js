import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { load } from './load.js';

const { Pictures } = load('pictures');
const { Notebook } = load('notebook');

const FOLDER = new URL('../../pictures/', import.meta.url);
const legPress = { id: 'm-leg', name: 'Leg press' };
const ownMachine = { id: 'm-own', name: 'My own machine' };

/* ---- The list ---- */

test('the list: 147 machines A to Z, every name and every drawing once', () => {
  const names = Pictures.CATALOG.map(([name]) => name);
  const pictures = Pictures.CATALOG.map(([, picture]) => picture);
  assert.equal(Pictures.CATALOG.length, 147);
  assert.deepEqual(Notebook.sortMachines(names.map((name) => ({ name }))).map((m) => m.name), names);
  assert.equal(new Set(names.map((n) => n.toLowerCase())).size, 147);
  assert.equal(new Set(pictures).size, 147);
  assert.equal(new Set(names.map(Pictures.idFor)).size, 147);
});

test('the list: names are clean, and short enough for the machine wheel', () => {
  for (const [name] of Pictures.CATALOG) {
    assert.equal(name, name.trim().replace(/\s+/g, ' '));
    assert.ok(name.length <= 22, name);
    assert.match(name, /^[A-Z]/);
  }
});

test('DRAWINGS: every drawing of the list and of the other names, once, A to Z', () => {
  const all = Pictures.CATALOG.concat(Pictures.OTHER_NAMES).map(([, picture]) => picture);
  assert.deepEqual(Pictures.DRAWINGS, [...new Set(all)].sort());
  assert.equal(Pictures.DRAWINGS.length, 147); // every other name is for a drawing of the list
});

test('every drawing has its three frames in pictures/, and pictures/ has no others', () => {
  for (const picture of Pictures.DRAWINGS) {
    assert.match(picture, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const frame of Pictures.FRAMES) assert.ok(existsSync(new URL(`${picture}/frame-${frame}.svg`, FOLDER)), `${picture} ${frame}`);
  }
  const folders = readdirSync(FOLDER).filter((name) => name !== 'README.md');
  assert.deepEqual(folders.sort(), Pictures.DRAWINGS);
});

test('OTHER_NAMES: clean names the list does not have, each once, each giving its drawing', () => {
  const names = Pictures.OTHER_NAMES.map(([name]) => name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  for (const [name, picture] of Pictures.OTHER_NAMES) {
    assert.match(name, /^[A-Z][a-z]+( |-)/); // a real name of two words or more, never empty
    assert.equal(name, name.trim().replace(/\s+/g, ' '));
    assert.ok(!Pictures.CATALOG.some(([own]) => own.toLowerCase() === name.toLowerCase()), name);
    assert.ok(Pictures.DRAWINGS.includes(picture), picture);
    assert.equal(Pictures.forName(name), picture);
  }
});

test('FRAMES: 1, 2 and 3', () => {
  assert.deepEqual(Pictures.FRAMES, [1, 2, 3]);
});

/* ---- One drawing ---- */

test('has: only the drawings of the list', () => {
  assert.equal(Pictures.has('leg-press'), true);
  assert.equal(Pictures.has('push-up'), true);
  assert.equal(Pictures.has('burpee'), false); // in Workout Guide, but not used here
  assert.equal(Pictures.has(undefined), false);
  assert.equal(Pictures.has(''), false);
});

test('src: where a frame of a drawing is; frame 1 when none is said', () => {
  assert.equal(Pictures.src('leg-press', 3), 'pictures/leg-press/frame-3.svg');
  assert.equal(Pictures.src('leg-press'), 'pictures/leg-press/frame-1.svg');
});

test('forName: the drawing of a name in the list, whatever the case and spaces; else null', () => {
  assert.equal(Pictures.forName('Leg press'), 'leg-press');
  assert.equal(Pictures.forName('  LEG   press '), 'leg-press');
  assert.equal(Pictures.forName('Abdominal'), 'crunch');
  assert.equal(Pictures.forName('My own machine'), null);
});

test('forName: the other names too, such as another app writes them', () => {
  assert.equal(Pictures.forName('Squat (barbell)'), 'squat');
  assert.equal(Pictures.forName('bench press (BARBELL)'), 'bench-press');
  assert.equal(Pictures.forName('Pull up'), 'pull-up');
});

test('forId: the drawing of the machine of the list with that id; else null', () => {
  assert.equal(Pictures.forId('m-leg-press'), 'leg-press');
  assert.equal(Pictures.forId('m-abdominal'), 'crunch');
  assert.equal(Pictures.forId('m-squat-(barbell)'), null); // an other name has no id of its own
  assert.equal(Pictures.forId('mx7f2k'), null);
});

test('idFor: "m-" and the name, small letters, a dash for each space', () => {
  assert.equal(Pictures.idFor('Leg press calf raise'), 'm-leg-press-calf-raise');
  assert.equal(Pictures.idFor('EZ-bar curl'), 'm-ez-bar-curl');
});

test('withPicture: a machine whose name is in the list gets its drawing; others stay as they are', () => {
  assert.deepEqual(Pictures.withPicture(legPress), { ...legPress, picture: 'leg-press' });
  assert.equal(Pictures.withPicture(ownMachine), ownMachine);
  assert.ok(!('picture' in legPress)); // the machine given is left alone
});

test('withPicture: a machine the notebook started with keeps its drawing after a rename; its name wins over its id', () => {
  assert.deepEqual(Pictures.withPicture({ id: 'm-leg-press', name: 'Seated leg press' }), { id: 'm-leg-press', name: 'Seated leg press', picture: 'leg-press' });
  assert.equal(Pictures.withPicture({ id: 'm-leg-curl', name: 'Seated leg curl' }).picture, 'seated-leg-curl');
  assert.equal(Pictures.withPicture({ id: 'm-x', name: 'Bicep curl (dumbbell)' }).picture, 'bicep-curl');
});

/* ---- Machines from before drawings ---- */

test('fromBefore: some machines, and not one with a drawing', () => {
  assert.equal(Pictures.fromBefore([legPress, ownMachine]), true);
  assert.equal(Pictures.fromBefore([legPress, { ...ownMachine, picture: 'squat' }]), false);
  assert.equal(Pictures.fromBefore([]), false);
});

test('addTo: machines from before drawings get theirs, and the machines of the list they lack', () => {
  const machines = Pictures.addTo([legPress, ownMachine]);
  assert.equal(machines.length, 2 + 146);
  assert.deepEqual(machines.slice(0, 2), [{ ...legPress, picture: 'leg-press' }, ownMachine]);
  assert.ok(machines.slice(2).every((m) => Pictures.has(m.picture) && m.id === Pictures.idFor(m.name)));
  assert.equal(machines.filter((m) => m.picture === 'leg-press').length, 1);
  assert.ok(!machines.some((m) => m.name === 'Pull up')); // an other name is never added by itself
});

test('addTo: machines named the way another app names them get their drawing, and no second machine for it', () => {
  const machines = Pictures.addTo([{ id: 'm-h1', name: 'Squat (barbell)' }, { id: 'm-leg-press', name: 'Seated leg press' }]);
  assert.deepEqual(machines.slice(0, 2).map((m) => m.picture), ['squat', 'leg-press']);
  assert.ok(!machines.some((m) => m.name === 'Squat' || m.name === 'Leg press'));
  assert.equal(machines.length, 147);
});

test('addTo: a list with a drawing in it, or an empty list, stays as it is', () => {
  const withOne = [legPress, { ...ownMachine, picture: 'squat' }];
  assert.equal(Pictures.addTo(withOne), withOne);
  const none = [];
  assert.equal(Pictures.addTo(none), none);
});

test('missing: a machine of the list is there when a machine has its name, or its drawing under another name', () => {
  const renamed = { id: 'm-1', name: 'Leg press 45°', picture: 'leg-press' };
  const named = { id: 'm-2', name: 'SQUAT' };
  const missing = Pictures.missing([renamed, named]);
  assert.equal(missing.length, 145);
  assert.ok(!missing.some((m) => m.picture === 'leg-press' || m.picture === 'squat'));
  assert.deepEqual(missing[0], { id: 'm-abdominal', name: 'Abdominal', picture: 'crunch' });
});

test('missing: a machine of the list gets a new id when its usual one is taken by another machine', (t) => {
  t.mock.method(Date, 'now', () => 0); // Date.now() in base 36 starts with "m" until about 2029, which would hide a missing prefix
  const missing = Pictures.missing([{ id: 'm-abdominal', name: 'Crunch bench' }]);
  const abdominal = missing.find((m) => m.name === 'Abdominal');
  assert.notEqual(abdominal.id, 'm-abdominal');
  assert.match(abdominal.id, /^m0/);
  assert.equal(missing.find((m) => m.name === 'Leg press').id, 'm-leg-press');
});

/* ---- The name and what it works ---- */

test('nameOf: the name of a drawing in the list; null for none', () => {
  assert.equal(Pictures.nameOf('leg-press'), 'Leg press');
  assert.equal(Pictures.nameOf('pull-up'), 'Pull-up');
  assert.equal(Pictures.nameOf('crunch'), 'Abdominal');
  assert.equal(Pictures.nameOf(undefined), null);
  assert.equal(Pictures.nameOf('burpee'), null);
});

test('aboutOf: what a drawing works, and with what, in plain words; null for none', () => {
  assert.deepEqual(Pictures.aboutOf('leg-press'), { mostly: 'quads', also: 'glutes, hamstrings', with: 'a machine' });
  assert.deepEqual(Pictures.aboutOf('leg-extension'), { mostly: 'quads', also: '', with: 'a machine' });
  assert.deepEqual(Pictures.aboutOf('reverse-pec-deck'), { mostly: 'back of the shoulders', also: 'upper back', with: 'a machine' });
  assert.equal(Pictures.aboutOf('crunch').with, 'a machine'); // the drawing of the Abdominal machine
  assert.equal(Pictures.aboutOf('burpee'), null);
  assert.equal(Pictures.aboutOf(undefined), null);
  assert.equal(Pictures.aboutOf('toString'), null); // only drawings, nothing every object has
});

test('aboutOf: every drawing says what it works mostly and with what, in small letters', () => {
  for (const picture of Pictures.DRAWINGS) {
    const about = Pictures.aboutOf(picture);
    assert.match(about.mostly, /^[a-z][a-z ]+$/, picture);
    assert.match(about.also, /^([a-z][a-z ]+(, [a-z][a-z ]+)*)?$/, picture);
    assert.match(about.with, /^(a |dumbbells|your own weight)/, picture);
  }
});

test('withNewDrawings: a machine without a drawing gets the drawing of its name, when no other machine has it', () => {
  const machines = [
    { id: 'a', name: 'Rotary torso' },
    { id: 'b', name: 'Squat (barbell)' },
    { id: 'c', name: 'Squat', picture: 'squat' },
    { id: 'd', name: 'Pull up' },
    { id: 'e', name: 'Pull-up' },
    { id: 'f', name: 'Ab coaster' },
    { id: 'g', name: 'Leg press', picture: 'leg-press' },
  ];
  const drawn = Pictures.withNewDrawings(machines);
  assert.deepEqual(drawn.map((m) => m.picture), ['rotary-torso', undefined, 'squat', 'pull-up', undefined, undefined, 'leg-press']);
  assert.deepEqual(drawn[0], { id: 'a', name: 'Rotary torso', picture: 'rotary-torso' });
  for (const i of [1, 2, 4, 5, 6]) assert.equal(drawn[i], machines[i]); // left as they are
  assert.equal(machines[0].picture, undefined); // the list given is left alone
});

test('withNewDrawings: a machine keeps the drawing it has, even when its name has another', () => {
  const machines = [{ id: 'a', name: 'Rotary torso', picture: 'crunch' }, { id: 'b', name: 'Abdominal' }];
  assert.deepEqual(Pictures.withNewDrawings(machines).map((m) => m.picture), ['crunch', undefined]);
});

test('named: a machine with a drawing takes its name; one without, or whose name is taken, keeps its own', () => {
  const machines = [
    { id: 'a', name: 'Squat (barbell)', picture: 'squat' },
    { id: 'b', name: 'Seated Leg curl', picture: 'seated-leg-curl' },
    { id: 'c', name: 'Pull up', picture: 'pull-up' },
    { id: 'd', name: 'pull-up', picture: 'pull-up' },
    { id: 'e', name: 'Ab coaster' },
    { id: 'f', name: 'Leg press', picture: 'leg-press' },
  ];
  const named = Pictures.named(machines);
  assert.deepEqual(named.map((m) => m.name), ['Squat', 'Seated leg curl', 'Pull up', 'Pull-up', 'Ab coaster', 'Leg press']);
  assert.deepEqual(named[0], { id: 'a', name: 'Squat', picture: 'squat' });
  assert.equal(named[4], machines[4]);
  assert.equal(named[5], machines[5]); // a machine that has its name already is left as it is
  assert.equal(machines[0].name, 'Squat (barbell)'); // the list given is left alone
});
