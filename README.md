# Fitness Notebook

A fitness log that looks and feels like a paper notebook. The whole app is `index.html` plus its font in `fonts/` and the drawings of the machines in `pictures/`. Your notebook is saved in the browser.

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

## Drawings

The machines are a fixed list, each with its own page: its drawing, what it works, and your weights on it. The drawings are from [Workout Guide](https://github.com/bryllim/workout-guide) by Bryl Lim, based on [Everkinetic](https://github.com/everkinetic/data), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). They are cropped and colored for the notebook; [pictures/README.md](pictures/README.md) says what changed. Rotary torso is the one drawing made here. Settings credits them too, at the bottom.
