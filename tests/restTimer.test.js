import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { RestTimer } = load('restTimer');
const { TIMER_KEY } = load('config');

/** A stand-in for localStorage. */
function memoryStorage(initial = {}) {
  const items = { ...initial };
  return {
    getItem: (k) => (k in items ? items[k] : null),
    setItem: (k, v) => { items[k] = String(v); },
    removeItem: (k) => { delete items[k]; },
    items,
  };
}

test('RestTimer: counts down from the rest time', () => {
  const endsAt = RestTimer.endsAt(1000, 90);
  assert.equal(endsAt, 91000);
  assert.equal(RestTimer.reading(endsAt, 1000), '1:30');
  assert.equal(RestTimer.reading(endsAt, 2500), '1:29'); // 88.5 s left shows 1:29
  assert.equal(RestTimer.reading(endsAt, 90900), '0:01');
});

test('RestTimer: nothing to show when rest is over, or when there is no timer', () => {
  assert.equal(RestTimer.reading(10000, 10000), null);
  assert.equal(RestTimer.reading(10000, 18000), null);
  assert.equal(RestTimer.reading(null, 0), null);
});

test('RestTimer: saves, loads and clears the end time', () => {
  const storage = memoryStorage();
  assert.equal(RestTimer.load(storage), null);
  RestTimer.save(91000, storage);
  assert.equal(RestTimer.load(storage), 91000);
  RestTimer.save(null, storage);
  assert.ok(!(TIMER_KEY in storage.items));
  assert.equal(RestTimer.load(memoryStorage({ [TIMER_KEY]: 'junk' })), null);
});
