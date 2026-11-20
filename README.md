# Fitness Notebook

A fitness log that looks and feels like a paper notebook. The whole app is one file, `index.html`, with no network needs. Your notebook is saved in the browser you open it in.

## Use it

Open `index.html` in a browser, or the GitHub Pages site once that is switched on.

## Change it

`index.html` is built. Do not edit it by hand: change the files in `src/` and build again.

```sh
npm install      # once
npm test         # run the unit tests
npm run build    # write index.html from src/
npm run check    # fail when index.html does not match src/
```

Commit `index.html` together with the source change. CI runs the tests and the check on every pull request.

## Where things are

```
src/
  index.template.html   the page's HTML; CSS and script are put in by the build
  styles.css            all styles
  font.css              the handwriting font, embedded
  js/
    config.js           every fixed value
    util.js             small pure helpers
    dates.js            dates as "YYYY-MM-DD"
    notebook.js         the notebook's rules: marks, wheel values, sorting   (pure, tested)
    stats.js            the numbers behind the statistics                    (pure, tested)
    backup.js           notebook to JSON file and back                       (pure, tested)
    storage.js          reading and writing localStorage                     (tested)
    state.js            the one notebook the app is showing
    dom.js              small helpers that touch the page
    navigation.js       how a view asks the app to change screen
    app.js              start-up and moving between screens
    ui/                 building blocks: wheel, sheet, row gestures, text field, toast
    views/              one file per screen: notebook, settings, statistics
tests/                  unit tests for the pure files (node --test)
design/                 the design screens, as pictures and pages
build.mjs               the build
```

The rule of thumb: anything that decides something (what mark a line gets, what a backup file may contain, how a chart is scaled) lives in a pure file and has tests. The `ui/` and `views/` files only draw and listen.
