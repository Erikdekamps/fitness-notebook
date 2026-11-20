/**
 * Backup: turning a notebook into a JSON file and back. Pure functions.
 *
 * File shape
 *   { "app": "fitness-notebook", "version": 1, "exportedAt": "<ISO time>", "unit": "kg",
 *     "machines": [{ id, name }],
 *     "lines": [{ id, type: "date", date } | { id, type: "text", text } |
 *               { id, type: "machine", machineId, name, weight, sets, reps }] }
 * Rules for reading a file
 *   - it must say app "fitness-notebook"; anything else is refused
 *   - a newer version than this app knows is refused, never half-read
 *   - fields this app does not know are ignored, so later versions can add things
 */
import { cleanName, newId } from './util.js';
import { Dates } from './dates.js';

export const BACKUP_APP = 'fitness-notebook';
export const BACKUP_VERSION = 1;

/** The name of a backup file made on `today` ("YYYY-MM-DD"). */
export function backupFileName(today) {
  return `fitness-notebook-${today}.json`;
}

/** A machine with only the fields this app knows, or null when it cannot be used. */
export function cleanMachine(machine) {
  if (!machine || typeof machine.id !== 'string' || typeof machine.name !== 'string' || !cleanName(machine.name)) return null;
  return { id: machine.id, name: cleanName(machine.name) };
}

/** A line with only the fields this app knows, or null when it cannot be used. */
export function cleanLine(line) {
  if (!line) return null;
  const id = typeof line.id === 'string' && line.id ? line.id : newId('l');
  const isCount = (n) => Number.isFinite(n) && n >= 0;
  if (line.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(line.date)) return { id, type: 'date', date: line.date };
  if (line.type === 'text' && typeof line.text === 'string' && line.text.trim()) return { id, type: 'text', text: line.text.trim() };
  if (
    line.type === 'machine' &&
    typeof line.machineId === 'string' &&
    typeof line.name === 'string' &&
    isCount(line.weight) && isCount(line.sets) && isCount(line.reps)
  ) {
    const { machineId, name, weight, sets, reps } = line;
    return { id, type: 'machine', machineId, name, weight, sets, reps };
  }
  return null;
}

/** The notebook as a backup object. `now` is the Date of the export. */
export function toBackup(notebook, now) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    unit: 'kg',
    machines: notebook.machines.map(cleanMachine).filter(Boolean),
    lines: notebook.lines.map(cleanLine).filter(Boolean),
  };
}

/** The notebook as the text of a backup file. */
export function toBackupJson(notebook, now) {
  return JSON.stringify(toBackup(notebook, now), null, 2);
}

/** Reads the text of a backup file. Returns { notebook } or { error }. */
export function parseBackup(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch (_) {
    return { error: 'That is not a JSON file' };
  }
  if (!file || file.app !== BACKUP_APP || !Array.isArray(file.machines) || !Array.isArray(file.lines)) {
    return { error: 'That is not a Fitness Notebook file' };
  }
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    return { error: 'That file is from a newer version of the app' };
  }
  return {
    notebook: {
      version: 1,
      machines: file.machines.map(cleanMachine).filter(Boolean),
      lines: file.lines.map(cleanLine).filter(Boolean),
    },
  };
}

/** A short description of a notebook, for the "replace?" question: [lines and dates, machines]. */
export function describeNotebook(notebook) {
  const dates = notebook.lines.filter((l) => l.type === 'date').map((l) => l.date).sort();
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  let lines = count(notebook.lines.length, 'line');
  if (dates.length === 1) lines += `, on ${Dates.written(dates[0]).date}`;
  else if (dates.length > 1) lines += `, from ${Dates.written(dates[0]).date} to ${Dates.written(dates[dates.length - 1]).date}`;
  return [lines, count(notebook.machines.length, 'machine')];
}
