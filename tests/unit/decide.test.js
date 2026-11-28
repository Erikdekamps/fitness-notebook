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

test('screenFor: a screen that exists; the notebook when it does not; plans and machines when the plan is gone', () => {
  const views = ['notebook', 'settings', 'plan', 'stats'];
  const hasPlan = (id) => id === 'p1';
  assert.deepEqual(Decide.screenFor({ view: 'stats' }, views, hasPlan), { view: 'stats' });
  assert.deepEqual(Decide.screenFor({ view: 'plan', planId: 'p1' }, views, hasPlan), { view: 'plan', planId: 'p1' });
  assert.deepEqual(Decide.screenFor({ view: 'plan', planId: 'gone' }, views, hasPlan), { view: 'machines' });
  assert.deepEqual(Decide.screenFor({ view: 'nowhere' }, views, hasPlan), { view: 'notebook' });
  assert.deepEqual(Decide.screenFor(null, views, hasPlan), { view: 'notebook' });
  // Only a plan screen asks about a plan.
  assert.deepEqual(Decide.screenFor({ view: 'settings', planId: 'gone' }, views, hasPlan), { view: 'settings', planId: 'gone' });
});

/* ---- More keys ---- */

test('arrowStep: arrow up is one back, arrow down one on', () => {
  assert.equal(Decide.arrowStep('ArrowUp'), -1);
  assert.equal(Decide.arrowStep('ArrowDown'), 1);
  assert.equal(Decide.arrowStep('ArrowLeft'), 0);
});

test('fieldKey: Enter submits, Escape cancels, and nothing while a character is being put together', () => {
  assert.equal(Decide.fieldKey({ key: 'Enter', isComposing: false, keyCode: 13 }), 'submit');
  assert.equal(Decide.fieldKey({ key: 'Escape', isComposing: false, keyCode: 27 }), 'cancel');
  assert.equal(Decide.fieldKey({ key: 'a', isComposing: false, keyCode: 65 }), null);
  assert.equal(Decide.fieldKey({ key: 'Enter', isComposing: true, keyCode: 13 }), null);
  assert.equal(Decide.fieldKey({ key: 'Enter', isComposing: false, keyCode: 229 }), null);
});

test('sheetKey: Escape cancels the panel; Enter acts only on a wheel', () => {
  assert.equal(Decide.sheetKey('Escape', false), 'cancel');
  assert.equal(Decide.sheetKey('Escape', true), 'cancel');
  assert.equal(Decide.sheetKey('Enter', true), 'act');
  assert.equal(Decide.sheetKey('Enter', false), null);
  assert.equal(Decide.sheetKey('a', true), null);
});

/* ---- Swiping a row ---- */

const { OPEN_OFFSET_PX, FULL_SWIPE } = load('config');

test('swipeAxis: nothing in the first 8 px, then sideways is a swipe and the rest a scroll', () => {
  assert.equal(Decide.swipeAxis(5, 5), null);
  assert.equal(Decide.swipeAxis(-7.9, 0), null);
  assert.equal(Decide.swipeAxis(-8, 0), 'x');
  assert.equal(Decide.swipeAxis(0, 8), 'y');
  assert.equal(Decide.swipeAxis(20, -10), 'x');
  assert.equal(Decide.swipeAxis(-12, 10), 'y'); // not clearly sideways: 12 is not more than 1.2 × 10
  assert.equal(Decide.swipeAxis(-12.1, 10), 'x');
  assert.equal(Decide.swipeAxis(10, 10), 'y');
});

test('swipeEnd: far is remove, half the Delete button is open, less goes back', () => {
  const width = 400;
  assert.equal(Decide.swipeEnd(-(width * FULL_SWIPE + 1), width), 'remove');
  assert.equal(Decide.swipeEnd(-(width * FULL_SWIPE), width), 'open'); // exactly on the line: not yet
  assert.equal(Decide.swipeEnd(-(OPEN_OFFSET_PX / 2 + 1), width), 'open');
  assert.equal(Decide.swipeEnd(-(OPEN_OFFSET_PX / 2), width), 'back');
  assert.equal(Decide.swipeEnd(0, width), 'back');
});

