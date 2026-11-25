import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { range, clamp, round2, formatKg, cleanName, sameName, newId, indexOr, inRows, escapeHtml } = load('util');
const { Store } = load('store');
const { STORAGE_KEY } = load('config');

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

test('util: ids, lookups, rows, escaping', () => {
  assert.notEqual(newId('l'), newId('l'));
  assert.ok(newId('m').startsWith('m'));
  assert.equal(indexOr([5, 6, 7], 6), 1);
  assert.equal(indexOr([5, 6, 7], 9, 2), 2);
  assert.deepEqual(inRows([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(inRows([], 7), []);
  assert.equal(escapeHtml(`<b a="1">Tom & 'Jerry'</b>`), '&lt;b a=&quot;1&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;');
});

/** A stand-in for localStorage. */
function memoryStorage(initial = {}) {
  const items = { ...initial };
  return { getItem: (k) => (k in items ? items[k] : null), setItem: (k, v) => { items[k] = String(v); }, items };
}

test('Store: saves and loads notebook data', () => {
  const storage = memoryStorage();
  assert.equal(Store.load(storage), null);
  assert.equal(Store.save({ machines: [], lines: [{ id: 'a' }] }, storage), true);
  assert.deepEqual(Store.load(storage), { machines: [], lines: [{ id: 'a' }] });
});

test('Store: unreadable or wrong data counts as nothing saved', () => {
  assert.equal(Store.load(memoryStorage({ [STORAGE_KEY]: 'not json' })), null);
  assert.equal(Store.load(memoryStorage({ [STORAGE_KEY]: '{"lines":[]}' })), null);
  assert.equal(Store.isNotebookData({ lines: [], machines: [] }), true);
  assert.equal(Store.isNotebookData(null), false);
});

test('Store: a blocked storage does not throw', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(Store.load(blocked), null);
  assert.equal(Store.save({ machines: [], lines: [] }, blocked), false);
});
