import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { LineMarkup } = load('lineMarkup');

const thisYear = new Date().getFullYear();
const machine = { id: 'l1', type: 'machine', machineId: 'm', name: 'Leg press', weight: 37.5, sets: 3, reps: 12 };

test('content: a date is written as day/month and the Dutch day', () => {
  assert.equal(LineMarkup.content({ type: 'date', date: `${thisYear}-11-18` }).replace(/<[^>]+>/g, ' ').trim().replace(/\s+/g, ' '),
    `18/11 ${['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][new Date(thisYear, 10, 18).getDay()]}`);
});

test('content: text is escaped', () => {
  assert.equal(LineMarkup.content({ type: 'text', text: 'Rows <3 & more' }), 'Rows &lt;3 &amp; more');
});

test('content: a machine line has its name, the numbers and the mark', () => {
  const html = LineMarkup.content(machine, 'up');
  assert.match(html, /<span class="name">Leg press<\/span>/);
  assert.match(html, /37\.5 × 12 × 3/);
  assert.match(html, /heavier than last time/);
});

test('mark: up, down, repeats, or nothing the first time', () => {
  assert.match(LineMarkup.mark('up'), /heavier/);
  assert.match(LineMarkup.mark('down'), /lighter/);
  assert.match(LineMarkup.mark(1), /1 time in a row">–1</);
  assert.match(LineMarkup.mark(3), /3 times in a row">–3</);
  assert.equal(LineMarkup.mark(null), '');
});

test('row: tappable, carries the line id and a Delete button', () => {
  const html = LineMarkup.row({ ...machine, id: 'a"b' }, null);
  assert.match(html, /class="row row--machine"/);
  assert.match(html, /data-key="a&quot;b"/);
  assert.match(html, /class="row-delete"/);
});

test('page: a skipped line before every date but the first', () => {
  const lines = [
    { id: 'd1', type: 'date', date: `${thisYear}-11-16` }, { id: 't1', type: 'text', text: 'one' },
    { id: 'd2', type: 'date', date: `${thisYear}-11-18` }, { id: 't2', type: 'text', text: 'two' },
  ];
  const html = LineMarkup.page(lines, new Map());
  assert.equal((html.match(/class="blank"/g) || []).length, 1);
  assert.ok(html.indexOf('class="blank"') > html.indexOf('data-key="t1"'));
  assert.ok(html.indexOf('class="blank"') < html.indexOf('data-key="d2"'));
});

test('a plan line: only the name, in pencil, and it can still be tapped and removed', () => {
  const plan = { id: 'p1', type: 'plan', machineId: 'm', name: 'Leg <curl>' };
  assert.equal(LineMarkup.content(plan), '<span class="name">Leg &lt;curl&gt;</span>');
  const html = LineMarkup.row(plan, null);
  assert.match(html, /class="row row--plan"/);
  assert.match(html, /class="row-content is-pencil"/);
  assert.match(html, /data-key="p1"/);
  assert.match(html, /class="row-delete"/);
  assert.doesNotMatch(LineMarkup.row(machine, null), /is-pencil/);
});

test('content: a date started from a plan has the plan name after it in brackets, escaped', () => {
  const html = LineMarkup.content({ type: 'date', date: `${thisYear}-11-18`, plan: 'Legs & <more>' });
  assert.match(html, /<span>18\/11<\/span><span>\w+<\/span><span class="plan-name">\(Legs &amp; &lt;more&gt;\)<\/span>$/);
  assert.doesNotMatch(LineMarkup.content({ type: 'date', date: `${thisYear}-11-18` }), /plan-name/);
});

test('content: a date without a plan is only the date and the day', () => {
  const day = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][new Date(thisYear, 10, 18).getDay()];
  assert.equal(LineMarkup.content({ type: 'date', date: `${thisYear}-11-18` }), `<span>18/11</span><span>${day}</span>`);
});

test('row: one closed element holding the content and the Delete button', () => {
  const html = LineMarkup.row(machine, null);
  assert.ok(html.startsWith('<div class="row row--machine"'));
  assert.ok(html.includes(`<div class="row-content">${LineMarkup.content(machine, null)}</div>`));
  assert.ok(html.endsWith('</button></div>'));
  assert.equal((html.match(/<div\b/g) || []).length, (html.match(/<\/div>/g) || []).length);
});

test('page: nothing between lines but the skipped line before a date', () => {
  const lines = [{ id: 't1', type: 'text', text: 'one' }, { id: 't2', type: 'text', text: 'two' }];
  assert.equal(LineMarkup.page(lines, new Map()), LineMarkup.row(lines[0]) + LineMarkup.row(lines[1]));
  const first = [{ id: 'd1', type: 'date', date: `${thisYear}-11-16` }];
  assert.equal(LineMarkup.page(first, new Map()), LineMarkup.row(first[0]));
});
