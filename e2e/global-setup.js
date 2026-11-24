/** Before a browser test run: throw away the coverage of the run before, so the CRAP check reads only this one. */
import { rmSync } from 'node:fs';
import { COVERAGE_DIR } from './fixtures.js';

export default function globalSetup() {
  rmSync(COVERAGE_DIR, { recursive: true, force: true });
}
