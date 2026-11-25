import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { Prefs } = load('prefs');
const { PREFS_KEY, STORAGE_KEY, REST_TIMES_S, DEFAULT_PREFS } = load('config');

/** A stand-in for localStorage. */
function memoryStorage(initial = {}) {
  const items = { ...initial };
  return { getItem: (k) => (k in items ? items[k] : null), setItem: (k, v) => { items[k] = String(v); }, items };
}

test('Prefs: the timer is on with 1:30 rest when nothing is saved', () => {
  assert.deepEqual(DEFAULT_PREFS, { timerOn: true, restSeconds: 90 });
  assert.deepEqual(Prefs.load(memoryStorage()), DEFAULT_PREFS);
});

test('Prefs: saves and loads, apart from the notebook', () => {
  const storage = memoryStorage();
  assert.ok(Prefs.save({ timerOn: false, restSeconds: 120 }, storage));
  assert.notEqual(PREFS_KEY, STORAGE_KEY);
  assert.ok(!(STORAGE_KEY in storage.items));
  assert.deepEqual(Prefs.load(storage), { timerOn: false, restSeconds: 120 });
});

test('Prefs: bad or unknown values fall back to the defaults', () => {
  assert.deepEqual(Prefs.clean(null), DEFAULT_PREFS);
  assert.deepEqual(Prefs.clean({ timerOn: 'yes', restSeconds: 91, beep: true }), DEFAULT_PREFS);
  assert.deepEqual(Prefs.clean({ timerOn: false }), { timerOn: false, restSeconds: 90 });
  assert.deepEqual(Prefs.load(memoryStorage({ [PREFS_KEY]: '{not json' })), DEFAULT_PREFS);
});

test('Prefs: blocked storage does not break the app', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(Prefs.load(blocked), DEFAULT_PREFS);
  assert.equal(Prefs.save(DEFAULT_PREFS, blocked), false);
});

test('Prefs: rest times run from 0:15 to 10:00 in steps of 15 seconds', () => {
  assert.equal(REST_TIMES_S[0], 15);
  assert.equal(REST_TIMES_S.at(-1), 600);
  assert.ok(REST_TIMES_S.includes(DEFAULT_PREFS.restSeconds));
});

test('Prefs: clock', () => {
  assert.equal(Prefs.clock(90), '1:30');
  assert.equal(Prefs.clock(5), '0:05');
  assert.equal(Prefs.clock(600), '10:00');
  assert.equal(Prefs.clock(-3), '0:00');
});
