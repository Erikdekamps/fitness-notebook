/**
 * Writes the script blocks of index.html to reports/types/index.js, so the type check can read them.
 * Every line keeps its line number: what is not script becomes an empty line. So an error at
 * reports/types/index.js(1526,19) is at line 1526 of index.html.
 *
 *   npm run types     # this, then the type check of the app (tests/types/jsconfig.json) and of the tests and tools
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const lines = readFileSync(new URL('index.html', ROOT), 'utf8').split('\n');

let inScript = false;
const code = lines.map((line) => {
  if (line.startsWith('<script')) {
    inScript = true;
    return '';
  }
  if (line.startsWith('</script>')) inScript = false;
  return inScript ? line : '';
});

mkdirSync(new URL('reports/types/', ROOT), { recursive: true });
writeFileSync(new URL('reports/types/index.js', ROOT), code.join('\n'));
