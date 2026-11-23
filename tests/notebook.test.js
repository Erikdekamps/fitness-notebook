import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { Notebook } = load('notebook');

const date = (id, iso) => ({ id, type: 'date', date: iso });
const text = (id, words) => ({ id, type: 'text', text: words });

/** A small notebook, plus a count of how often it saved. */
function makeNotebook() {
  const saved = { count: 0 };
  const data = {
    version: 1,
    machines: [{ id: 'm-leg', name: 'Leg press' }, { id: 'm-chest', name: 'Chest press' }],
    lines: [date('d1', '2026-11-16'), { id: 'l1', type: 'machine', machineId: 'm-leg', name: 'Leg press', weight: 80, sets: 3, reps: 12 }],
  };
  const notebook = new Notebook(data, { onSave: () => { saved.count++; } });
  return { notebook, saved };
}

/* ---- Lines ---- */

test('addLine: writes at the bottom with a new id, and saves', () => {
  const { notebook, saved } = makeNotebook();
  const line = notebook.addLine({ type: 'text', text: 'Biking' });
  assert.equal(notebook.lines.at(-1), line);
  assert.ok(line.id.startsWith('l'));
  assert.equal(saved.count, 1);
});

const leg = (weight, reps) => ({ type: 'machine', machineId: 'm-leg', name: 'Leg press', weight, reps });

test('logSet: the same machine, kg and reps as the bottom line counts one more set on it', () => {
  const { notebook, saved } = makeNotebook();
  const line = notebook.logSet(leg(80, 12));
  assert.equal(line.id, 'l1');
  assert.equal(line.sets, 4);
  assert.equal(notebook.lines.length, 2);
  assert.equal(saved.count, 1);
});

test('logSet: other reps, kg or machine start a new line with 1 set', () => {
  const { notebook } = makeNotebook();
  const fewer = notebook.logSet(leg(80, 10));
  assert.notEqual(fewer.id, 'l1');
  assert.equal(fewer.sets, 1);
  assert.equal(notebook.logSet(leg(80, 10)).sets, 2); // now the bottom line, so it counts on
  assert.equal(notebook.logSet(leg(85, 10)).sets, 1);
  assert.equal(notebook.logSet({ ...leg(85, 10), machineId: 'm-chest', name: 'Chest press' }).sets, 1);
  assert.equal(notebook.lines.length, 5);
});

test('logSet: only the bottom line counts, and never an example line', () => {
  const { notebook } = makeNotebook();
  notebook.addLine({ type: 'text', text: 'Biking' });
  assert.equal(notebook.logSet(leg(80, 12)).sets, 1);
  notebook.lines.at(-1).example = true;
  assert.equal(notebook.logSet(leg(80, 12)).sets, 1);
  assert.equal(notebook.setLineFor({ type: 'text', text: 'x' }), null);
});

test('addSet: one more set on any machine line; a demo line becomes yours', () => {
  const { notebook } = makeNotebook();
  notebook.addLine({ type: 'text', text: 'Biking' });
  assert.equal(notebook.addSet('l1').sets, 4); // not the bottom line: still fine
  assert.equal(notebook.lines[1].id, 'l1');
  notebook.lines[1].example = true;
  assert.ok(!('example' in notebook.addSet('l1')));
  assert.equal(notebook.addSet('d1'), null);
  assert.equal(notebook.addSet('nope'), null);
});

test('replaceLine: same id and place, new contents', () => {
  const { notebook, saved } = makeNotebook();
  assert.equal(notebook.replaceLine('d1', { type: 'date', date: '2026-11-17' }), true);
  assert.deepEqual(notebook.lines[0], { id: 'd1', type: 'date', date: '2026-11-17' });
  assert.equal(notebook.replaceLine('nope', { type: 'text', text: 'x' }), false);
  assert.equal(saved.count, 1);
});

