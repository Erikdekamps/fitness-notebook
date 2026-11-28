# Design screens

Screenshots of the app, one per screen, in the order you meet them. Every screen is 390 × 844 (iPhone 13), taken at 2×.

They are pictures of the real `index.html`, so they show what is built. A new notebook has 147 machines and five example days. The numbers and dates are examples: "today" is 23/11. Screens 15, 16 and 18 use a made-up year of training.

At the top right of every main screen are four tabs: the notebook, plans and machines, statistics, settings. The open one is underlined. They stay while the screen scrolls; a page below a tab (one plan, one machine) has a back arrow instead.

| Group | Screen | What it shows |
| --- | --- | --- |
| The notebook | [01-notebook-today.png](01-notebook-today.png) | Bottom of the page: the latest days, and "tap to add a line" |
| The notebook | [02-notebook-older-days.png](02-notebook-older-days.png) | Scrolled up into older days; the arrow goes back to today |
| A new day | [03-new-date.png](03-new-date.png) | Tap below the add line, pick the date |
| A new day | [04-add-line-typing.png](04-add-line-typing.png) | Write your own line, such as the class |
| Logging sets | [05-add-line.png](05-add-line.png) | Pick machine, kg and reps, then "Log set 1" |
| Logging sets | [06-rest-timer.png](06-rest-timer.png) | The rest timer starts top left and counts down; at 0:00 it goes away. Tap it to stop. The line reads kg × reps × sets |
| Logging sets | [07-log-next-set.png](07-log-next-set.png) | Same machine, kg and reps: "Log set 2" counts up on the same line |
| Change a line | [08-change-line.png](08-change-line.png) | Tap a line: "Log set 4" adds a set to it |
| Change a line | [09-change-line-save.png](09-change-line-save.png) | Change kg or reps: the line shows in pencil and the button says Save |
| Remove a line | [10-remove-line.png](10-remove-line.png) | Drag left to delete |
| Settings | [11-settings.png](11-settings.png) | Each setting changes in place, with a tap: the text size and the kg steps (the one set is circled), the rest timer (a tick box, and − and + for the rest time). Then backup |
| Settings | [12-settings-text-large.png](12-settings-text-large.png) | Large text: the handwriting grows, and so do the ruled lines |
| Settings | [13-settings-export.png](13-settings-export.png) | "save a copy": saved as a JSON file |
| Settings | [14-settings-bring-back.png](14-settings-bring-back.png) | "bring a copy back": from a file, or from its text |
| Statistics | [15-statistics-month.png](15-statistics-month.png) | This month: only an arrow back |
| Statistics | [16-statistics-older-month.png](16-statistics-older-month.png) | An older month: arrows both ways |
| Statistics | [17-statistics-machine.png](17-statistics-machine.png) | One machine: what it works, then your weights and when they changed. The list of machines opens the same page |
| Statistics | [18-statistics-machine-year.png](18-statistics-machine-year.png) | One machine with a year of data |
| Plans | [19-new-plan-name.png](19-new-plan-name.png) | Plans and machines, "tap here to add a plan": name the plan |
| Plans | [20-plan-empty.png](20-plan-empty.png) | The new plan, still empty |
| Plans | [21-plan-add-machine.png](21-plan-add-machine.png) | Pick a machine. The panel comes back for the next machine |
| Plans | [22-plan.png](22-plan.png) | One plan: machine names in order. Hold one, then drag it, to move it; drag left to take it out. Tap one to open its page, or the name at the top to change it |
| Plans | [23-plans-and-machines.png](23-plans-and-machines.png) | The plans and machines tab: two plans, then every machine A to Z. Tap a plan to open it, drag it left to remove it; tap a machine for its page. Machines are not added, renamed or removed |
| A day from a plan | [24-new-date-plan.png](24-new-date-plan.png) | New date: the plan wheel on the right starts on "No plan". Pick a plan: its name shows after the date in brackets, its machines under it, in pencil |
| A day from a plan | [25-plan-day-ready.png](25-plan-day-ready.png) | "Start Leg day": the panel opens on the first machine, with last time's kg and reps |
| A day from a plan | [26-plan-log-next-set.png](26-plan-log-next-set.png) | After each set the panel comes back: "Log set 4", or on to the next machine |
| A day from a plan | [27-plan-other-reps.png](27-plan-other-reps.png) | Other kg or reps start a new line right under it |
| Settings | [28-settings-import-text.png](28-settings-import-text.png) | A copy from text: paste it in. "Check the text" checks it like a file, then asks before it replaces anything |
| Settings | [29-settings-import-text-wrong.png](29-settings-import-text-wrong.png) | Text that is not a backup: the panel says so and keeps the text |
| Settings | [30-settings-import.png](30-settings-import.png) | A copy from a file: what is in it, then replace |
| Kg wheel | [31-add-line-half-kg.png](31-add-line-half-kg.png) | With steps of 0.5 kg: 12, 12.5, 13 on the kg wheel |
| Text size | [32-notebook-text-large.png](32-notebook-text-large.png) | The notebook in large text: a long line runs on to the next ruled line |
| Machines | [33-machine-page.png](33-machine-page.png) | One machine: what it works mostly, what else, and with what; then your weights on it, here nothing yet |

## Look

- Paper `#e8d3bc`, ruled lines `#5a5048`, one line every 44 px (52 px with large text), stopping 20 px short of both edges.
- Pen `#1d3a8a`, pencil `#4d535c`, handwriting font Caveat at 27 px (23 px small, 32 px large).
- Pen is for what has been logged. Pencil is for hints, the running timer, and a line that is still being picked.
