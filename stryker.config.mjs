/**
 * Mutation testing with Stryker: it makes small changes ("mutants") to the app's logic,
 * such as `<` into `<=` or `&&` into `||`, and runs the unit tests against each one.
 * A test that fails kills the mutant. A mutant that survives is a change no test noticed.
 *
 *   npm run test:mutation     # report in reports/mutation/index.html, then the check below
 *
 * The run fails under 95%. Then tests/mutation/survivors.js --check fails on any survivor that is not
 * in tests/mutation/known-survivors.json: the few that can make no difference, each with its reason.
 *
 * Only the logic is mutated: the <script data-testable> blocks of index.html, the same blocks
 * the unit tests load. tests/mutation/ignore-page-blocks.js skips the blocks that draw the page;
 * the browser tests (tests/e2e/) check those.
 */
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'tap',
  tap: { testFiles: ['tests/unit/*.test.js'] },
  mutate: ['index.html'],
  plugins: ['@stryker-mutator/*', './tests/mutation/ignore-page-blocks.js'],
  ignorers: ['page-blocks'],
  ignoreStatic: true,
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  thresholds: { high: 98, low: 95, break: 95 },
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
};
