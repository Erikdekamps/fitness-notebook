/**
 * Browser tests: the app in a real Chromium, used the way a person uses it.
 *
 *   npm run test:e2e
 *
 * Four projects: Chrome and Safari (WebKit) on a desktop with mouse and keyboard,
 * and on a phone with touch (Pixel 7, iPhone 13).
 * In Chromium each test also records which code ran, for the CRAP check (tests/crap/crap.js).
 */
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.js',
  globalSetup: './e2e/global-setup.js',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  outputDir: 'test-results',
  // Baselines for e2e/screenshots.spec.js: one picture per screen per project, taken on Linux.
  snapshotPathTemplate: '{testDir}/screenshots/{arg}-{projectName}{ext}',
  expect: {
    // A few pixels may differ (anti-aliasing); a changed look differs far more than this.
    // threshold: how different a pixel's colour may be before it counts as changed (0 to 1; the default 0.2 lets a
    // slightly other paper colour through).
    toHaveScreenshot: { threshold: 0.02, maxDiffPixelRatio: 0.005, animations: 'disabled', caret: 'hide' },
  },
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
    command: 'node e2e/server.js',
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !CI,
    env: { PORT: String(PORT) },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'safari', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
});
