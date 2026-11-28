import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { Prefs } = load('prefs');
const { PREFS_KEY, STORAGE_KEY, REST_TIMES_S, KG_STEPS, TEXT_SIZES, DEFAULT_PREFS } = load('config');

/** A stand-in for localStorage. */
function memoryStorage(initial = {}) {
  const items = { ...initial };
  return { getItem: (k) => (k in items ? items[k] : null), setItem: (k, v) => { items[k] = String(v); }, items };
}

test('Prefs: the timer is on with 1:30 rest, the kg wheel goes by 2.5 and text is normal, when nothing is saved', () => {
  assert.deepEqual(DEFAULT_PREFS, { timerOn: true, restSeconds: 90, kgStep: 2.5, textSize: 'normal' });
  assert.deepEqual(Prefs.load(memoryStorage()), DEFAULT_PREFS);
});

test('Prefs: saves and loads, apart from the notebook', () => {
  const storage = memoryStorage();
  assert.ok(Prefs.save({ timerOn: false, restSeconds: 120, kgStep: 0.5, textSize: 'large' }, storage));
  assert.notEqual(PREFS_KEY, STORAGE_KEY);
  assert.ok(!(STORAGE_KEY in storage.items));
  assert.deepEqual(Prefs.load(storage), { timerOn: false, restSeconds: 120, kgStep: 0.5, textSize: 'large' });
});

test('Prefs: bad or unknown values fall back to the defaults', () => {
  assert.deepEqual(Prefs.clean(null), DEFAULT_PREFS);
  assert.deepEqual(Prefs.clean({ timerOn: 'yes', restSeconds: 91, kgStep: 1, textSize: 'huge', beep: true }), DEFAULT_PREFS);
  assert.deepEqual(Prefs.clean({ kgStep: '0.5' }), DEFAULT_PREFS);
  assert.deepEqual(Prefs.clean({ timerOn: false }), { timerOn: false, restSeconds: 90, kgStep: 2.5, textSize: 'normal' });
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

test('Prefs: the kg wheel goes by 0.5 (small dumbbells) or 2.5', () => {
  assert.deepEqual(KG_STEPS, [0.5, 2.5]);
  for (const kgStep of KG_STEPS) assert.equal(Prefs.clean({ kgStep }).kgStep, kgStep);
});

test('Prefs: text is small, normal or large', () => {
  assert.deepEqual(TEXT_SIZES, ['small', 'normal', 'large']);
  for (const textSize of TEXT_SIZES) assert.equal(Prefs.clean({ textSize }).textSize, textSize);
});

test('Prefs: clock', () => {
  assert.equal(Prefs.clock(90), '1:30');
  assert.equal(Prefs.clock(5), '0:05');
  assert.equal(Prefs.clock(600), '10:00');
  assert.equal(Prefs.clock(-3), '0:00');
});