/* ---- Dragging a row to another place ---- */

// Three rows of 44 px, then one of 88 px.
const GROUP = { tops: [100, 144, 188, 232], heights: [44, 44, 44, 88] };

test('dragReach: up to the top of the group and down to its bottom', () => {
  assert.deepEqual(Decide.dragReach({ ...GROUP, from: 0 }), [0, 176]);
  assert.deepEqual(Decide.dragReach({ ...GROUP, from: 1 }), [-44, 132]);
  assert.deepEqual(Decide.dragReach({ ...GROUP, from: 3 }), [-132, 0]);
});

test('placeAt: a row takes a place once its middle passes the middle of that place', () => {
  const d = { ...GROUP, from: 1 };
  assert.equal(Decide.placeAt(d, 0), 1);
  assert.equal(Decide.placeAt(d, 43), 1);
  assert.equal(Decide.placeAt(d, 44), 2);
  assert.equal(Decide.placeAt(d, 109), 2);
  assert.equal(Decide.placeAt(d, 110), 3); // the middle of the tall last row
  assert.equal(Decide.placeAt(d, -43), 1);
  assert.equal(Decide.placeAt(d, -44), 0);
  assert.equal(Decide.placeAt({ ...GROUP, from: 0 }, 176), 3);
  assert.equal(Decide.placeAt({ ...GROUP, from: 0 }, 0), 0);
  assert.equal(Decide.placeAt({ ...GROUP, from: 2 }, -44), 1); // right on the middle counts, going up too
  assert.equal(Decide.placeAt({ ...GROUP, from: 2 }, -43), 2);
  assert.equal(Decide.placeByMiddle(d, -44), 0); // the first place can be taken by the middle alone
  assert.equal(Decide.placeAt({ ...GROUP, from: 3 }, 0), 3);
});

test('placeAt: a tall row pushed all the way up is at the top, though its middle never passes the first row', () => {
  const tall = { ...GROUP, from: 3 }; // 88 px high, the others 44
  assert.equal(Decide.placeByMiddle(tall, -132), 1); // by its middle alone it would stop one short
  assert.equal(Decide.placeAt(tall, -132), 0);
  assert.equal(Decide.placeAt(tall, -131), 1);
  // And down: a tall first row among short ones.
  const down = { tops: [100, 188, 232], heights: [88, 44, 44], from: 0 };
  assert.equal(Decide.placeByMiddle(down, 88), 1);
  assert.equal(Decide.placeAt(down, 88), 2);
  assert.equal(Decide.placeAt(down, 87), 1);
});

/* ---- More of the panel to add or change a line ---- */

test('pickableMachines: a machine that was removed stays pickable for its own old line, on top', () => {
  const machines = [{ id: 'chest', name: 'Chest press' }, { id: 'leg', name: 'Leg press' }];
  assert.equal(Decide.pickableMachines(machines, null), machines);
  assert.equal(Decide.pickableMachines(machines, set('a', 'leg')), machines);
  assert.deepEqual(Decide.pickableMachines(machines, { ...set('a', 'gone'), name: 'Old one' }), [{ id: 'gone', name: 'Old one' }, ...machines]);
  assert.equal(machines.length, 2); // the list itself is left alone
});

test('lineText: the text of a text line; the hint says whether there are wheels', () => {
  assert.deepEqual(Decide.lineText(text('t', 'Bike'), true), { value: 'Bike', placeholder: 'or write your own line' });
  assert.deepEqual(Decide.lineText(set('a', 'leg'), true), { value: '', placeholder: 'or write your own line' });
  assert.deepEqual(Decide.lineText(null, false), { value: '', placeholder: 'write a line' });
});

