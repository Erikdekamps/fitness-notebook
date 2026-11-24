/**
 * The mutants that survived the last mutation run (reports/mutation/mutation.json).
 *
 *   node tests/mutation/survivors.js [block]   # list them, grouped by block, with the code they changed
 *   node tests/mutation/survivors.js --check   # fail on any survivor that is not in known-survivors.json
 *
 * Some mutants cannot be killed: the change makes no difference anyone could see (an "equivalent mutant").
 * Those are listed in known-survivors.json, each with the reason. A mutant is known by its block, its kind,
 * and the code before and after, never by its line, so the list survives edits elsewhere in index.html.
 */
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(new URL('../../reports/mutation/mutation.json', import.meta.url), 'utf8'));
const known = JSON.parse(readFileSync(new URL('./known-survivors.json', import.meta.url), 'utf8'));
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

const flat = (text) => String(text).replace(/\s+/g, ' ').trim();

/** The code a mutant replaced, from its start to its end. */
function originalOf({ start, end }) {
  if (start.line === end.line) return lines[start.line - 1].slice(start.column - 1, end.column - 1);
  const middle = lines.slice(start.line, end.line - 1);
  return [lines[start.line - 1].slice(start.column - 1), ...middle, lines[end.line - 1].slice(0, end.column - 1)].join('\n');
}

const survivors = file.mutants
  .filter((m) => m.status === 'Survived' || m.status === 'NoCoverage')
  .map((m) => ({
    block: blockAt[m.location.start.line],
    line: m.location.start.line,
    noCoverage: m.status === 'NoCoverage',
    mutator: m.mutatorName,
    original: flat(originalOf(m.location)),
    replacement: flat(m.replacement),
  }));

const sameMutant = (a, b) => a.block === b.block && a.mutator === b.mutator && a.original === b.original && a.replacement === b.replacement;
const isKnown = (s) => known.some((k) => sameMutant(k, s));

if (process.argv[2] === '--check') {
  const unknown = survivors.filter((s) => !isKnown(s));
  const gone = known.filter((k) => !survivors.some((s) => sameMutant(k, s)));
  for (const s of unknown) console.log(`NEW SURVIVOR  ${s.block} line ${s.line}  ${s.mutator}: ${s.original.slice(0, 80)}  →  ${s.replacement.slice(0, 80)}`);
  for (const k of gone) console.log(`no longer survives (take it out of known-survivors.json): ${k.block} ${k.mutator}: ${k.original.slice(0, 60)}`);
  if (unknown.length) {
    console.log(`\nFAIL: ${unknown.length} mutant(s) survived that no test noticed. Add a test that tells them apart,`);
    console.log('or, when no test ever could, add them to tests/mutation/known-survivors.json with the reason.');
    process.exitCode = 1;
  } else {
    console.log(`OK: every surviving mutant (${survivors.length}) is a known one that makes no difference.`);
  }
} else {
  const only = process.argv[2];
  const shown = survivors.filter((s) => !only || s.block === only);
  let current = null;
  for (const s of shown) {
    if (s.block !== current) console.log(`\n== ${(current = s.block)}`);
    const tag = isKnown(s) ? '[known] ' : s.noCoverage ? '[no test runs it] ' : '';
    console.log(`  ${s.line}  ${tag}${s.mutator}: ${s.original.slice(0, 70)}  →  ${s.replacement.slice(0, 70)}`);
  }
  if (!shown.length) console.log('No surviving mutants.');
}
