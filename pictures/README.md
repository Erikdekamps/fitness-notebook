# Drawings

The drawings of the machines: three per machine, how the move goes. Machine `<name>` has
`<name>/frame-1.svg`, `frame-2.svg` and `frame-3.svg`. The `pictures` block of `index.html` says which
machine has which drawing, and which other names get one (such as "Squat (barbell)", or "Pull up").

## Credit

- **Workout Guide** by **Bryl Lim**: https://github.com/bryllim/workout-guide (https://bryllim.com)
- Based on the drawings of **Everkinetic**: https://github.com/everkinetic/data
- License: **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**:
  https://creativecommons.org/licenses/by-sa/4.0/

Copyright (c) 2026 Bryl Lim, except the drawings that are based on Everkinetic's: Workout Guide's
`ATTRIBUTION.md` and `packages/workout-guide/manifest.json` say which ones, where each comes from and
what was changed there.

What each machine works, and with what (on its page), comes from Workout Guide's list of exercises
(`packages/workout-guide/manifest.json`), in plainer words: "back of the shoulders" for rear delts.

Taken from Workout Guide as it was on 27 August 2026, commit `aac599224bb9780305239607ef98540b7e0ce389`.

## What we changed

- Cut to what is drawn: one box around all three frames of a drawing, so it keeps its place from frame to frame.
- Colored pen blue (`#1d3a8a`, the notebook's ink) instead of white.

Nothing else: every line of every drawing is the same. `tools/import-pictures.js` makes this folder
from a copy of Workout Guide.

## Rotary torso

Workout Guide has no rotary torso, so `rotary-torso/` is put together from two of its drawings, by
`tools/draw-rotary-torso.js`:

- below the waist: the person on the hip adduction machine (`hip-adduction-machine/frame-1.svg`)
- above the waist: the person of the Russian twist, who turns (`weighted-russian-twist/`, frame 1, 2 and 3)
- a chest pad drawn over the hands, the pad the arms hold on a rotary torso

The lines that are used are not changed: only moved, made a little smaller, and cut off at the waist.

## License

These drawings, changed as above, are shared under the same license: CC BY-SA 4.0.
The rest of the app keeps its own license (see `LICENSE`).
