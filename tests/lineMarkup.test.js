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