test('machineName: a changed line keeps the name it was written with, for its own machine only', () => {
  const own = { ...set('a', 'leg'), name: 'Leg press (old)' };
  assert.equal(Decide.machineName({ id: 'leg', name: 'Leg press' }, own), 'Leg press (old)');
  assert.equal(Decide.machineName({ id: 'fly', name: 'Fly' }, own), 'Fly');
  assert.equal(Decide.machineName({ id: 'leg', name: 'Leg press' }, null), 'Leg press');
});

test('setLine: a machine line gets the set while it is still the same set', () => {
  const line = set('a', 'leg');
  const mode = { editing: line, editingMachine: line };
  const bottom = set('z', 'leg');
  assert.equal(Decide.setLine(mode, { ...line, id: 'n' }, bottom), line);
  assert.equal(Decide.setLine(mode, { ...line, id: 'n', reps: 10 }, bottom), null);
  assert.equal(Decide.setLine(mode, text('t', 'Bike'), bottom), null);
});

test('setLine: a new line counts up the bottom line; a text or plan line never gets a set', () => {
  const bottom = set('z', 'leg');
  assert.equal(Decide.setLine({ editing: null, editingMachine: null }, set('n', 'leg'), bottom), bottom);
  assert.equal(Decide.setLine({ editing: null, editingMachine: null }, set('n', 'leg'), null), null);
  assert.equal(Decide.setLine({ editing: text('t', 'Bike'), editingMachine: null }, set('n', 'leg'), bottom), null);
  assert.equal(Decide.setLine({ editing: planned('p', 'leg'), editingMachine: null }, set('n', 'leg'), bottom), null);
});

test('writing: one more set on a line, whatever the panel was opened on', () => {
  const mode = { editing: null, logging: false, planLine: null };
  assert.deepEqual(Decide.writing(mode, set('n', 'leg'), set('a', 'leg')), { action: 'addSet', isSet: true });
});

test('writing: nothing to write', () => {
  assert.deepEqual(Decide.writing({ editing: null, logging: false, planLine: null }, null, null), { action: 'none', isSet: false });
});

test('writing: a new line at the bottom is a set or a line of your own', () => {
  const mode = { editing: null, logging: false, planLine: null };
  assert.deepEqual(Decide.writing(mode, set('n', 'leg'), null), { action: 'logSet', isSet: true });
  assert.deepEqual(Decide.writing(mode, text('t', 'Bike'), null), { action: 'addLine', isSet: false });
});

test('writing: while logging, other numbers go right under the line just logged', () => {
  const line = set('a', 'leg');
  const mode = { editing: line, logging: true, planLine: null };
  assert.deepEqual(Decide.writing(mode, set('n', 'leg'), null), { action: 'addAfter', isSet: true });
  assert.deepEqual(Decide.writing(mode, text('t', 'Bike'), null), { action: 'addAfter', isSet: false });
});

test('writing: a changed line is replaced, and only a pencil plan line then counts as a set', () => {
  const line = set('a', 'leg');
  const plan = planned('p', 'leg');
  assert.deepEqual(Decide.writing({ editing: line, logging: false, planLine: null }, set('n', 'leg'), null), { action: 'replace', isSet: false });
  assert.deepEqual(Decide.writing({ editing: plan, logging: false, planLine: plan }, set('n', 'leg'), null), { action: 'replace', isSet: true });
  assert.deepEqual(Decide.writing({ editing: plan, logging: false, planLine: plan }, text('t', 'Bike'), null), { action: 'replace', isSet: false });
});

/* ---- Other panels ---- */

test('sheetTyping: wheels fold away when there are none, or the field has text or the focus', () => {
  const base = { open: true, wheels: 3, fieldShown: true, text: '', focused: false };
  assert.equal(Decide.sheetTyping(base), false);
  assert.equal(Decide.sheetTyping({ ...base, text: 'Bike' }), true);
  assert.equal(Decide.sheetTyping({ ...base, focused: true }), true);
  assert.equal(Decide.sheetTyping({ ...base, wheels: 0 }), true);
  assert.equal(Decide.sheetTyping({ ...base, wheels: 0, fieldShown: false }), true);
  assert.equal(Decide.sheetTyping({ ...base, fieldShown: false, text: 'left over', focused: true }), false);
  assert.equal(Decide.sheetTyping({ ...base, open: false, wheels: 0, text: 'Bike', focused: true }), false);
});

