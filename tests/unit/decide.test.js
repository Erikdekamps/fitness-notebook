import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { Decide } = load('decide');

const date = (id, iso, plan) => (plan ? { id, type: 'date', date: iso, plan } : { id, type: 'date', date: iso });
const set = (id, machineId, more = {}) => ({ id, type: 'machine', machineId, name: machineId, weight: 20, reps: 12, sets: 3, ...more });
const planned = (id, machineId) => ({ id, type: 'plan', machineId, name: machineId });
const text = (id, words) => ({ id, type: 'text', text: words });

/* ---- Keys ---- */

test('rowKey: Enter and space tap a row, Delete and Backspace remove it, other keys do nothing', () => {
  assert.equal(Decide.rowKey('Enter'), 'tap');
  assert.equal(Decide.rowKey(' '), 'tap');
  assert.equal(Decide.rowKey('Delete'), 'remove');
  assert.equal(Decide.rowKey('Backspace'), 'remove');
  assert.equal(Decide.rowKey('a'), null);
  assert.equal(Decide.rowKey('ArrowUp'), null);
});

test('moveStep: only Alt with arrow up or down moves a row', () => {
  assert.equal(Decide.moveStep('ArrowUp', true), -1);
  assert.equal(Decide.moveStep('ArrowDown', true), 1);
  assert.equal(Decide.moveStep('ArrowUp', false), 0);
  assert.equal(Decide.moveStep('ArrowDown', false), 0);
  assert.equal(Decide.moveStep('Enter', true), 0);
});

test('wheelTarget: arrows one item, page keys five, Home and End the ends, never past them', () => {
  assert.equal(Decide.wheelTarget('ArrowDown', 3, 10), 4);
  assert.equal(Decide.wheelTarget('ArrowUp', 3, 10), 2);
  assert.equal(Decide.wheelTarget('PageDown', 3, 10), 8);
  assert.equal(Decide.wheelTarget('PageUp', 7, 10), 2);
  assert.equal(Decide.wheelTarget('ArrowUp', 0, 10), 0);
  assert.equal(Decide.wheelTarget('PageUp', 3, 10), 0);
  assert.equal(Decide.wheelTarget('ArrowDown', 9, 10), 9);
  assert.equal(Decide.wheelTarget('PageDown', 7, 10), 9);
  assert.equal(Decide.wheelTarget('Home', 7, 10), 0);
  assert.equal(Decide.wheelTarget('End', 2, 10), 9);
  assert.equal(Decide.wheelTarget('Enter', 2, 10), null);
  assert.equal(Decide.wheelTarget('a', 2, 10), null);
});

/* ---- Dragging a row ---- */

test('shiftFor: the rows between where a row came from and where it hangs step aside, the rest stay', () => {
  // Row 1 dragged down to place 3: rows 2 and 3 move up.
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => Decide.shiftFor(i, 1, 3, 44)), [0, 0, -44, -44, 0]);
  // Row 3 dragged up to place 1: rows 1 and 2 move down.
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => Decide.shiftFor(i, 3, 1, 44)), [0, 44, 44, 0, 0]);
  // Not moved: nothing steps aside.
  assert.deepEqual([0, 1, 2].map((i) => Decide.shiftFor(i, 1, 1, 44)), [0, 0, 0]);
});

/* ---- The panel to add or change a line ---- */

test('ofType: the line when it is of that type', () => {
  const line = set('a', 'leg');
  assert.equal(Decide.ofType(line, 'machine'), line);
  assert.equal(Decide.ofType(line, 'plan'), null);
  assert.equal(Decide.ofType(null, 'machine'), null);
  assert.equal(Decide.ofType(undefined, 'machine'), null);
});

test('lineMode: a new line is nothing special', () => {
  assert.deepEqual(Decide.lineMode(null, false), { planLine: null, editingMachine: null, logging: false, fixing: false, fixingMachine: null });
  assert.deepEqual(Decide.lineMode(null, true), { planLine: null, editingMachine: null, logging: false, fixing: false, fixingMachine: null });
});

