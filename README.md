# Fitness Notebook

A fitness log that looks and feels like a paper notebook. The whole app is `index.html` plus its font in `fonts/`. Your notebook is saved in the browser.

## Use it

Open `index.html` in a browser, or the GitHub Pages site.

## Test it

```sh
npm test                # unit tests (Node 22, nothing to install)
npm ci                  # once, for the checks below
npm run lint            # ESLint: index.html and the tests
npm run types           # type check: the app in index.html, the tests and the tools
npm run test:e2e        # browser tests: Chrome and Safari, desktop and phone, WCAG 2.2 AA
npm run test:crap       # CRAP score, 5 at most per function
npm run test:mutation   # mutation testing, min 95%
npm run test:all        # all of the above
```

Logic lives in `<script data-testable>` blocks of `index.html`; only those are unit and mutation tested. What a screen decides (which key does what, what a button says) is in the `decide` block, so it is tested there too; the page blocks only draw. Known harmless mutants are listed in `tests/mutation/known-survivors.json`.

## Machines

A new notebook has 147 machines, A to Z: the list in the `machineList` block of `index.html`, and Dumbbells. Machines are not added, renamed or removed. Each machine has its own page: what it works, and your weights on it.

What each machine works comes from the list of exercises of [Workout Guide](https://github.com/bryllim/workout-guide) by Bryl Lim (`packages/workout-guide/manifest.json`, as it was on 27 August 2026, commit `aac599224bb9780305239607ef98540b7e0ce389`), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Here it is in plainer words: "back of the shoulders" for rear delts. Changed this way, it is shared under the same license. The rest of the app keeps its own license (see `LICENSE`).
