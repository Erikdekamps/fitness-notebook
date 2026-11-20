/**
 * The numbers behind the statistics screens. Pure functions:
 * they take lines and dates and return plain values the view can draw.
 */
import { round2 } from './util.js';
import { Dates } from './dates.js';

/** The kg one ruled line can stand for in a chart, smallest first. */
export const KG_PER_LINE = [2.5, 5, 10, 20, 25, 50, 100];

/** The dates that have a date line in the notebook, as a Set of "YYYY-MM-DD". */
export function sessionDates(lines) {
  return new Set(lines.filter((line) => line.type === 'date').map((line) => line.date));
}

/** The Monday of the week a date falls in. */
export function mondayOf(iso) {
  const { y, m, d } = Dates.parts(iso);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Dates.toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** The Monday one week before the given Monday. */
export function weekBefore(mondayIso) {
  const { y, m, d } = Dates.parts(mondayIso);
  const date = new Date(y, m - 1, d - 7);
  return Dates.toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Weeks in a row with at least one session, counting back from this week
 * (or from last week, when this week is still empty).
 */
export function weeksInARow(dates, today) {
  const weeks = new Set(Array.from(dates, mondayOf));
  let week = mondayOf(today);
  if (!weeks.has(week)) week = weekBefore(week);
  let count = 0;
  while (weeks.has(week)) {
    count++;
    week = weekBefore(week);
  }
  return count;
}

/**
 * The cells of a month's week grid, Monday first.
 * Each cell is 'blank' (before the 1st), 'trained' or 'rest'. Days after `today` are left out.
 */
export function monthCells(dates, year, month, today) {
  const cells = [];
  const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  for (let i = 0; i < leading; i++) cells.push({ day: null, state: 'blank' });
  for (let day = 1; day <= Dates.daysInMonth(year, month); day++) {
    const iso = Dates.toIso(year, month, day);
    if (iso > today) break;
    cells.push({ day, state: dates.has(iso) ? 'trained' : 'rest' });
  }
  return cells;
}

/** How many of the cells are days trained. */
export function countTrained(cells) {
  return cells.filter((cell) => cell.state === 'trained').length;
}

/** Splits a list into rows of `size`. */
export function inRows(list, size) {
  const rows = [];
  for (let i = 0; i < list.length; i += size) rows.push(list.slice(i, i + size));
  return rows;
}

/** Hand-drawn tally marks as an SVG path: four strokes and a slash for every five. Returns { path, width }. */
export function tallyMarks(count) {
  const fives = Math.floor(count / 5);
  const rest = count % 5;
  let path = '';
  for (let g = 0; g < fives; g++) {
    const x = g * 46;
    path += `M${x + 4} 3l-1 20M${x + 13} 2l-1 21M${x + 22} 3l0 20M${x + 31} 2l-1 21M${x} 19L${x + 36} 6`;
  }
  for (let i = 0; i < rest; i++) path += `M${fives * 46 + 4 + i * 9} ${i % 2 ? 2 : 3}l-1 20`;
  return { path, width: fives * 46 + (rest ? rest * 9 + 2 : 0) };
}

/** Every dated time a machine was logged, oldest first: [{ date, weight }]. */
export function machineHistory(lines, machineId) {
  const points = [];
  let date = null;
  lines.forEach((line, order) => {
    if (line.type === 'date') date = line.date;
    else if (line.type === 'machine' && line.machineId === machineId && date) points.push({ date, order, weight: line.weight });
  });
  return points
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order))
    .map(({ date: when, weight }) => ({ date: when, weight }));
}

/**
 * The scale of a chart drawn on `rows` ruled lines: the kg on the top line and the kg per line,
 * chosen as small as possible while every weight still fits.
 */
export function chartScale(weights, rows) {
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  for (const perLine of KG_PER_LINE) {
    const top = Math.ceil(max / perLine) * perLine;
    if ((top - min) / perLine <= rows - 1) return { top, perLine };
  }
  const perLine = KG_PER_LINE[KG_PER_LINE.length - 1];
  return { top: Math.ceil(max / perLine) * perLine, perLine };
}

/**
 * Where each point of a chart goes, in pixels.
 * Points are spread evenly from `left` to `right`; a weight on a ruled line sits exactly on it.
 */
export function chartPoints(points, scale, { left, right, firstLineY, lineHeight }) {
  const step = points.length > 1 ? (right - left) / (points.length - 1) : 0;
  return points.map((point, i) => ({
    x: round2(points.length > 1 ? left + i * step : right),
    y: round2(firstLineY + ((scale.top - point.weight) / scale.perLine) * lineHeight),
  }));
}

/**
 * Which points get a month label under the chart: the first point of each month,
 * skipping a label that would sit closer than `minGap` pixels to the one before.
 * Returns [{ x, month }] with month 1 to 12.
 */
export function monthLabels(points, positions, minGap) {
  const labels = [];
  let lastMonth = '';
  let lastX = -Infinity;
  points.forEach((point, i) => {
    const month = point.date.slice(0, 7);
    if (month === lastMonth) return;
    lastMonth = month;
    if (positions[i].x - lastX < minGap) return;
    lastX = positions[i].x;
    labels.push({ x: positions[i].x, month: Number(month.slice(5)) });
  });
  return labels;
}