test('lineMode: a machine line is being changed, unless the panel goes on logging on it', () => {
  const line = set('a', 'leg');
  assert.deepEqual(Decide.lineMode(line, false), { planLine: null, editingMachine: line, logging: false, fixing: true, fixingMachine: line });
  assert.deepEqual(Decide.lineMode(line, true), { planLine: null, editingMachine: line, logging: true, fixing: false, fixingMachine: null });
});

test('lineMode: a pencil plan line is logged, not changed; a text line is changed and never logged on', () => {
  const plan = planned('p', 'leg');
  assert.deepEqual(Decide.lineMode(plan, false), { planLine: plan, editingMachine: null, logging: false, fixing: false, fixingMachine: null });
  assert.deepEqual(Decide.lineMode(plan, true), { planLine: plan, editingMachine: null, logging: false, fixing: false, fixingMachine: null });
  const words = text('t', 'Bike');
  assert.deepEqual(Decide.lineMode(words, false), { planLine: null, editingMachine: null, logging: false, fixing: true, fixingMachine: null });
  assert.deepEqual(Decide.lineMode(words, true), { planLine: null, editingMachine: null, logging: false, fixing: true, fixingMachine: null });
});

test('actionLabel: the set that comes, Save for a change, Log for a text line', () => {
  const next = set('n', 'leg');
  assert.equal(Decide.actionLabel(next, set('a', 'leg', { sets: 2 }), false), 'Log set 3');
  assert.equal(Decide.actionLabel(next, set('a', 'leg', { sets: 2 }), true), 'Log set 3');
  assert.equal(Decide.actionLabel(next, null, true), 'Save');
  assert.equal(Decide.actionLabel(text('t', 'Bike'), null, true), 'Save');
  assert.equal(Decide.actionLabel(next, null, false), 'Log set 1');
  assert.equal(Decide.actionLabel(text('t', 'Bike'), null, false), 'Log');
  assert.equal(Decide.actionLabel(null, null, false), 'Log');
});

const MACHINES = [{ id: 'chest' }, { id: 'fly' }, { id: 'leg' }];

test('startMachineIndex: the machine of the line the panel was opened on', () => {
  const lines = [date('d', '2026-11-23'), set('a', 'chest')];
  assert.equal(Decide.startMachineIndex(MACHINES, lines, set('x', 'leg')), 2);
  assert.equal(Decide.startMachineIndex(MACHINES, lines, planned('p', 'fly')), 1);
  assert.equal(Decide.startMachineIndex(MACHINES, lines, set('x', 'gone')), -1);
});

test('startMachineIndex: else the machine on the bottom line, for the next set', () => {
  assert.equal(Decide.startMachineIndex(MACHINES, [date('d', '2026-11-23'), set('a', 'chest'), set('b', 'fly')], null), 1);
});

test('startMachineIndex: else the first machine not done yet today', () => {
  const today = [date('d', '2026-11-23'), set('a', 'chest'), text('t', 'Bike')];
  assert.equal(Decide.startMachineIndex(MACHINES, today, null), 1);
  assert.equal(Decide.startMachineIndex(MACHINES, [date('d', '2026-11-23')], null), 0);
  // All done: back to the first.
  const all = [date('d', '2026-11-23'), set('a', 'chest'), set('b', 'fly'), set('c', 'leg'), text('t', 'Bike')];
  assert.equal(Decide.startMachineIndex(MACHINES, all, null), 0);
  assert.equal(Decide.startMachineIndex(MACHINES, [], null), 0);
});

test('bottomMachineIndex: only a set of your own on the bottom line counts', () => {
  assert.equal(Decide.bottomMachineIndex(MACHINES, [set('a', 'leg')]), 2);
  assert.equal(Decide.bottomMachineIndex(MACHINES, [set('a', 'leg', { example: true })]), -1);
  assert.equal(Decide.bottomMachineIndex(MACHINES, [set('a', 'leg'), text('t', 'Bike')]), -1);
  assert.equal(Decide.bottomMachineIndex(MACHINES, [planned('p', 'leg')]), -1);
  assert.equal(Decide.bottomMachineIndex(MACHINES, [set('a', 'gone')]), -1);
  assert.equal(Decide.bottomMachineIndex(MACHINES, []), -1);
});

