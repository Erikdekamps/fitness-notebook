/** The statistics screens: this month, and one machine over time. Drawing only; the numbers come from stats.js. */
import { DAY_NAMES, MONTH_NAMES, MONTH_SHORT, BLANK_ROW } from '../config.js';
import { formatKg, escapeHtml } from '../util.js';
import { byId } from '../dom.js';
import { Dates } from '../dates.js';
import { state, machinesAZ } from '../state.js';
import { navigation } from '../navigation.js';
import {
  sessionDates, weeksInARow, monthCells, countTrained, inRows, tallyMarks,
  machineHistory, chartScale, chartPoints, monthLabels,
} from '../stats.js';

const monthBody = byId('statsBody');
const machineTitle = byId('machineStatsTitle');
const machineBody = byId('machineStatsBody');

const CHART_ROWS = 5;   // ruled lines used as the chart's grid
const LINE_PX = 44;     // keep in sync with --line
const RULE_Y = 36.5;    // where the ruled line sits inside a row
const MAX_TALLY = 30;   // above this only the number is shown
const CHEVRON =
  '<svg width="12" height="22" viewBox="0 0 12 22" fill="none" stroke="currentColor" stroke-width="2.5" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 3l8 8-8 8"/></svg>';

function tallyHtml(count) {
  if (count < 1 || count > MAX_TALLY) return '';
  const { path, width } = tallyMarks(count);
  return (
    `<svg width="${width}" height="26" viewBox="0 0 ${width} 26" fill="none" stroke="currentColor" stroke-width="2.2" ` +
    `stroke-linecap="round" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`
  );
}

function cellHtml(cell) {
  if (cell.state === 'trained') return `<span class="is-bold" role="img" aria-label="${cell.day}: trained">×</span>`;
  if (cell.state === 'rest') return '<span class="is-pencil" aria-hidden="true">·</span>';
  return '<span></span>';
}

function statLineHtml(label, count) {
  return `<div class="stat-line"><span>${label}</span>${tallyHtml(count)}<span class="mark">${count}</span></div>`;
}

function machineLinksHtml(machines) {
  if (!machines.length) return '<div class="stat-line is-pencil">no machines yet</div>';
  return machines
    .map((machine) => `<button class="stat-link" type="button" data-machine="${escapeHtml(machine.id)}"><span>${escapeHtml(machine.name)}</span>${CHEVRON}</button>`)
    .join('');
}

/* ---- This month ---- */

function renderMonth() {
  const today = Dates.today();
  const { y, m } = Dates.parts(today);
  const dates = sessionDates(state.data.lines);
  const cells = monthCells(dates, y, m, today);
  const mondayFirst = DAY_NAMES.slice(1).concat(DAY_NAMES[0]);

  monthBody.innerHTML =
    `<div class="stat-line is-bold">${MONTH_NAMES[m - 1]}</div>` +
    `<div class="week is-pencil is-small" aria-hidden="true">${mondayFirst.map((day) => `<span>${day}</span>`).join('')}</div>` +
    inRows(cells, 7).map((week) => `<div class="week">${week.map(cellHtml).join('')}</div>`).join('') +
    BLANK_ROW +
    statLineHtml('sessions', countTrained(cells)) +
    statLineHtml('weeks in a row', weeksInARow(dates, today)) +
    BLANK_ROW +
    machineLinksHtml(machinesAZ());
}

/* ---- One machine over time ---- */

function chartHtml(name, points, width) {
  const scale = chartScale(points.map((p) => p.weight), CHART_ROWS);
  const xy = chartPoints(points, scale, { left: 56, right: width - 30, firstLineY: RULE_Y, lineHeight: LINE_PX });
  const radius = points.length <= 24 ? 4 : 2.5;
  const lower = scale.top - 2 * scale.perLine;
  const first = points[0];
  const last = points[points.length - 1];
  const label =
    `${escapeHtml(name)}: ${points.length} times, from ${formatKg(first.weight)} kg on ${Dates.written(first.date).date} ` +
    `to ${formatKg(last.weight)} kg on ${Dates.written(last.date).date}`;

  return (
    '<div class="chart">' +
    `<span class="axis" style="top: 0">${formatKg(scale.top)} kg</span>` +
    (lower > 0 ? `<span class="axis" style="top: ${2 * LINE_PX}px">${formatKg(lower)}</span>` : '') +
    `<svg width="${width}" height="${CHART_ROWS * LINE_PX}" viewBox="0 0 ${width} ${CHART_ROWS * LINE_PX}" fill="none" role="img" aria-label="${label}">` +
    `<path d="M${xy.map((p) => `${p.x} ${p.y}`).join('L')}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<g fill="currentColor">${xy.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${radius}"/>`).join('')}</g>` +
    '</svg></div>' +
    `<div class="months" aria-hidden="true">${monthLabels(points, xy, 44).map((l) => `<span style="left: ${l.x}px">${MONTH_SHORT[l.month - 1]}</span>`).join('')}</div>`
  );
}

function renderMachine(machineId) {
  const machine = state.data.machines.find((m) => m.id === machineId);
  const name = machine ? machine.name : 'Machine';
  machineTitle.textContent = name;
  const points = machineHistory(state.data.lines, machineId);
  machineBody.innerHTML = points.length
    ? chartHtml(name, points, machineBody.clientWidth || 326)
    : '<div class="stat-line is-pencil">nothing logged yet</div>';
}

monthBody.addEventListener('click', (e) => {
  const button = e.target.closest('[data-machine]');
  if (button) navigation.open({ view: 'machineStats', machineId: button.dataset.machine });
});

export const StatsView = { renderMonth, renderMachine };
