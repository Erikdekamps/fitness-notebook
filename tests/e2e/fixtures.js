/**
 * What every browser test gets, for `page` and for each tab it opens with `newTab()`:
 *   - a fixed "today", 23 November 2026 (Monday), with a clock that still runs, so the example notebook
 *     always looks the same and the rest timer can be fast-forwarded
 *   - a failure when a page throws or logs an error, even when the test itself passed
 *   - in Chromium, the code that ran, written to reports/coverage/e2e/ for the CRAP check. A page that loads
 *     again (page.reload, or page.goto once more) keeps what it ran before: Chromium forgets it on a new load
 *
 * Open extra tabs with `newTab()`, not `context.newPage()`, and leave them open: they are checked
 * and their coverage is read when the test ends.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';

export const COVERAGE_DIR = fileURLToPath(new URL('../../reports/coverage/e2e/', import.meta.url));
export const TODAY = new Date('2026-11-23T10:00:00');

/**
 * For a test of a rule of the app, not of how a browser behaves: `test('...', RULES, async ...)`.
 * A rule works the same in every browser, so these run in desktop Chrome only (playwright.config.js).
 */
export const RULES = { tag: '@rules' };

/**
 * @typedef {import('@playwright/test').Page} Page
 * @typedef {{ watched: (page: Page) => Promise<Page>, newTab: () => Promise<Page> }} OwnFixtures
 * @typedef {import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions} TestArgs
 * @typedef {import('@playwright/test').PlaywrightWorkerArgs & import('@playwright/test').PlaywrightWorkerOptions} WorkerArgs
 */

/** @type {import('@playwright/test').TestType<TestArgs & OwnFixtures, WorkerArgs>} */
export const test = base.extend(/** @type {any} */ ({
  /** Every page this test watches, with the errors each one had. */
  watched: async ({ browserName }, use, testInfo) => {
    const tabs = [];
    const coverage = browserName === 'chromium';
    /** What a tab ran of the app's code so far. Counting stops. */
    const takeCoverage = async (page) => (await page.coverage.stopJSCoverage()).filter((e) => e.url.endsWith('/index.html'));
    /** Keeps what a tab ran so far, before the tab loads the page again and Chromium forgets it. */
    const keepCoverage = async (tab) => {
      tab.kept.push(...(await takeCoverage(tab.page)));
      await tab.page.coverage.startJSCoverage({ resetOnNavigation: false });
    };
    const watch = async (page) => {
      const tab = { page, errors: [], kept: [] };
      page.on('pageerror', (e) => tab.errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') tab.errors.push(m.text()); });
      await page.clock.install({ time: TODAY });
      if (coverage) {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
        const goto = page.goto.bind(page);
        const reload = page.reload.bind(page);
        page.goto = async (url, options) => { await keepCoverage(tab); return goto(url, options); };
        page.reload = async (options) => { await keepCoverage(tab); return reload(options); };
      }
      tabs.push(tab);
      return page;
    };

    await use(watch);

    const entries = [];
    for (const { page, kept } of tabs) {
      if (coverage) entries.push(...kept, ...(page.isClosed() ? [] : await takeCoverage(page)));
    }
    if (entries.length) {
      mkdirSync(COVERAGE_DIR, { recursive: true });
      writeFileSync(join(COVERAGE_DIR, `${testInfo.project.name}-${testInfo.testId}-${testInfo.retry}.json`), JSON.stringify(entries));
    }
    expect(tabs.flatMap((t) => t.errors), 'errors on the page').toEqual([]);
  },

  page: async ({ page, watched }, use) => {
    await use(await watched(page));
  },

  /** Opens another tab in the same browser, set up like `page`. */
  newTab: async ({ context, watched }, use) => {
    await use(async () => watched(await context.newPage()));
  },
}));

export { expect };
