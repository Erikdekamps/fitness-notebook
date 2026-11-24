/**
 * The CRAP score of every function in index.html, and a check that none is too high.
 *
 *   npm run test:crap                 # runs the unit tests with coverage, then scores
 *   node tests/crap/crap.js --top 30  # show more rows
 *
 * CRAP (Change Risk Anti-Patterns) = complexity² × (1 − coverage)³ + complexity
 *
 *   complexity  cyclomatic complexity: 1 + every if, ?:, &&, ||, ??, loop, case, catch,
 *               default value and ?. in the function itself (not in functions inside it)
 *   coverage    the share of the function's own statements and branches that some test ran (0 to 1).
 *               A branch is each arm of an if or ?:, the right side of &&, || and ??, and a loop body.
 *
 * A simple function scores low even when no test runs it. A complex function only scores low
 * when tests run nearly all of it. Over MAX_CRAP fails: split the function, or test it.
 *
 * Coverage comes from two levels, and a statement counts as run when either ran it:
 *   unit tests     V8 coverage of `node --test` (always collected here)
 *   browser tests  V8 coverage that e2e/ writes to reports/coverage/e2e/ (when you ran them first)
 * Without browser coverage, the blocks that draw the page are left out of the check.
 *
 * Writes reports/crap/crap.json.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

export const MAX_CRAP = 30;

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const E2E_COVERAGE = join(ROOT, 'reports/coverage/e2e');
const REPORT = join(ROOT, 'reports/crap/crap.json');

/* ---- The blocks of index.html ---- */

/** Every <script data-module> block: { name, testable, code, line } where line is index.html's line of the code's first line. */
export function readBlocks(html) {
  return [...html.matchAll(/<script data-module="([^"]+)"( data-testable)?>\n([\s\S]*?)\n<\/script>/g)].map((m) => {
    const codeStart = m.index + m[0].indexOf('\n') + 1;
    return { name: m[1], testable: !!m[2], code: m[3], line: html.slice(0, codeStart).split('\n').length };
  });
}

/* ---- Complexity and statements, from the code ---- */

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/** How many ways a node splits the path through its function. */
function decisions(node) {
  switch (node.type) {
    case 'IfStatement':
    case 'ConditionalExpression':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'CatchClause':
    case 'AssignmentPattern': // a default value
      return 1;
    case 'SwitchCase':
      return node.test ? 1 : 0;
    case 'LogicalExpression':
      return 1;
    case 'AssignmentExpression':
      return ['&&=', '||=', '??='].includes(node.operator) ? 1 : 0;
    case 'MemberExpression':
    case 'CallExpression':
      return node.optional ? 1 : 0;
    default:
      return 0;
  }
}

const isStatement = (node) => /(Statement|Declaration)$/.test(node.type) && node.type !== 'BlockStatement';

/** Where the arms of a branching node start: each must run for the function to count as fully run. */
function branchArms(node) {
  switch (node.type) {
    case 'IfStatement':
    case 'ConditionalExpression':
      return [node.consequent, node.alternate];
    case 'LogicalExpression':
      return [node.right];
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
      return [node.body];
    case 'SwitchCase':
      return node.consequent.slice(0, 1);
    case 'CatchClause':
      return [node.body];
    default:
      return [];
  }
}

/** The name a function is known by: the method, variable, property or assignment it belongs to. */
function nameOf(fn, parent, owner) {
  const key = (k) => (k.type === 'Identifier' ? k.name : k.type === 'Literal' ? String(k.value) : '[computed]');
  if (fn.id) return fn.id.name;
  if (parent) {
    if (parent.type === 'MethodDefinition') return (owner ? owner + '.' : '') + key(parent.key);
    if (parent.type === 'Property') return key(parent.key);
    if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name;
    if (parent.type === 'AssignmentExpression' && parent.left.type === 'MemberExpression') return key(parent.left.property);
  }
  return null;
}

/**
 * Every function in a block's code, with its complexity and the points a test should run: its own statements and branch arms.
 * Returns [{ name, start, end, line, complexity, points: [offset] }]. Offsets are into `code`.
 */
export function analyzeCode(code) {
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const functions = [];

  function visit(node, parent, current, className) {
    if (!node || typeof node.type !== 'string') return;
    let fn = current;
    if (FUNCTION_TYPES.has(node.type)) {
      const name = nameOf(node, parent, className);
      // V8 starts a method at its name or at a word before it (get, set, static), never at its "(".
      const isMethod = parent && (parent.type === 'MethodDefinition' || (parent.type === 'Property' && (parent.method || parent.kind !== 'init')));
      const start = isMethod ? parent.start : node.start;
      fn = { name: name || `(anonymous)`, start, end: node.end, line: node.loc.start.line, complexity: 1, points: [] };
      functions.push(fn);
      if (node.type === 'ArrowFunctionExpression' && node.expression) fn.points.push(node.body.start);
    } else if (fn) {
      fn.complexity += decisions(node);
      if (isStatement(node)) fn.points.push(node.start);
      for (const arm of branchArms(node)) if (arm) fn.points.push(arm.start);
    }
    const inClass = node.type === 'ClassDeclaration' || node.type === 'ClassExpression' ? (node.id ? node.id.name : className) : className;
    for (const [field, value] of Object.entries(node)) {
      if (field === 'loc') continue;
      if (Array.isArray(value)) value.forEach((child) => visit(child, node, fn, inClass));
      else if (value && typeof value.type === 'string') visit(value, node, fn, inClass);
    }
  }

  visit(ast, null, null, null);
  // A function with no statements of its own (`() => {}`) is run when its body is.
  for (const fn of functions) {
    if (!fn.points.length) fn.points.push(fn.start);
    fn.points = [...new Set(fn.points)]; // an arm that is a statement counts once
  }
  return functions;
}

