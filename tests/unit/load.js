/**
 * Lets the unit tests use the app's logic straight from index.html.
 *
 * index.html marks the script blocks that never touch the page with `data-testable`.
 * This runs those blocks once, in page order, and hands back what a block made:
 *
 *   const { analyzeLines } = load('notebook');
 */
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';

const PAGE = new URL('../../index.html', import.meta.url);
const BLOCK = /<script data-module="([^"]+)" data-testable>\n([\s\S]*?)\n<\/script>/g;

let loaded = false;

function runTestableBlocks() {
  const html = readFileSync(PAGE, 'utf8');
  const blocks = [...html.matchAll(BLOCK)];
  if (!blocks.length) throw new Error('index.html has no <script data-testable> blocks');
  for (const [, name, code] of blocks) {
    // Same realm as the tests, so arrays and objects compare as equal.
    runInThisContext(code, { filename: `index.html <script data-module="${name}">` });
  }
  loaded = true;
}

/** What the block named `name` added to the shared FN object. */
export function load(name) {
  if (!loaded) runTestableBlocks();
  const made = globalThis.FN[name];
  if (!made) throw new Error(`index.html has no testable block called "${name}"`);
  return made;
}
