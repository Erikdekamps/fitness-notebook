import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const config = load('config');
const { Calendar } = load('calendar');
const { newId } = load('util');

test('storage keys never change: people already have data saved under them', () => {
  // A new key would make the app start empty and leave the saved notebook, settings and
  // running timer behind on the phone. Change one only together with a migration.
  assert.equal(config.STORAGE_KEY, 'fitness-notebook.v1');
  assert.equal(config.PREFS_KEY, 'fitness-notebook.prefs.v1');
  assert.equal(config.TIMER_KEY, 'fitness-notebook.timer.v1');
});

test('day names: seven different Dutch names, written under each date', () => {
  // The week of Monday 16 November 2026.
  const week = ['16', '17', '18', '19', '20', '21', '22'].map((d) => Calendar.written(`2026-11-${d}`).day);
  assert.deepEqual(week, ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']);
  assert.equal(config.DAY_NAMES.length, 7);
  assert.equal(new Set(config.DAY_NAMES).size, 7);
});

test('month names: twelve different non-empty names, and a short form of each', () => {
  for (const names of [config.MONTH_NAMES, config.MONTH_SHORT]) {
    assert.equal(names.length, 12);
    assert.equal(new Set(names).size, 12);
    for (const name of names) assert.match(name, /^[a-z]+$/);
  }
  assert.equal(config.MONTH_NAMES[0], 'januari');
  assert.equal(config.MONTH_NAMES[11], 'december');
  config.MONTH_SHORT.forEach((short, i) => {
    const long = config.MONTH_NAMES[i];
    assert.ok(short.length <= 3 && short.length <= long.length, `${short} is short for ${long}`);
    assert.equal(short[0], long[0], `${short} starts like ${long}`);
  });
});

test('first-time values are on the wheels', () => {
  const { weight, sets, reps } = config.FIRST_TIME_VALUES;
  assert.ok(Number.isFinite(weight) && weight > 0 && weight <= config.KG_MAX);
  assert.equal(weight % config.KG_STEP, 0);
  assert.ok(config.SETS.includes(sets));
  assert.ok(config.REPS.includes(reps));
});

test('an open row slides past the whole Delete button', () => {
  assert.ok(config.OPEN_OFFSET_PX > config.DELETE_WIDTH_PX);
  assert.ok(config.OPEN_OFFSET_PX > config.RULE_INSET_PX);
});

test('the preview line id can never be the id of a real line', () => {
  assert.equal(typeof config.PREVIEW_ID, 'string');
  assert.ok(config.PREVIEW_ID.length > 0);
  // newId only makes letters and digits after its prefix; the preview id has other characters.
  assert.doesNotMatch(config.PREVIEW_ID, /^[a-z0-9]+$/i);
  assert.notEqual(config.PREVIEW_ID, newId(''));
});

/** The attributes of the single <svg> element in `markup`. */
function svgAttributes(markup) {
  const match = markup.match(/^<svg ([^>]*)>([\s\S]*)<\/svg>$/);
  assert.ok(match, `one svg element: ${markup}`);
  const attrs = Object.fromEntries([...match[1].matchAll(/([a-z-]+)="([^"]*)"/gi)].map((m) => [m[1], m[2]]));
  return { attrs, body: match[2] };
}

test('svg: an icon of the given size that takes the text colour and is hidden from screen readers', () => {
  const { attrs, body } = svgAttributes(config.svg(16, 22, 2, '<path d="M1 1"/>'));
  assert.equal(attrs.width, '16');
  assert.equal(attrs.height, '22');
  assert.equal(attrs.viewBox, '0 0 16 22');
  assert.equal(attrs['stroke-width'], '2');
  assert.equal(attrs.stroke, 'currentColor');
  assert.equal(attrs.fill, 'none');
  assert.equal(attrs['aria-hidden'], 'true');
  assert.equal(attrs.focusable, 'false');
  assert.equal(attrs['stroke-linecap'], 'round');
  assert.equal(attrs['stroke-linejoin'], 'round');
  assert.equal(body, '<path d="M1 1"/>');
});

test('Icons: each one is a drawn, decorative svg whose viewBox matches its size', () => {
  assert.deepEqual(Object.keys(config.Icons).sort(), ['chevron', 'down', 'up']);
  const drawings = new Set();
  for (const [name, markup] of Object.entries(config.Icons)) {
    const { attrs, body } = svgAttributes(markup);
    assert.equal(attrs.viewBox, `0 0 ${attrs.width} ${attrs.height}`, name);
    assert.ok(Number(attrs.width) > 0 && Number(attrs.height) > 0, name);
    assert.ok(Number(attrs['stroke-width']) > 0, name);
    assert.equal(attrs['aria-hidden'], 'true', name);
    assert.match(body, /^<path d="M[^"]+"\/>$/, name);
    drawings.add(body);
  }
  assert.equal(drawings.size, 3); // no two icons look the same
});
