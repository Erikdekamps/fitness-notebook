/**
 * Lists the mutants that survived the last mutation run, grouped by block, with the code they changed.
 *
 *   npm run mutation && node tests/mutation/survivors.js [block]
 *
 * Reads reports/mutation/mutation.json. Lines are counted in index.html.
 */
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(new URL('../../reports/mutation/mutation.json', import.meta.url), 'utf8'));
const only = process.argv[2];
const file = report.files['index.html'];
const lines = file.source.split('\n');

// The block each line of index.html is in.
const blockAt = [];
let block = null;
lines.forEach((line, i) => {
  const open = line.match(/<script data-module="([^"]+)"/);
  if (open) block = open[1];
  blockAt[i + 1] = block;
  if (line.startsWith('</script>')) block = null;
});

const left = file.mutants.filter((m) => m.status === 'Survived' || m.status === 'NoCoverage');
const byBlock = new Map();
for (const m of left) {
  const name = blockAt[m.location.start.line];
  if (only && name !== only) continue;
  if (!byBlock.has(name)) byBlock.set(name, []);
  byBlock.get(name).push(m);
}
for (const [name, mutants] of byBlock) {
  console.log(`\n== ${name}: ${mutants.length}`);
  for (const m of mutants.sort((a, b) => a.location.start.line - b.location.start.line)) {
    const { start, end } = m.location;
    const original = start.line === end.line ? lines[start.line - 1].slice(start.column - 1, end.column - 1) : lines[start.line - 1].slice(start.column - 1) + ' …';
    console.log(`  ${start.line}  ${m.status === 'NoCoverage' ? '[no test runs it] ' : ''}${m.mutatorName}: ${original.trim().slice(0, 70)}  →  ${String(m.replacement).replace(/\s+/g, ' ').slice(0, 70)}`);
  }
}
if (!byBlock.size) console.log('No surviving mutants.');