test('firstFocus: the first wheel, unless typing; then the field that shows; else the button', () => {
  const none = { wheels: 0, typing: false, text: false, area: false };
  assert.equal(Decide.firstFocus({ ...none, wheels: 3, text: true }), 'wheel');
  assert.equal(Decide.firstFocus({ ...none, wheels: 3, typing: true, text: true }), 'text');
  assert.equal(Decide.firstFocus({ ...none, text: true, area: true }), 'text');
  assert.equal(Decide.firstFocus({ ...none, area: true }), 'area');
  assert.equal(Decide.firstFocus(none), 'action');
  assert.equal(Decide.firstFocus({ ...none, wheels: 3, typing: true }), 'action');
});

test('rename: nothing or the same name changes nothing; a taken name is refused', () => {
  assert.equal(Decide.rename('', 'Arms', false), 'close');
  assert.equal(Decide.rename('Arms', 'Arms', false), 'close');
  assert.equal(Decide.rename('Arms', 'Arms', true), 'close');
  assert.equal(Decide.rename('Legs', 'Arms', true), 'refuse');
  assert.equal(Decide.rename('Legs', 'Arms', false), 'rename');
});

/* ---- More of the panel to pick a date ---- */

test('years: five years back until now, and wider for a written or shown year', () => {
  assert.deepEqual(Decide.years(2026, 2026, [], 5), [2021, 2022, 2023, 2024, 2025, 2026]);
  assert.equal(Decide.years(2026, 2026, [2019, 2025], 5)[0], 2019);
  assert.equal(Decide.years(2026, 2018, [2019], 5)[0], 2018);
  assert.equal(Decide.years(2026, 2027, [], 5).at(-1), 2027);
  assert.equal(Decide.years(2026, 2020, [], 5).at(-1), 2026);
});

test('validDate: no 31 November, and nothing after today', () => {
  assert.equal(Decide.validDate(2026, 11, 20, '2026-11-23'), '2026-11-20');
  assert.equal(Decide.validDate(2026, 11, 31, '2026-12-31'), '2026-11-30');
  assert.equal(Decide.validDate(2026, 2, 30, '2026-11-23'), '2026-02-28');
  assert.equal(Decide.validDate(2026, 11, 23, '2026-11-23'), '2026-11-23');
  assert.equal(Decide.validDate(2026, 11, 24, '2026-11-23'), '2026-11-23');
  assert.equal(Decide.validDate(2026, 12, 1, '2026-11-23'), '2026-11-23');
});

/* ---- Back ---- */

test('tabOf: the four tabs are screens of their own; a plan or one machine is below one, without tabs', () => {
  assert.deepEqual(['notebook', 'machines', 'stats', 'settings'].map(Decide.tabOf), ['notebook', 'machines', 'stats', 'settings']);
  assert.equal(Decide.tabOf('plan'), null);
  assert.equal(Decide.tabOf('machineStats'), null);
  assert.equal(Decide.tabOf('toString'), null);
});

test('restTimeStep: one notch shorter or longer, never past 0:15 or 10:00', () => {
  assert.equal(Decide.restTimeStep(90, 1), 105);
  assert.equal(Decide.restTimeStep(90, -1), 75);
  assert.equal(Decide.restTimeStep(15, -1), 15);
  assert.equal(Decide.restTimeStep(600, 1), 600);
  assert.equal(Decide.restTimeStep(585, 1), 600);
  assert.equal(Decide.restTimeStep(30, -1), 15);
});

test('canGoBack: only on a screen that was opened from another one', () => {
  assert.equal(Decide.canGoBack({ view: 'settings' }, 'settings'), true);
  assert.equal(Decide.canGoBack({ view: 'settings' }, 'plan'), false);
  assert.equal(Decide.canGoBack(null, 'settings'), false);
  assert.equal(Decide.canGoBack({ view: 'notebook' }, 'notebook'), false);
});
