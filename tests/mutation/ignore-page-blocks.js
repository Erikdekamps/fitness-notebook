/**
 * A Stryker plugin: only the logic in index.html gets mutated.
 *
 * Every <script> block of index.html is its own program to Stryker, and Stryker counts lines
 * inside each block, so line ranges cannot pick out the logic. This skips every block that is not
 * marked `data-testable`. A block is known by the name it adds to the shared FN object:
 * `FN.notebook = { Notebook }` belongs to <script data-module="notebook">.
 *
 * The blocks that draw the page are skipped here because the browser tests (e2e/) check them.
 */
import { readFileSync } from 'node:fs';
import { declareValuePlugin, PluginKind } from '@stryker-mutator/api/plugin';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const TESTABLE = new Set([...html.matchAll(/<script data-module="([^"]+)" data-testable>/g)].map((m) => m[1]));
if (!TESTABLE.size) throw new Error('index.html has no <script data-testable> blocks');

/** The name a block adds to FN, such as "notebook" for `FN.notebook = ...`; null when it adds none. */
function moduleName(program) {
  for (const statement of program.node.body) {
    const call = statement.type === 'ExpressionStatement' ? statement.expression : null;
    const fn = call && call.type === 'CallExpression' ? call.callee : null;
    if (!fn || fn.type !== 'FunctionExpression') continue;
    for (const inner of fn.body.body) {
      const e = inner.type === 'ExpressionStatement' ? inner.expression : null;
      const target = e && e.type === 'AssignmentExpression' ? e.left : null;
      if (target && target.type === 'MemberExpression' && target.object.name === 'FN') return target.property.name;
    }
  }
  return null;
}

const pageBlocks = {
  shouldIgnore(path) {
    if (!path.isProgram()) return undefined;
    const name = moduleName(path);
    return name && TESTABLE.has(name) ? undefined : `draws the page (block "${name ?? 'no name'}"): checked by the browser tests`;
  },
};

export const strykerPlugins = [declareValuePlugin(PluginKind.Ignore, 'page-blocks', pageBlocks)];