test('replaceLine: drops the example mark, so a changed demo line becomes yours', () => {
  const notebook = new Notebook({ version: 1, machines: [], lines: [{ ...text('t', 'demo'), example: true }] });
  notebook.replaceLine('t', { type: 'text', text: 'mine now' });
  assert.equal(notebook.hasExamples(), false);
});

test('removeLine: removes, and its undo puts the line back in its place', () => {
  const { notebook, saved } = makeNotebook();
  const undo = notebook.removeLine('d1');
  assert.deepEqual(notebook.lines.map((l) => l.id), ['l1']);
  undo();
  assert.deepEqual(notebook.lines.map((l) => l.id), ['d1', 'l1']);
  assert.equal(saved.count, 2);
  assert.equal(notebook.removeLine('nope'), null);
});

test('line and machine: find by id, null when missing', () => {
  const { notebook } = makeNotebook();
  assert.equal(notebook.line('l1').weight, 80);
  assert.equal(notebook.line('nope'), null);
  assert.equal(notebook.machine('m-chest').name, 'Chest press');
  assert.equal(notebook.machine('nope'), null);
});

/* ---- Machines ---- */

test('machinesAZ: alphabetical, ignoring case, without changing the list', () => {
  const { notebook } = makeNotebook();
  notebook.addMachine('abductor');
  assert.deepEqual(notebook.machinesAZ().map((m) => m.name), ['abductor', 'Chest press', 'Leg press']);
  assert.equal(notebook.machines[0].name, 'Leg press');
});

test('nameTaken: upper and lower case do not count, and a machine may keep its own name', () => {
  const { notebook } = makeNotebook();
  assert.equal(notebook.nameTaken('leg PRESS'), true);
  assert.equal(notebook.nameTaken('Leg press', 'm-leg'), false);
  assert.equal(notebook.nameTaken('Rowing'), false);
});

test('addMachine: cleans the name; re-adding a removed machine picks its history back up', () => {
  const { notebook } = makeNotebook();
  assert.equal(notebook.addMachine('  Hip   thrust ').name, 'Hip thrust');
  notebook.removeMachine('m-leg');
  assert.equal(notebook.addMachine('leg press').id, 'm-leg');
});

test('renameMachine: old lines keep the name they were written with', () => {
  const { notebook } = makeNotebook();
  assert.equal(notebook.renameMachine('m-leg', ' Leg press  (blue) '), true);
  assert.equal(notebook.machine('m-leg').name, 'Leg press (blue)');
  assert.equal(notebook.line('l1').name, 'Leg press');
  assert.equal(notebook.renameMachine('nope', 'x'), false);
});

test('removeMachine: old lines stay, and the undo puts the machine back in its place', () => {
  const { notebook } = makeNotebook();
  const undo = notebook.removeMachine('m-leg');
  assert.deepEqual(notebook.machines.map((m) => m.id), ['m-chest']);
  assert.equal(notebook.lines.length, 2);
  undo();
  assert.deepEqual(notebook.machines.map((m) => m.id), ['m-leg', 'm-chest']);
  assert.equal(notebook.removeMachine('nope'), null);
});

/* ---- The whole notebook ---- */

test('removeExamples: removes the demo lines, and the undo brings them back', () => {
  const notebook = new Notebook(Notebook.exampleData());
  assert.equal(notebook.hasExamples(), true);
  const undo = notebook.removeExamples();
  assert.equal(notebook.lines.length, 0);
  undo();
  assert.equal(notebook.lines.length, 25);
});

test('replaceAll: takes the new data, and the undo brings the old data back', () => {
  const { notebook } = makeNotebook();
  const before = notebook.data;
  const undo = notebook.replaceAll({ version: 1, machines: [], lines: [] });
  assert.equal(notebook.lines.length, 0);
  undo();
  assert.equal(notebook.data, before);
});

test('reload: takes data from another tab without saving it again', () => {
  const { notebook, saved } = makeNotebook();
  notebook.reload({ version: 1, machines: [], lines: [] });
  assert.equal(notebook.lines.length, 0);
  assert.equal(saved.count, 0);
});

