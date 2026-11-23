# Fitness Notebook

A fitness log that looks and feels like a paper notebook. The whole app is one page, `index.html`, plus its handwriting font in `fonts/`. No build step and no dependencies. Your notebook is saved in the browser you open it in.

## Use it

Open `index.html` in a browser, or the GitHub Pages site once that is switched on. Keep the `fonts/` folder next to it; without the font file the page still works, in another handwriting font.

## Change it

Edit `index.html`. What you edit is what runs.

```sh
npm test    # run the unit tests (needs Node 22, nothing to install)
```

CI runs the tests on every pull request. On `main` the deploy runs them first and publishes nothing when they fail.

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
| `progress` | marks (↑ or –N), machine history, wheel values | yes |
| `chartMath` | how a chart is scaled and laid out | yes |
| `backup` | notebook to JSON file and back | yes |
| `store` | reading and writing localStorage | yes |
| `notebook` | the `Notebook` class: every change to lines and machines, with undo | yes |
| `lineMarkup` | the HTML for one notebook line | yes |
| **Parts** | | |
| `dom`, `toast`, `lineInput`, `wheel`, `sheet`, `swipeRows` | building blocks the screens use | |
| **Panels** | | |
| `lineEditor`, `dateEditor` | the bottom panel for writing a line or a date | |
| **Screens** | | |
| `notebookScreen`, `settingsScreen`, `monthScreen`, `machineScreen` | one class per screen | |
| `app` | the `App` class: start-up and moving between screens | |

The rule of thumb: anything that decides something (what mark a line gets, what a backup file may contain, how a chart is scaled) lives in a block marked `data-testable`. Those blocks never touch the page, so `tests/load.js` can read them out of `index.html` and run them in Node. The other blocks only draw and listen.

## Other folders

- `fonts/`: the handwriting font.
- `tests/`: the unit tests.
- `design/`: the design screens, as pictures and pages.
