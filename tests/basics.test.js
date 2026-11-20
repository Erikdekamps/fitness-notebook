import { test } from 'node:test';
import assert from 'node:assert/strict';
import { range, clamp, round2, formatKg, cleanName, sameName, newId, indexOr, escapeHtml } from '../src/js/util.js';
import { Dates } from '../src/js/dates.js';
import { isNotebook, loadNotebook, saveNotebook } from '../src/js/storage.js';
import { STORAGE_KEY } from '../src/js/config.js';

test('util: numbers', () => {
  assert.deepEqual(range(1, 4), [1, 2, 3, 4]);
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(round2(37.50000001), 37.5);
  assert.equal(formatKg(80), '80');
  assert.equal(formatKg(37.5), '37.5');
});

test('util: names', () => {
  assert.equal(cleanName('  Leg   press '), 'Leg press');
  assert.ok(sameName('leg  PRESS', 'Leg press'));
  assert.ok(!sameName('Leg press', 'Leg curl'));
});

test('util: ids, lookups, escaping', () => {
  assert.notEqual(newId('l'), newId('l'));
  assert.ok(newId('m').startsWith('m'));
  assert.equal(indexOr([5, 6, 7], 6), 1);
  assert.equal(indexOr([5, 6, 7], 9, 2), 2);
  assert.equal(escapeHtml(`<b a="1">Tom & 'Jerry'</b>`), '&lt;b a=&quot;1&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;');
});

test('Dates: iso and parts', () => {
  assert.equal(Dates.toIso(2026, 3, 5), '2026-03-05');
  assert.deepEqual(Dates.parts('2026-03-05'), { y: 2026, m: 3, d: 5 });
  assert.match(Dates.today(), /^\d{4}-\d{2}-\d{2}$/);
});

test('Dates: days in a month, leap years', () => {
  assert.equal(Dates.daysInMonth(2026, 2), 28);
  assert.equal(Dates.daysInMonth(2028, 2), 29);
  assert.equal(Dates.daysInMonth(2026, 11), 30);
});

test('Dates.written: Dutch day, year only when it is not this year', () => {
  const thisYear = new Date().getFullYear();
  const now = Dates.written(`${thisYear}-01-07`);
  assert.equal(now.date, '07/01');
  assert.deepEqual(Dates.written('2020-11-18'), { date: '18/11/20', day: 'wo' });
  assert.equal(Dates.written('2020-11-22').day, 'zo');
});

/** A stand-in for localStorage. */
function memoryStorage(initial = {}) {
  const items = { ...initial };
  return { getItem: (k) => (k in items ? items[k] : null), setItem: (k, v) => { items[k] = String(v); }, items };
}

test('storage: saves and loads a notebook', () => {
  const storage = memoryStorage();
  assert.equal(loadNotebook(storage), null);
  assert.equal(saveNotebook({ machines: [], lines: [{ id: 'a' }] }, storage), true);
  assert.deepEqual(loadNotebook(storage), { machines: [], lines: [{ id: 'a' }] });
});

test('storage: unreadable or wrong data counts as nothing saved', () => {
  assert.equal(loadNotebook(memoryStorage({ [STORAGE_KEY]: 'not json' })), null);
  assert.equal(loadNotebook(memoryStorage({ [STORAGE_KEY]: '{"lines":[]}' })), null);
  assert.equal(isNotebook({ lines: [], machines: [] }), true);
  assert.equal(isNotebook(null), false);
});

test('storage: a blocked storage does not throw', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadNotebook(blocked), null);
  assert.equal(saveNotebook({ machines: [], lines: [] }, blocked), false);
});