/* ---- Helpers that need no notebook ---- */

test('withoutExamples: removes demo lines but keeps a demo date that has your own lines under it', () => {
  const lines = [
    { ...date('d1', '2026-11-14'), example: true }, { ...text('t1', 'demo'), example: true },
    { ...date('d2', '2026-11-16'), example: true }, { ...text('t2', 'demo'), example: true }, text('mine', 'my line'),
    date('d3', '2026-11-18'), text('mine2', 'another'),
  ];
  const kept = Notebook.withoutExamples(lines);
  assert.deepEqual(kept.map((l) => l.id), ['d2', 'mine', 'd3', 'mine2']);
  assert.ok(!kept[0].example);
});

test('exampleData: five days, every machine line points at a machine, every id is unique', () => {
  const data = Notebook.exampleData();
  assert.equal(data.lines.filter((l) => l.type === 'date').length, 5);
  const ids = new Set(data.machines.map((m) => m.id));
  assert.ok(data.lines.filter((l) => l.type === 'machine').every((l) => ids.has(l.machineId)));
  assert.equal(new Set(data.lines.map((l) => l.id)).size, data.lines.length);
});

test('exampleData: twelve machines, each with its own id and name, and no plans', () => {
  const data = Notebook.exampleData();
  assert.equal(data.machines.length, 12);
  assert.equal(new Set(data.machines.map((m) => m.id)).size, 12);
  assert.equal(new Set(data.machines.map((m) => m.name.toLowerCase())).size, 12);
  assert.ok(data.machines.some((m) => m.id === 'm-leg-press' && m.name === 'Leg press')); // the ids older notebooks use
  assert.deepEqual(data.plans, []);
});

test('ready: data saved before plans existed gets an empty list of plans', () => {
  const { notebook } = makeNotebook();
  assert.deepEqual(notebook.plans, []);
  notebook.replaceAll({ version: 1, machines: [], lines: [] });
  assert.deepEqual(notebook.plans, []);
  notebook.reload({ version: 1, machines: [], lines: [] });
  assert.deepEqual(notebook.plans, []);
});

/* ---- Plans ---- */

/** The small notebook with a third machine and a plan "Leg day": Leg press, then Chest press. */
function makePlanned() {
  const made = makeNotebook();
  const { notebook } = made;
  notebook.machines.push({ id: 'm-row', name: 'Seated row' });
  const plan = notebook.addPlan('  Leg   day ');
  notebook.addPlanMachine(plan.id, 'm-leg');
  notebook.addPlanMachine(plan.id, 'm-chest');
  made.saved.count = 0;
  return { ...made, plan };
}

const planIds = (notebook, plan) => notebook.planMachines(plan.id).map((m) => m.id);

test('addPlan: a clean name, no machines yet, and it saves', () => {
  const { notebook, saved } = makeNotebook();
  const plan = notebook.addPlan('  Upper   body ');
  assert.equal(plan.name, 'Upper body');
  assert.deepEqual(plan.machineIds, []);
  assert.ok(plan.id.startsWith('p'));
  assert.equal(notebook.plan(plan.id), plan);
  assert.equal(notebook.plan('nope'), null);
  assert.equal(saved.count, 1);
});

test('plansAZ and planNameTaken: alphabetical; upper and lower case do not count', () => {
  const { notebook, plan } = makePlanned();
  notebook.addPlan('arms');
  assert.deepEqual(notebook.plansAZ().map((p) => p.name), ['arms', 'Leg day']);
  assert.equal(notebook.planNameTaken('LEG day'), true);
  assert.equal(notebook.planNameTaken('Leg day', plan.id), false);
  assert.equal(notebook.planNameTaken('Back'), false);
});

