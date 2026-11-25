/**
 * What every browser test gets, for `page` and for each tab it opens with `newTab()`:
 *   - a fixed "today", 23 November 2026 (Monday), with a clock that still runs, so the example notebook
 *     always looks the same and the rest timer can be fast-forwarded
 *   - a failure when a page throws or logs an error, even when the test itself passed
 *   - in Chromium, the code that ran, written to reports/coverage/e2e/ for the CRAP check
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

export const test = base.extend({
  /** Every page this test watches, with the errors each one had. */
  watched: async ({ browserName }, use, testInfo) => {
    const tabs = [];
    const coverage = browserName === 'chromium';
    const watch = async (page) => {
      const tab = { page, errors: [] };
      page.on('pageerror', (e) => tab.errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') tab.errors.push(m.text()); });
      await page.clock.install({ time: TODAY });
      if (coverage) await page.coverage.startJSCoverage({ resetOnNavigation: false });
      tabs.push(tab);
      return page;
    };

    await use(watch);

    const entries = [];
    for (const { page } of tabs) {
      if (coverage && !page.isClosed()) entries.push(...(await page.coverage.stopJSCoverage()).filter((e) => e.url.endsWith('/index.html')));
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
});

export { expect };