/* ---- Coverage ---- */

/**
 * Which offsets of a block ran, from V8 coverage of a script holding that block's code.
 * `delta`: where the block's code starts in the script. Returns ranges [{ start, end, count }] in code offsets.
 */
function rangesOf(script, delta) {
  return script.functions.flatMap((f) => f.ranges.map((r) => ({ start: r.startOffset - delta, end: r.endOffset - delta, count: r.count })));
}

/**
 * Whether the code at `offset` ran, given the V8 ranges of one run of the block.
 * The smallest range around the offset decides. When that range starts before the function itself,
 * V8 never saw the function: it was never compiled, so it never ran.
 */
export function ran(offset, fn, ranges) {
  let best = null;
  for (const r of ranges) {
    if (r.start <= offset && offset < r.end && (!best || r.end - r.start < best.end - best.start)) best = r;
  }
  return !!best && best.start >= fn.start && best.count > 0;
}

/** V8 coverage files in a folder, as one list of scripts: [{ url, source?, functions }]. */
function readCoverage(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      return Array.isArray(data) ? data : data.result || [];
    });
}

/**
 * Per block name, one list of ranges per run of that block: every test process (unit) and every page (browser)
 * runs the block anew. Unit runs are known by url, browser runs by their source text.
 */
function blockRuns(blocks, unitScripts, e2eScripts) {
  const byName = new Map(blocks.map((b) => [b.name, []]));
  for (const script of unitScripts) {
    const m = script.url.match(/^index\.html <script data-module="([^"]+)">$/);
    if (m && byName.has(m[1])) byName.get(m[1]).push(rangesOf(script, 0));
  }
  for (const script of e2eScripts) {
    if (!script.source) continue;
    for (const block of blocks) {
      const delta = script.source.indexOf(block.code);
      if (delta !== -1) byName.get(block.name).push(rangesOf(script, delta));
    }
  }
  return byName;
}

export const crap = (complexity, coverage) => complexity ** 2 * (1 - coverage) ** 3 + complexity;

/* ---- Run ---- */

function unitCoverage() {
  const dir = mkdtempSync(join(tmpdir(), 'fn-coverage-'));
  try {
    const run = spawnSync(process.execPath, ['--test', 'tests/*.test.js'], { cwd: ROOT, env: { ...process.env, NODE_V8_COVERAGE: dir }, encoding: 'utf8' });
    if (run.status !== 0) {
      process.stdout.write(run.stdout + run.stderr);
      throw new Error('The unit tests failed, so there is no CRAP score.');
    }
    return readCoverage(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  const top = Number(args[args.indexOf('--top') + 1]) || 15;
  const blocks = readBlocks(readFileSync(join(ROOT, 'index.html'), 'utf8'));
  const e2eScripts = readCoverage(E2E_COVERAGE);
  const withBrowser = e2eScripts.length > 0;
  const runs = blockRuns(blocks, unitCoverage(), e2eScripts);

  const rows = [];
  for (const block of blocks) {
    if (!block.testable && !withBrowser) continue;
    const blockRuns = runs.get(block.name);
    for (const fn of analyzeCode(block.code)) {
      const runCount = fn.points.filter((p) => blockRuns.some((ranges) => ran(p, fn, ranges))).length;
      const coverage = runCount / fn.points.length;
      rows.push({
        block: block.name,
        name: fn.name,
        line: block.line + fn.line - 1,
        complexity: fn.complexity,
        coverage: Math.round(coverage * 1000) / 1000,
        crap: Math.round(crap(fn.complexity, coverage) * 10) / 10,
      });
    }
  }
  rows.sort((a, b) => b.crap - a.crap || b.complexity - a.complexity);

  const failing = rows.filter((r) => r.crap > MAX_CRAP);
  mkdirSync(join(ROOT, 'reports/crap'), { recursive: true });
  writeFileSync(REPORT, JSON.stringify({ maxCrap: MAX_CRAP, browserCoverage: withBrowser, functions: rows }, null, 2));

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`CRAP per function (max ${MAX_CRAP}). Coverage from unit tests${withBrowser ? ' and browser tests' : ' only; page blocks left out'}.\n`);
  console.log(`${pad('CRAP', 7)}${pad('cx', 4)}${pad('cov', 6)}${pad('line', 6)}function`);
  for (const r of rows.slice(0, Math.max(top, failing.length))) {
    console.log(`${pad(r.crap, 7)}${pad(r.complexity, 4)}${pad(Math.round(r.coverage * 100) + '%', 6)}${pad(r.line, 6)}${r.block}: ${r.name}`);
  }
  console.log(`\n${rows.length} functions, report in reports/crap/crap.json`);
  if (failing.length) {
    console.log(`\nFAIL: ${failing.length} function(s) over ${MAX_CRAP}. Split them, or test them.`);
    process.exitCode = 1;
  } else {
    console.log(`\nOK: no function over ${MAX_CRAP}.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