test('renamePlan and removePlan: the undo puts the plan back in its place', () => {
  const { notebook, plan } = makePlanned();
  assert.equal(notebook.renamePlan(plan.id, ' Legs '), true);
  assert.equal(notebook.plan(plan.id).name, 'Legs');
  assert.equal(notebook.renamePlan('nope', 'x'), false);
  const undo = notebook.removePlan(plan.id);
  assert.deepEqual(notebook.plans, []);
  undo();
  assert.equal(notebook.plans[0], plan);
  assert.equal(notebook.removePlan('nope'), null);
});

test('addPlanMachine: at the end, each machine once, and only machines that exist', () => {
  const { notebook, plan, saved } = makePlanned();
  assert.equal(notebook.addPlanMachine(plan.id, 'm-row'), true);
  assert.deepEqual(planIds(notebook, plan), ['m-leg', 'm-chest', 'm-row']);
  assert.equal(notebook.addPlanMachine(plan.id, 'm-row'), false);
  assert.equal(notebook.addPlanMachine(plan.id, 'nope'), false);
  assert.equal(notebook.addPlanMachine('nope', 'm-row'), false);
  assert.equal(saved.count, 1);
});

test('machinesNotInPlan: what you can still add, A to Z', () => {
  const { notebook, plan } = makePlanned();
  assert.deepEqual(notebook.machinesNotInPlan(plan.id).map((m) => m.id), ['m-row']);
  assert.deepEqual(notebook.machinesNotInPlan('nope').map((m) => m.name), ['Chest press', 'Leg press', 'Seated row']);
});

test('removePlanMachine: takes it out, and the undo puts it back in its place', () => {
  const { notebook, plan } = makePlanned();
  const undo = notebook.removePlanMachine(plan.id, 'm-leg');
  assert.deepEqual(planIds(notebook, plan), ['m-chest']);
  undo();
  assert.deepEqual(planIds(notebook, plan), ['m-leg', 'm-chest']);
  assert.equal(notebook.removePlanMachine(plan.id, 'm-row'), null);
});

test('movePlanMachine: to a place in the order, never past the ends', () => {
  const { notebook, plan } = makePlanned();
  notebook.addPlanMachine(plan.id, 'm-row');
  assert.equal(notebook.movePlanMachine(plan.id, 'm-row', 0), true);
  assert.deepEqual(planIds(notebook, plan), ['m-row', 'm-leg', 'm-chest']);
  notebook.movePlanMachine(plan.id, 'm-row', 1);
  assert.deepEqual(planIds(notebook, plan), ['m-leg', 'm-row', 'm-chest']);
  notebook.movePlanMachine(plan.id, 'm-leg', 99);
  assert.deepEqual(planIds(notebook, plan), ['m-row', 'm-chest', 'm-leg']);
  notebook.movePlanMachine(plan.id, 'm-leg', -5);
  assert.deepEqual(planIds(notebook, plan), ['m-leg', 'm-row', 'm-chest']);
  assert.equal(notebook.movePlanMachine(plan.id, 'nope', 0), false);
  assert.equal(notebook.movePlanMachine('nope', 'm-leg', 0), false);
});

test('a machine removed in settings drops out of the plan, and comes back with the machine', () => {
  const { notebook, plan } = makePlanned();
  const undo = notebook.removeMachine('m-leg');
  assert.deepEqual(planIds(notebook, plan), ['m-chest']);
  notebook.movePlanMachine(plan.id, 'm-chest', 0); // moving what is left does not lose the hidden one
  undo();
  assert.deepEqual(planIds(notebook, plan).sort(), ['m-chest', 'm-leg']);
});

test('startDay: without a plan it writes only the date', () => {
  const { notebook, saved } = makePlanned();
  const { dateLine, planLines } = notebook.startDay('2026-11-23');
  assert.deepEqual(planLines, []);
  assert.equal(notebook.lines.at(-1), dateLine);
  assert.deepEqual({ type: dateLine.type, date: dateLine.date }, { type: 'date', date: '2026-11-23' });
  assert.ok(!('plan' in dateLine));
  assert.equal(notebook.lines.length, 3);
  assert.equal(saved.count, 1);
});

