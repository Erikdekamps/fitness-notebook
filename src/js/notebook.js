/**
 * The notebook's rules. Pure functions: they take lines and return answers,
 * and never touch the page or storage.
 *
 * Data shape
 *   machines: [{ id, name }]
 *   lines:    [{ id, type: 'date', date }      date = "YYYY-MM-DD"
 *              { id, type: 'text', text }
 *              { id, type: 'machine', machineId, name, weight, sets, reps }]
 * Lines stay in the order they were written. `example: true` marks demo lines.
 */
import { KG_STEP, KG_MAX } from './config.js';
import { round2, newId } from './util.js';

/**
 * The lines grouped per day and put in date order (lines written before any date come first).
 * Days with the same date keep the order they were written in.
 */
export function linesInDateOrder(lines) {
  const undated = [];
  const days = [];
  lines.forEach((line, order) => {
    if (line.type === 'date') days.push({ date: line.date, order, lines: [] });
    else if (days.length) days[days.length - 1].lines.push(line);
    else undated.push(line);
  });
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order));
  return undated.concat(...days.map((day) => day.lines));
}

/** How a weight compares with last time: 'up', 'down', or how many times in a row it stayed the same. */
export function markFor(weight, previous) {
  if (!previous) return { mark: null, repeats: 0 };
  if (weight > previous.weight) return { mark: 'up', repeats: 0 };
  if (weight < previous.weight) return { mark: 'down', repeats: 0 };
  const repeats = previous.repeats + 1;
  return { mark: repeats, repeats };
}

/**
 * Compares every machine line with the previous time on that machine, in date order.
 *   marks:  line id → 'up' (heavier), 'down' (lighter), a number (same weight, times in a row) or null (first time)
 *   latest: machine id → { weight, sets, reps, repeats } of the most recent time
 */
export function analyzeLines(lines) {
  const marks = new Map();
  const latest = new Map();
  for (const line of linesInDateOrder(lines)) {
    if (line.type !== 'machine') continue;
    const { mark, repeats } = markFor(line.weight, latest.get(line.machineId));
    latest.set(line.machineId, { weight: line.weight, sets: line.sets, reps: line.reps, repeats });
    marks.set(line.id, mark);
  }
  return { marks, latest };
}

/** Machines already written since the last date line. */
export function machinesInCurrentDay(lines) {
  const ids = new Set();
  for (let i = lines.length - 1; i >= 0 && lines[i].type !== 'date'; i--) {
    if (lines[i].type === 'machine') ids.add(lines[i].machineId);
  }
  return ids;
}

/** The kg values on the wheel: 0 to KG_MAX in steps of KG_STEP, always including `mustInclude`. */
export function kgOptions(mustInclude) {
  const value = round2(Number(mustInclude) || 0);
  const max = Math.max(KG_MAX, value);
  const options = [];
  for (let i = 0; round2(i * KG_STEP) <= max; i++) options.push(round2(i * KG_STEP));
  if (!options.includes(value)) {
    options.push(value);
    options.sort((a, b) => a - b);
  }
  return options;
}

/** Machines in alphabetical order, ignoring upper and lower case. Returns a new list. */
export function sortMachines(machines) {
  return machines.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/** Removes the demo lines. An example date stays when lines of your own were written under it. */
export function withoutExamples(lines) {
  const keepDates = new Set();
  let date = null;
  for (const line of lines) {
    if (line.type === 'date') date = line;
    else if (!line.example && date && date.example) keepDates.add(date.id);
  }
  return lines
    .filter((line) => !line.example || keepDates.has(line.id))
    .map((line) => (keepDates.has(line.id) ? { ...line, example: undefined } : line));
}

/** The notebook a new user starts with: six machines and five example days. */
export function exampleNotebook() {
  const machines = [
    { id: 'm-leg-press', name: 'Leg press' },
    { id: 'm-chest-press', name: 'Chest press' },
    { id: 'm-lat-pulldown', name: 'Lat pulldown' },
    { id: 'm-shoulder-press', name: 'Shoulder press' },
    { id: 'm-seated-row', name: 'Seated row' },
    { id: 'm-leg-curl', name: 'Leg curl' },
  ];
  const byName = new Map(machines.map((m) => [m.name, m]));
  const sessions = [
    ['2026-11-07', 'Biking Basics New Zealand #11', [['Leg press', 75, 3, 12], ['Chest press', 32.5, 3, 10], ['Seated row', 37.5, 3, 12]]],
    ['2026-11-09', 'Biking Basics New Zealand #12', [['Leg press', 75, 3, 12], ['Shoulder press', 20, 3, 10], ['Lat pulldown', 45, 3, 12]]],
    ['2026-11-11', 'Biking Basics New Zealand #13', [['Chest press', 32.5, 3, 10], ['Shoulder press', 20, 3, 10], ['Seated row', 40, 3, 12]]],
    ['2026-11-14', 'Biking Basics New Zealand #14', [['Leg press', 75, 3, 12], ['Chest press', 35, 3, 10], ['Lat pulldown', 45, 3, 12]]],
    ['2026-11-16', 'Biking Basics New Zealand #15', [['Leg press', 80, 3, 12], ['Shoulder press', 20, 3, 10], ['Seated row', 40, 3, 12]]],
  ];

  const lines = [];
  for (const [date, ride, exercises] of sessions) {
    lines.push({ id: newId('l'), type: 'date', date, example: true });
    lines.push({ id: newId('l'), type: 'text', text: ride, example: true });
    for (const [name, weight, sets, reps] of exercises) {
      lines.push({ id: newId('l'), type: 'machine', machineId: byName.get(name).id, name, weight, sets, reps, example: true });
    }
  }
  return { version: 1, machines, lines };
}
