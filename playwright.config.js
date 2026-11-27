/**
 * Browser tests: the app in a real Chromium, used the way a person uses it.
 *
 *   npm run test:e2e
 *
 * Four projects: Chrome and Safari (WebKit) on a desktop with mouse and keyboard,
 * and on an iPhone 13 screen with touch: once in Chrome, once in Safari.
 * The Chrome one gets real touch events (the page scrolls under a finger) and records coverage.
 * In Chromium each test also records which code ran, for the CRAP check (tests/crap/crap.js).
 * Tests of a rule of the app, not of a browser, run in desktop Chrome only.
 */
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;
// Tests of a rule of the app (tagged RULES in tests/e2e/fixtures.js) run in desktop Chrome only:
// a rule works the same in every browser.
const RULES_ONLY = /@rules/;
const PORT = Number(process.env.E2E_PORT) || 4173; // another port lets two checkouts run their tests at once

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  globalSetup: './tests/e2e/global-setup.js',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  failOnFlakyTests: CI, // a test that only passes on its second try is a broken test
  workers: CI ? 2 : undefined,
  outputDir: 'test-results',
  reporter: CI
    ? [['github'], ['list'], ['html', { open: 'never', outputFolder: 'reports/e2e' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'reports/e2e' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    timezoneId: 'Europe/Amsterdam',
    locale: 'nl-NL',
  },
  webServer: {
    command: 'node tests/e2e/server.js',
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !CI,
    env: { PORT: String(PORT) },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone-chrome', grepInvert: RULES_ONLY, use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'safari', grepInvert: RULES_ONLY, use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', grepInvert: RULES_ONLY, use: { ...devices['iPhone 13'] } },
  ],
});