test('goesOn: the panel comes back while logging, after a plan line, or while the day has pencil lines left', () => {
  const plain = [date('d', '2026-11-23'), set('a', 'leg')];
  const withPlan = [date('d', '2026-11-23', 'Legs'), set('a', 'leg'), planned('p', 'fly')];
  const off = { logging: false, planLine: null };
  assert.equal(Decide.goesOn(off, plain, 'a'), false);
  assert.equal(Decide.goesOn({ logging: true, planLine: null }, plain, 'a'), true);
  assert.equal(Decide.goesOn({ logging: false, planLine: planned('p', 'leg') }, plain, 'a'), true);
  assert.equal(Decide.goesOn(off, withPlan, 'a'), true);
});

/* ---- The panel to pick a date ---- */

test('dateActionLabel: Save for a changed date, the plan to start, else Log', () => {
  assert.equal(Decide.dateActionLabel(date('d', '2026-11-23'), null), 'Save');
  assert.equal(Decide.dateActionLabel(date('d', '2026-11-23'), { name: 'Legs' }), 'Save');
  assert.equal(Decide.dateActionLabel(null, { name: 'Legs' }), 'Start Legs');
  assert.equal(Decide.dateActionLabel(null, null), 'Log');
});

test('writtenPlan: a changed date keeps its own plan; a new date gets the picked one', () => {
  assert.equal(Decide.writtenPlan(date('d', '2026-11-23', 'Arms'), { name: 'Legs' }), 'Arms');
  assert.equal(Decide.writtenPlan(date('d', '2026-11-23'), { name: 'Legs' }), undefined);
  assert.equal(Decide.writtenPlan(null, { name: 'Legs' }), 'Legs');
  assert.equal(Decide.writtenPlan(null, null), null);
});

/* ---- Removing a line ---- */

test('removal: the date of a plan day takes the whole day; the message says what went', () => {
  assert.deepEqual(Decide.removal(date('d', '2026-11-23', 'Legs')), { wholeDay: true, message: 'Day removed' });
  assert.deepEqual(Decide.removal(date('d', '2026-11-23')), { wholeDay: false, message: 'Date removed' });
  assert.deepEqual(Decide.removal(set('a', 'leg')), { wholeDay: false, message: 'Line removed' });
  assert.deepEqual(Decide.removal({ ...text('t', 'Bike'), plan: 'Legs' }), { wholeDay: false, message: 'Line removed' });
  assert.deepEqual(Decide.removal(null), { wholeDay: false, message: 'Line removed' });
});

/* ---- Screens ---- */

test('screenFor: a screen that exists; the notebook when it does not; settings when the plan is gone', () => {
  const views = ['notebook', 'settings', 'plan', 'stats'];
  const hasPlan = (id) => id === 'p1';
  assert.deepEqual(Decide.screenFor({ view: 'stats' }, views, hasPlan), { view: 'stats' });
  assert.deepEqual(Decide.screenFor({ view: 'plan', planId: 'p1' }, views, hasPlan), { view: 'plan', planId: 'p1' });
  assert.deepEqual(Decide.screenFor({ view: 'plan', planId: 'gone' }, views, hasPlan), { view: 'settings' });
  assert.deepEqual(Decide.screenFor({ view: 'nowhere' }, views, hasPlan), { view: 'notebook' });
  assert.deepEqual(Decide.screenFor(null, views, hasPlan), { view: 'notebook' });
  // Only a plan screen asks about a plan.
  assert.deepEqual(Decide.screenFor({ view: 'settings', planId: 'gone' }, views, hasPlan), { view: 'settings', planId: 'gone' });
});
