/** The notebook is kept in the browser, and moves between browsers as a backup: a file, or pasted text. */
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { EXAMPLE_LAST_DAY, actionButton, addLine, backTo, lastDay, openApp, openSettings, sheet, startDate } from './app.js';

const MY_DAY = ['Bike 15 min', 'Fly'];

/** Writes a day of its own, so a notebook can be told apart from the example one. */
async function writeMyDay(page) {
  await startDate(page);
  await addLine(page, { text: 'Bike 15 min' });
  await addLine(page, { machine: 'Fly', kg: '20', reps: '10' });
  expect(await lastDay(page)).toEqual(MY_DAY);
}

/** Exports from settings and returns the saved file's path. */
async function exportBackup(page, testInfo) {
  await openSettings(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'export to a file' }).click()]);
  expect(download.suggestedFilename()).toBe('fitness-notebook-2026-11-23.json');
  const path = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(path);
  return path;
}

test('the notebook is still there after a reload', async ({ page }) => {
  await openApp(page);
  await writeMyDay(page);
  await page.reload();
  await expect.poll(() => lastDay(page)).toEqual(MY_DAY);
});

test('export to a file, import it in another browser: the same notebook', async ({ page, browser, watched }, testInfo) => {
  await openApp(page);
  await writeMyDay(page);
  const file = await exportBackup(page, testInfo);
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  expect(backup.version).toBe(1);
  expect(backup.lines.slice(-2).map((l) => l.text || l.name)).toEqual(MY_DAY);

  const other = await watched(await browser.newPage()); // a browser of its own: its own storage
  await other.goto('/index.html');
  expect(await lastDay(other)).toEqual(EXAMPLE_LAST_DAY);
  await openSettings(other);
  await other.locator('#importFile').setInputFiles(file);
  await expect(other.locator('#sheetInfo')).toContainText('fitness-notebook-2026-11-23.json');
  await expect(actionButton(other)).toHaveText('Replace my notebook');
  await actionButton(other).click();
  await backTo(other, 'notebook');
  await expect.poll(() => lastDay(other)).toEqual(MY_DAY);
});

test('Undo after an import brings the old notebook back', async ({ page }, testInfo) => {
  await openApp(page);
  await writeMyDay(page);
  const file = await exportBackup(page, testInfo);
  await page.evaluate(() => localStorage.clear());
  await openApp(page);

  await openSettings(page);
  await page.locator('#importFile').setInputFiles(file);
  await actionButton(page).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await backTo(page, 'notebook');
  await expect.poll(() => lastDay(page)).toEqual(EXAMPLE_LAST_DAY);
});

test('import from pasted text', async ({ page }, testInfo) => {
  await openApp(page);
  await writeMyDay(page);
  const text = readFileSync(await exportBackup(page, testInfo), 'utf8');
  await page.evaluate(() => localStorage.clear());
  await openApp(page);

  await openSettings(page);
  await page.getByRole('button', { name: 'import from text' }).click();
  await page.getByRole('textbox', { name: 'Text of a backup' }).fill(text);
  await actionButton(page).click(); // Check the text
  await expect(actionButton(page)).toHaveText('Replace my notebook');
  await actionButton(page).click();
  await backTo(page, 'notebook');
  await expect.poll(() => lastDay(page)).toEqual(MY_DAY);
});

test('text that is not a backup: the panel says so, keeps the text and changes nothing', async ({ page }) => {
  await openApp(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'import from text' }).click();
  const area = page.getByRole('textbox', { name: 'Text of a backup' });
  await area.fill('my shopping list');
  await actionButton(page).click();
  await expect(page.locator('#sheetError')).toBeVisible();
  await expect(area).toHaveValue('my shopping list');
  await expect(sheet(page)).toHaveClass(/is-open/);

  await page.keyboard.press('Escape');
  await backTo(page, 'notebook');
  expect(await lastDay(page)).toEqual(EXAMPLE_LAST_DAY);
});

test('two tabs: a change in one shows up in the other', async ({ page, newTab }) => {
  await openApp(page);
  const other = await newTab();
  await other.goto('/index.html');
  await writeMyDay(page);
  await expect.poll(() => lastDay(other)).toEqual(MY_DAY);

  // Settings too: the timer turned off in one tab is off in the other.
  await openSettings(other);
  await openSettings(page);
  await page.getByRole('switch', { name: /timer after each set/ }).click();
  await expect(other.getByRole('switch', { name: /timer after each set/ })).toHaveAttribute('aria-checked', 'false');
});

/* ---- Pasting without the keyboard ---- */

/** Opens the "import from text" panel. */
async function openImportText(page) {
  await openApp(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'import from text' }).click();
  await expect(sheet(page)).toHaveClass(/is-open/);
}

test('import from text has a Paste from clipboard button, so no keyboard is needed', async ({ page }) => {
  await openImportText(page);
  await expect(page.getByRole('button', { name: 'Paste from clipboard' })).toBeVisible();
});

test.describe('the clipboard', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'only Chromium lets a test give clipboard permission');

  test('Paste from clipboard fills the field; the backup then imports', async ({ page, browser, watched }, testInfo) => {
    await openApp(page);
    await writeMyDay(page);
    const text = readFileSync(await exportBackup(page, testInfo), 'utf8');

    const fresh = await browser.newContext({ ...testInfo.project.use, permissions: ['clipboard-read', 'clipboard-write'] });
    const other = await watched(await fresh.newPage());
    await openImportText(other);
    await other.evaluate((t) => navigator.clipboard.writeText(t), text);
    await other.getByRole('button', { name: 'Paste from clipboard' }).click();
    await expect(other.getByRole('textbox', { name: 'Text of a backup' })).toHaveValue(text);

    await actionButton(other).click(); // Check the text
    await actionButton(other).click(); // Replace my notebook
    await backTo(other, 'notebook');
    await expect.poll(() => lastDay(other)).toEqual(MY_DAY);
  });

  test('a clipboard the browser will not read: the panel says what to do instead', async ({ page }) => {
    await openImportText(page); // no permission given
    await page.getByRole('button', { name: 'Paste from clipboard' }).click();
    await expect(page.locator('#sheetError')).toHaveText('The clipboard could not be read. Hold the field and choose Paste.');
    await expect(sheet(page)).toHaveClass(/is-open/);
  });
});
