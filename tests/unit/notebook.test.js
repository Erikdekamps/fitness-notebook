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

test('hasExamples: true while any demo line is left, even among lines of your own', () => {
  const notebook = new Notebook(Notebook.exampleData());
  notebook.addLine(text('mine', 'my line'));
  assert.equal(notebook.hasExamples(), true);
  notebook.removeExamples();
  assert.equal(notebook.hasExamples(), false);
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

test('addMachine: a new name gets an id of its own, never that of a removed machine with another name', () => {
  const { notebook } = makeNotebook();
  notebook.removeMachine('m-leg'); // its line stays, pointing at a machine that is gone
  const rowing = notebook.addMachine('Rowing');
  assert.ok(rowing.id.startsWith('m'));
  assert.ok(![undefined, 'm-leg', 'm-chest'].includes(rowing.id));
  assert.equal(notebook.machine(rowing.id), rowing);
});

test('addMachine: picks up the most recent history of that name, and pencil lines are no history', () => {
  const line = (id, type, machineId) => ({ id, type, machineId, name: 'Leg press', weight: 80, sets: 3, reps: 12 });
  const notebook = new Notebook({
    version: 1,
    machines: [],
    lines: [line('l1', 'machine', 'm-old'), line('l2', 'machine', 'm-new'), { id: 'p1', type: 'plan', machineId: 'm-pencil', name: 'Leg press' }],
  });
  assert.equal(notebook.addMachine('Leg press').id, 'm-new');
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

test('exampleData: machine ids are "m-" and the name, the ids older notebooks use, listed A to Z', () => {
  const { machines } = Notebook.exampleData();
  for (const m of machines) {
    assert.ok(m.name.length > 0);
    assert.equal(m.id, 'm-' + m.name.toLowerCase().replaceAll(' ', '-'));
  }
  assert.deepEqual(Notebook.sortMachines(machines), machines);
  assert.equal(machines[0].name, 'Abdominal');
  assert.equal(machines.at(-1).name, 'Triceps press');
});

test('exampleData: five example days in date order, each a date, a ride, then machines', () => {
  const { lines } = Notebook.exampleData();
  assert.ok(lines.every((l) => l.example === true && l.id.startsWith('l')));
  assert.ok(lines.every((l) => ['date', 'text', 'machine'].includes(l.type)));
  const dates = lines.filter((l) => l.type === 'date').map((l) => l.date);
  assert.ok(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  assert.deepEqual(dates, [...new Set(dates)].sort());
  assert.ok(dates.at(-1) < '2026-11-23'); // all before "today" in the design pictures
  lines.forEach((l, i) => {
    if (l.type === 'date') {
      assert.equal(lines[i + 1].type, 'text');
      assert.match(lines[i + 1].text, /^Biking Basics New Zealand #\d+$/);
      assert.equal(lines[i + 2].type, 'machine');
    }
  });
  const rides = lines.filter((l) => l.type === 'text').map((l) => l.text);
  assert.equal(new Set(rides).size, 5);
});

test('exampleData: each machine line has the name of the machine it points at', () => {
  const data = Notebook.exampleData();
  const notebook = new Notebook(data);
  for (const l of data.lines.filter((l) => l.type === 'machine')) assert.equal(notebook.machine(l.machineId).name, l.name);
});

test('ready: data saved before plans existed gets an empty list of plans', () => {
  const { notebook } = makeNotebook();
  assert.deepEqual(notebook.plans, []);
  notebook.replaceAll({ version: 1, machines: [], lines: [] });
  assert.deepEqual(notebook.plans, []);
  notebook.reload({ version: 1, machines: [], lines: [] });
  assert.deepEqual(notebook.plans, []);
});

test('ready: plans that are there are kept, on a new notebook, an import and a reload', () => {
  const plans = () => [{ id: 'p1', name: 'Leg day', machineIds: [] }];
  const data = () => ({ version: 1, machines: [], plans: plans(), lines: [] });
  const notebook = new Notebook(data());
  assert.deepEqual(notebook.plans, plans());
  notebook.replaceAll(data());
  assert.deepEqual(notebook.plans, plans());
  notebook.reload(data());
  assert.deepEqual(notebook.plans, plans());
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

test('removePlan: the undo of the first of several plans puts it back first', () => {
  const { notebook, plan } = makePlanned();
  notebook.addPlan('Arms');
  notebook.addPlan('Back');
  const undo = notebook.removePlan(plan.id);
  undo();
  assert.deepEqual(notebook.plans.map((p) => p.name), ['Leg day', 'Arms', 'Back']);
});

test('planMachines: a plan that is gone has no machines', () => {
  const { notebook } = makePlanned();
  assert.deepEqual(notebook.planMachines('nope'), []);
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
  assert.ok(dateLine.id.startsWith('l'));
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
  assert.ok(day.every((l) => l.id.startsWith('l')));
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
  assert.deepEqual(notebook.line(under.id), { id: under.id, ...leg(80, 10) });
  assert.ok(under.id.startsWith('l'));
  assert.deepEqual(notebook.lines.map((l) => l.id), ['d1', 'l1', under.id, notebook.lines.at(-1).id]);
  assert.equal(notebook.lines.at(-1).text, 'last');
  const bottom = notebook.addLineAfter('nope', text('x', 'end'));
  assert.equal(notebook.lines.at(-1), bottom);
  assert.equal(saved.count, 3);
});

/* ---- Moving a line within its day ---- */

/** Two days: d1 with a, b, c under it, and d2 with x under it. */
function makeTwoDays() {
  const saved = { count: 0 };
  const data = {
    version: 1,
    machines: [],
    lines: [date('d1', '2026-11-16'), text('a', 'A'), text('b', 'B'), text('c', 'C'), date('d2', '2026-11-18'), text('x', 'X')],
  };
  return { notebook: new Notebook(data, { onSave: () => { saved.count++; } }), saved };
}
const ids = (notebook) => notebook.lines.map((l) => l.id);

test('moveLine: to a place in its day, 0 is right under the date', () => {
  const { notebook, saved } = makeTwoDays();
  assert.equal(notebook.moveLine('c', 0), true);
  assert.deepEqual(ids(notebook), ['d1', 'c', 'a', 'b', 'd2', 'x']);
  notebook.moveLine('c', 1);
  assert.deepEqual(ids(notebook), ['d1', 'a', 'c', 'b', 'd2', 'x']);
  assert.equal(saved.count, 2);
});

test('moveLine: never leaves its day', () => {
  const { notebook } = makeTwoDays();
  notebook.moveLine('a', 99);
  assert.deepEqual(ids(notebook), ['d1', 'b', 'c', 'a', 'd2', 'x']);
  notebook.moveLine('a', -5);
  assert.deepEqual(ids(notebook), ['d1', 'a', 'b', 'c', 'd2', 'x']);
  notebook.moveLine('x', 0);
  assert.deepEqual(ids(notebook), ['d1', 'a', 'b', 'c', 'd2', 'x']);
});

test('moveLine: the same place saves nothing; a date or a missing line does not move', () => {
  const { notebook, saved } = makeTwoDays();
  assert.equal(notebook.moveLine('b', 1), true);
  assert.equal(saved.count, 0);
  assert.equal(notebook.moveLine('d2', 0), false);
  assert.equal(notebook.moveLine('nope', 0), false);
  assert.deepEqual(ids(notebook), ['d1', 'a', 'b', 'c', 'd2', 'x']);
});

test('moveLine: lines above the first date move among themselves', () => {
  const notebook = new Notebook({ version: 1, machines: [], lines: [text('a', 'A'), text('b', 'B'), date('d1', '2026-11-16'), text('x', 'X')] });
  assert.equal(notebook.moveLine('b', 0), true);
  assert.deepEqual(ids(notebook), ['b', 'a', 'd1', 'x']);
});

test('moveLine: a written line on a plan day goes above the pencil lines', () => {
  const { notebook } = makeNotebook();
  notebook.addPlan('Leg day');
  const plan = notebook.plans[0];
  notebook.addPlanMachine(plan.id, 'm-leg');
  notebook.startDay('2026-11-23', plan.id);
  const bike = notebook.addLine({ type: 'text', text: 'Bike 15 min' });
  notebook.moveLine(bike.id, 0);
  assert.deepEqual(notebook.lines.slice(2).map((l) => l.type), ['date', 'text', 'plan']);
});

test('new ids start with their kind, whatever the clock says: m for a machine, l for a line', (t) => {
  // Date.now() in base 36 starts with "m" until about 2029, which would hide a missing prefix.
  t.mock.method(Date, 'now', () => 0);
  const { notebook } = makeNotebook();
  assert.match(notebook.addMachine('Hip thrust').id, /^m0/);
  assert.match(notebook.addLine({ type: 'text', text: 'Bike' }).id, /^l0/);
});

/* ---- Every change is saved ---- */

/**
 * A notebook that remembers what it saved last, as text, so a change made after a save shows up as a difference.
 * After every change, and after its undo, what was saved must be the notebook as it now is:
 * a change that is not saved is gone after a reload.
 */
function makeWatched() {
  const watched = { saved: null };
  const data = {
    version: 1,
    machines: [{ id: 'm-leg', name: 'Leg press' }, { id: 'm-chest', name: 'Chest press' }],
    plans: [{ id: 'p-legs', name: 'Leg day', machineIds: ['m-leg', 'm-chest'] }],
    lines: [
      { id: 'd0', type: 'date', date: '2026-11-14', example: true },
      { id: 'x0', type: 'text', text: 'Example ride', example: true },
      { id: 'd1', type: 'date', date: '2026-11-16', plan: 'Leg day' },
      { id: 'l1', type: 'machine', machineId: 'm-leg', name: 'Leg press', weight: 80, sets: 3, reps: 12 },
      { id: 't1', type: 'text', text: 'Bike 15 min' },
    ],
  };
  watched.notebook = new Notebook(data, { onSave: (saved) => { watched.saved = JSON.stringify(saved); } });
  return watched;
}

const CHANGES = {
  removeDay: (n) => n.removeDay('d1'),
  addMachine: (n) => n.addMachine('Hip thrust'),
  renameMachine: (n) => n.renameMachine('m-leg', 'Leg press 45'),
  removeMachine: (n) => n.removeMachine('m-chest'),
  addPlan: (n) => n.addPlan('Arms'),
  renamePlan: (n) => n.renamePlan('p-legs', 'Legs'),
  removePlan: (n) => n.removePlan('p-legs'),
  addPlanMachine: (n) => n.addPlanMachine('p-legs', n.addMachine('Hip thrust').id),
  removePlanMachine: (n) => n.removePlanMachine('p-legs', 'm-leg'),
  movePlanMachine: (n) => n.movePlanMachine('p-legs', 'm-chest', 0),
  removeExamples: (n) => n.removeExamples(),
  replaceAll: (n) => n.replaceAll({ version: 1, machines: [], plans: [], lines: [] }),
  moveLine: (n) => n.moveLine('t1', 0),
  addLine: (n) => n.addLine({ type: 'text', text: 'Bike' }),
  removeLine: (n) => n.removeLine('l1'),
};

for (const [name, change] of Object.entries(CHANGES)) {
  test(`${name}: the change is saved, and so is its undo`, () => {
    const watched = makeWatched();
    const { notebook } = watched;
    const before = JSON.stringify(notebook.data);
    watched.saved = null;

    const undo = change(notebook);
    assert.notEqual(JSON.stringify(notebook.data), before, 'the change changed something');
    assert.equal(watched.saved, JSON.stringify(notebook.data), 'saved after the change');

    if (typeof undo === 'function') {
      watched.saved = null;
      undo();
      assert.equal(JSON.stringify(notebook.data), before, 'the undo puts it back');
      assert.equal(watched.saved, before, 'saved after the undo');
    }
  });
}
