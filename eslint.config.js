/**
 * Lint: mistakes a test might not run into, such as a name that does not exist or a variable nobody uses.
 *
 *   npm run lint
 *
 * index.html: every <script> block is checked on its own (eslint-plugin-html), as a classic script in a browser.
 * The blocks share one global, FN. Tests and tools are Node modules.
 */
import js from '@eslint/js';
import globals from 'globals';
import html from 'eslint-plugin-html';

const rules = {
  ...js.configs.recommended.rules,
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true }],
  eqeqeq: 'error',
  'no-var': 'error',
  'prefer-const': 'error',
};

export default [
  { ignores: ['node_modules/', 'reports/', 'test-results/', '.stryker-tmp/', 'playwright-report/'] },
  {
    files: ['index.html'],
    plugins: { html },
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
    settings: { 'html/javascript-mime-types': ['text/javascript'] },
    rules,
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
    rules,
  },
  {
    // Code inside page.evaluate() and addInitScript() runs in the browser.
    files: ['tests/e2e/**/*.js', 'tools/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
