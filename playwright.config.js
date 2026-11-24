/**
 * Browser tests: the app in a real Chromium, used the way a person uses it.
 *
 *   npm run test:e2e
 *
 * Two projects: a desktop browser (mouse and keyboard) and a phone (touch, Pixel 7 screen).
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
  ],
});
