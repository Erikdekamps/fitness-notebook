# Design screens

Screenshots of the app, one per screen, in the order you meet them. Every screen is 390 × 844 (iPhone 13), taken at 2×.

They are pictures of the real `index.html`, so they show what is built. Screens 07 to 10 and 13 to 18 were taken when a new notebook had six machines and settings had no plans part; it now starts with twelve machines, so those show a shorter list than you see today. The numbers and dates are examples: "today" is 23/11. Screens 15, 16 and 18 use a made-up year of training.

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
| Settings | [11-settings.png](11-settings.png) | Plans (none yet) and the machines. Rest timer and backup are further down |
| Settings | [12-settings-rest-time.png](12-settings-rest-time.png) | Pick the rest time, 0:15 to 10:00 |
| Settings | [13-settings-export.png](13-settings-export.png) | Export: saved as a JSON file |
| Settings | [14-settings-import.png](14-settings-import.png) | Import: check the file, then replace |
| Statistics | [15-statistics-month.png](15-statistics-month.png) | This month: only an arrow back |
| Statistics | [16-statistics-older-month.png](16-statistics-older-month.png) | An older month: arrows both ways |
| Statistics | [17-statistics-machine.png](17-statistics-machine.png) | One machine: weights and dates |
| Statistics | [18-statistics-machine-year.png](18-statistics-machine-year.png) | One machine with a year of data |
| Plans | [19-new-plan-name.png](19-new-plan-name.png) | Settings, "tap here to add a plan": name the plan |
| Plans | [20-plan-empty.png](20-plan-empty.png) | The new plan, still empty |
| Plans | [21-plan-add-machine.png](21-plan-add-machine.png) | Pick a machine, or write a new one. The panel comes back for the next machine |
| Plans | [22-plan.png](22-plan.png) | One plan: machine names in order. Drag the handle to move one, drag left to take it out. Tap the name at the top to change it |
| Plans | [23-settings-plans.png](23-settings-plans.png) | Settings with two plans. Tap one to open it, drag left to remove it, like a line in the notebook |
| A day from a plan | [24-new-date-plan.png](24-new-date-plan.png) | New date: the plan wheel on the right starts on "No plan". Pick a plan: its name shows after the date in brackets, its machines under it, in pencil |
| A day from a plan | [25-plan-day-ready.png](25-plan-day-ready.png) | "Start Leg day": the panel opens on the first machine, with last time's kg and reps |
| A day from a plan | [26-plan-log-next-set.png](26-plan-log-next-set.png) | After each set the panel comes back: "Log set 4", or on to the next machine |
| A day from a plan | [27-plan-other-reps.png](27-plan-other-reps.png) | Other kg or reps start a new line right under it |

## Look

- Paper `#e8d3bc`, ruled lines `#5a5048`, one line every 44 px, stopping 20 px short of both edges.
- Pen `#1d3a8a`, pencil `#4d535c`, handwriting font Caveat at 27 px.
- Pen is for what has been logged. Pencil is for hints, the running timer, and a line that is still being picked.