test('startDay: with a plan it writes the date with the name after it, and a pencil line per machine: names only', () => {
  const { notebook, plan, saved } = makePlanned();
  const { dateLine, planLines } = notebook.startDay('2026-11-23', plan.id);
  const day = notebook.lines.slice(2);
  assert.deepEqual(day.map((l) => l.type), ['date', 'plan', 'plan']);
  assert.equal(day[0], dateLine);
  assert.equal(dateLine.plan, 'Leg day');
  assert.deepEqual(planLines, day.slice(1));
  assert.deepEqual(planLines.map(({ machineId, name }) => ({ machineId, name })), [
    { machineId: 'm-leg', name: 'Leg press' }, { machineId: 'm-chest', name: 'Chest press' },
  ]);
  assert.ok(planLines.every((l) => !('weight' in l) && !('sets' in l) && !('reps' in l)));
  assert.equal(new Set(notebook.lines.map((l) => l.id)).size, notebook.lines.length);
  assert.equal(saved.count, 1);
});

test('startDay: leaves out machines that are gone; a plan that is gone is no plan', () => {
  const { notebook, plan } = makePlanned();
  notebook.removeMachine('m-leg');
  assert.deepEqual(notebook.startDay('2026-11-23', plan.id).planLines.map((l) => l.machineId), ['m-chest']);
  assert.deepEqual(notebook.startDay('2026-11-24', 'nope').planLines, []);
});

test('startDay: pencil lines never logged on an earlier day are thrown away', () => {
  const { notebook, plan } = makePlanned();
  const first = notebook.startDay('2026-11-22', plan.id);
  notebook.replaceLine(first.planLines[0].id, { type: 'machine', machineId: 'm-leg', name: 'Leg press', weight: 80, sets: 1, reps: 12 });
  notebook.startDay('2026-11-23', plan.id);
  assert.deepEqual(notebook.lines.map((l) => l.type), ['date', 'machine', 'date', 'machine', 'date', 'plan', 'plan']);
});

test('removeDay: the date and every line under it up to the next date; the undo puts them all back', () => {
  const { notebook, plan, saved } = makePlanned();
  const { dateLine } = notebook.startDay('2026-11-22', plan.id);
  notebook.addLine(text('t1', 'extra'));
  notebook.startDay('2026-11-23');
  notebook.addLine(text('t2', 'next day'));
  const before = notebook.lines.map((l) => l.id);
  saved.count = 0;
  const undo = notebook.removeDay(dateLine.id);
  assert.deepEqual(notebook.lines.map((l) => l.type), ['date', 'machine', 'date', 'text']);
  assert.equal(notebook.lines.at(-1).text, 'next day');
  assert.equal(saved.count, 1);
  undo();
  assert.deepEqual(notebook.lines.map((l) => l.id), before);
  assert.equal(notebook.removeDay('l1'), null); // not a date
  assert.equal(notebook.removeDay('nope'), null);
  assert.equal(notebook.removeDay(notebook.lines.at(-2).id) !== null, true); // the last day runs to the bottom
  assert.equal(notebook.lines.at(-1).text, 'extra');
});

test('addLineAfter: right under a line; at the bottom when that line is gone', () => {
  const { notebook, saved } = makeNotebook();
  notebook.addLine(text('t1', 'last'));
  const under = notebook.addLineAfter('l1', leg(80, 10));
  assert.deepEqual(notebook.lines.map((l) => l.id), ['d1', 'l1', under.id, notebook.lines.at(-1).id]);
  assert.equal(notebook.lines.at(-1).text, 'last');
  const bottom = notebook.addLineAfter('nope', text('x', 'end'));
  assert.equal(notebook.lines.at(-1), bottom);
  assert.equal(saved.count, 3);
});
