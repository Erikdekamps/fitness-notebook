# Fitness Notebook

A fitness log that looks and feels like a paper notebook. The whole app is `index.html` plus its font in `fonts/`. Your notebook is saved in the browser.

## Use it

Open `index.html` in a browser, or the GitHub Pages site.

## Test it

```sh
npm test                # unit tests (Node 22, nothing to install)
npm ci                  # once, for the checks below
npm run test:e2e        # browser tests: Chrome and Safari, desktop and phone, WCAG 2.2 AA
npm run test:screenshots:update   # new screenshot baselines, after changing the look on purpose (on Linux)
npm run test:crap       # CRAP score, under 8 per function
npm run test:mutation   # mutation testing, min 95%
npm run test:all        # all of the above
```

Logic lives in `<script data-testable>` blocks of `index.html`; only those are unit and mutation tested. Known harmless mutants are listed in `tests/mutation/known-survivors.json`.
