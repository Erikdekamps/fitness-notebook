# Fitness Notebook

A fitness log that looks and feels like a paper notebook. The whole app is one page, `index.html`, plus its handwriting font in `fonts/`. No build step and no dependencies: the packages in `package.json` are only for testing. Your notebook is saved in the browser you open it in.

## Use it

Open `index.html` in a browser, or the GitHub Pages site once that is switched on. Keep the `fonts/` folder next to it; without the font file the page still works, in another handwriting font.

## Change it

Edit `index.html`. What you edit is what runs.

```sh
npm test    # the unit tests: Node 22, nothing to install
```

See [Testing](#testing) for the rest.

## How index.html is laid out

1. `<style>`: all styles, in numbered sections. The font is loaded from `fonts/caveat-latin.woff2`.
2. `<body>`: the markup of the screens.
3. The script, split into blocks with one job each. Every block adds one object to a shared `FN` object and takes what it needs from blocks above it, so the order matters.

| Block | Job | Unit tested |
| --- | --- | --- |
| **Logic** | | |
| `util` | small pure helpers | yes |
| `config` | every fixed value | yes |
| `calendar` | dates, weeks and months as "YYYY-MM-DD" | yes |
| `progress` | marks (↑ or –N), machine history, wheel values, the pencil lines of a plan's day | yes |
| `chartMath` | how a chart is scaled and laid out | yes |
| `backup` | notebook to JSON file and back; also reads a backup pasted as text | yes |
| `store` | reading and writing localStorage | yes |
| `prefs` | the settings (rest timer on or off, rest time), saved apart from the notebook | yes |
| `notebook` | the `Notebook` class: every change to lines, machines and plans, with undo | yes |
| `lineMarkup` | the HTML for one notebook line | yes |
| **Parts** | | |
| `dom`, `toast`, `lineInput`, `wheel`, `sheet`, `swipeRows` | building blocks the screens use | |
| **Panels** | | |
| `lineEditor`, `dateEditor` | the bottom panel for writing a line or a date | |
| **Screens** | | |
| `notebookScreen`, `settingsScreen`, `planScreen`, `monthScreen`, `machineScreen` | one class per screen | |
| `app` | the `App` class: start-up and moving between screens | |

The rule of thumb: anything that decides something (what mark a line gets, what a backup file may contain, how a chart is scaled) lives in a block marked `data-testable`. Those blocks never touch the page, so `tests/load.js` can read them out of `index.html` and run them in Node. The other blocks only draw and listen.

## Testing

Four checks, from fast to thorough. The first needs nothing installed; for the others run `npm ci` once.

| Command | What it checks | Where | Time |
| --- | --- | --- | --- |
| `npm test` | **Unit tests.** The logic: every `data-testable` block, run in Node. | `tests/*.test.js` | 1 s |
| `npm run test:e2e` | **Browser tests.** The app in Chromium, used like a person does: tap, hold, drag, turn a wheel, export and import. Twice: a desktop with mouse and keyboard, and a phone with touch. | `e2e/*.spec.js` | 1 min |
| `npm run test:crap` | **CRAP score** of every function. Fails when one is over 30. | `tests/crap/` | 5 s |
| `npm run test:mutation` | **Mutation testing.** Breaks the logic on purpose, one small change at a time; the unit tests must notice. Fails under 95%, or on a surviving change that is not known. | `tests/mutation/` | 1 min |

`npm run test:all` runs all four. Reports land in `reports/` (not committed).

**Why not line coverage.** A line that ran is not a line that was checked. Mutation testing asks the real question: if this code were wrong, would a test fail? CRAP asks where that matters most: complex functions with little testing.

**Which level tests what.**
- Logic goes in a `data-testable` block and gets unit tests. Mutation testing covers those blocks only (`tests/mutation/ignore-page-blocks.js` skips the rest).
- The blocks that draw and listen are covered by the browser tests. In Chromium they record which code ran.
- The CRAP check joins both: a function counts as tested when either level runs it. After `npm test` alone it checks the logic only; after the browser tests it checks the page too.

**CRAP** = complexity² × (1 − coverage)³ + complexity. Complexity counts every `if`, `?:`, `&&`, `||`, `??`, loop, `case` and `catch`. Coverage counts statements and both sides of every branch. A simple function is fine untested; a complex one must be tested nearly all the way, or split.

**Surviving mutants.** A few changes make no difference anyone could see, such as a random id that is just longer. Those are in `tests/mutation/known-survivors.json`, each with its reason. Any other survivor fails the check: add a test that catches it. `node tests/mutation/survivors.js` lists them all.

**Browser tests** always start on Monday 23 November 2026, with the example notebook. The clock still runs, and the rest timer tests fast-forward it. A test also fails when the page throws or logs an error. Helpers that tap, hold and drag are in `e2e/app.js`.

**On GitHub.** Every pull request runs all four (`.github/workflows/test.yml`); the reports are kept as downloads on the run. On `main` the deploy runs the unit and browser tests first and publishes nothing when they fail.

**Updates.** Dependabot (`.github/dependabot.yml`) checks the test tools and the GitHub Actions every Monday. It only proposes versions that are at least 14 days old, and sends one pull request per group (Stryker, Playwright, the rest, Actions). Each one runs all the tests above.

## Plans

A plan is a named list of machines in the order you do them, such as "Leg day". You make plans in Settings.

- A plan holds machine names only. It never holds kg or reps: those come from the last time you did the machine.
- A new date can start from a plan. The plan's name is written after the date in brackets, its machines under it in pencil, and the panel opens on the first one.
- Logging the first set turns a pencil line into pen. After each set the panel comes back for the next set, with a button to the next machine.
- Dragging the date of such a day left removes the whole day: the date and every line under it. Undo brings it back.
- Hold a line still for a moment to pick it up, then drag it up or down. It moves within its own day, so you can put a line you wrote (such as your cardio) above the plan's machines. With a keyboard: Alt with arrow up or down.
- A pencil line never counts in the statistics. Pencil lines you did not log are thrown away when you start the next date.

## Other folders

- `fonts/`: the handwriting font.
- `tests/`: the unit tests, the CRAP check (`tests/crap/`) and the mutation setup (`tests/mutation/`).
- `e2e/`: the browser tests.
- `design/`: screenshots of every screen.
