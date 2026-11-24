/** Tests for the CRAP checker itself: if it counts wrong, the check means nothing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCode, crap, ran, readBlocks } from './crap.js';

const only = (code) => {
  const fns = analyzeCode(code);
  assert.equal(fns.length, 1);
  return fns[0];
};

test('crap: a fully tested function scores its complexity; an untested one its complexity squared plus it', () => {
  assert.equal(crap(5, 1), 5);
  assert.equal(crap(5, 0), 30);
  assert.equal(crap(1, 0), 2);
  assert.equal(crap(10, 0.5), 10 * 10 * 0.125 + 10);
});

test('complexity: 1 for straight code', () => {
  assert.equal(only('function f(a) { const b = a + 1; return b; }').complexity, 1);
});

test('complexity: one more for every if, ?:, &&, ||, ??, loop, case, catch, default value and ?.', () => {
  const code = `function f(a = 1, b) {
    if (a) {}
    const c = a ? 1 : 2;
    const d = (a && b || c) ?? 0;
    for (;;) {} for (const x of b) {} for (const k in b) {} while (a) {} do {} while (a);
    switch (a) { case 1: break; case 2: break; default: }
    try {} catch (e) {}
    a ||= b;
    return b?.c;
  }`;
  // default 1 + if 1 + ?: 1 + && || ?? 3 + loops 5 + cases 2 + catch 1 + ||= 1 + ?. 1 = 16, plus 1
  assert.equal(only(code).complexity, 17);
});

test('complexity: a function inside another counts for itself, not for the outer one', () => {
  const [outer, inner] = analyzeCode('function outer(a) { return a.map((x) => (x ? 1 : 2)); }');
  assert.equal(outer.complexity, 1);
  assert.equal(inner.complexity, 2);
});

test('names: methods with their class, properties, variables and assignments', () => {
  const names = analyzeCode(`
    class Box { open() {} get size() { return 1; } static make() {} }
    const helpers = { tidy() {}, sort: (a) => a };
    const add = (a, b) => a + b;
    FN.thing = function () {};
    (function () {})();
  `).map((f) => f.name);
  assert.deepEqual(names, ['Box.open', 'Box.size', 'Box.make', 'tidy', 'sort', 'add', 'thing', '(anonymous)']);
});

test('points: statements and the arms of every branch, each once', () => {
  const code = 'function f(a, b) {\n  if (a) return 1;\n  return a && b;\n}';
  const fn = only(code);
  const at = (text) => code.indexOf(text);
  assert.deepEqual(fn.points.sort((x, y) => x - y), [at('if'), at('return 1'), at('return a'), at('b;')]);
});

test('ran: the smallest V8 range around a point decides', () => {
  const fn = { start: 0, end: 100 };
  const ranges = [{ start: 0, end: 100, count: 3 }, { start: 40, end: 60, count: 0 }];
  assert.equal(ran(10, fn, ranges), true);
  assert.equal(ran(50, fn, ranges), false);
  assert.equal(ran(60, fn, ranges), true);
});

test('ran: a function V8 never compiled never ran, even inside code that did', () => {
  const inner = { start: 30, end: 50 };
  assert.equal(ran(35, inner, [{ start: 0, end: 100, count: 1 }]), false);
});

test('ran: a method that V8 starts at its name, before the parser does, still counts', () => {
  const code = 'class A { get lines() { return 1; } }';
  const fn = only(code);
  const body = code.indexOf('return');
  assert.equal(ran(body, fn, [{ start: 0, end: code.length, count: 1 }, { start: code.indexOf('get'), end: code.length - 2, count: 4 }]), true);
});

test('readBlocks: finds every data-module block, knows the testable ones and the line their code starts on', () => {
  const html = '<p>\n<script data-module="a" data-testable>\nconst x = 1;\n</script>\n<script data-module="b">\nlet y;\n</script>';
  assert.deepEqual(readBlocks(html), [
    { name: 'a', testable: true, code: 'const x = 1;', line: 3 },
    { name: 'b', testable: false, code: 'let y;', line: 6 },
  ]);
});
