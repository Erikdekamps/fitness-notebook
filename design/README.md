# Design screens

The design for Fitness Notebook, one screen per file. Every screen is 390 × 844 (iPhone 13).

Each screen is here twice:

- `.png` is a picture of the screen.
- `.html` is the same screen as a plain page. Open it in any browser. The links between screens work.

The numbers and dates on the screens are examples.

| Group | Screen | Picture | Page |
| --- | --- | --- | --- |
| 1. The notebook | Today, bottom of the page | [png](1-notebook-today.png) | [html](1-notebook-today.html) |
| 1. The notebook | Scrolled up into older days | [png](1-notebook-scrolled-up.png) | [html](1-notebook-scrolled-up.html) |
| 2. Add a line | Tap the add line: wheels or your own text | [png](2-add-line.png) | [html](2-add-line.html) |
| 2. Add a line | Typing your own line | [png](2-add-line-typing.png) | [html](2-add-line-typing.html) |
| 3. Start a new date | Tap below the add line, pick the date | [png](3-new-date.png) | [html](3-new-date.html) |
| 4. Remove a line | Drag left to delete | [png](4-remove-line.png) | [html](4-remove-line.html) |
| 5. Settings | Machines list, cog icon | [png](5-settings-machines.png) | [html](5-settings-machines.html) |
| 6. Statistics | This month, chart icon | [png](6-statistics-month.png) | [html](6-statistics-month.html) |
| 6. Statistics | One machine over time | [png](6-statistics-machine.png) | [html](6-statistics-machine.html) |

## What is built

Groups 1 to 5 are built in [`../index.html`](../index.html). Group 6, statistics, is design only so far.

## Look

- Paper `#e8d3bc`, ruled lines `#5a5048`, one line every 44 px, stopping 20 px short of both edges.
- Pen `#1d3a8a`, pencil `#4d535c`, handwriting font Caveat at 27 px.
- Pen is for what has been logged. Pencil is for hints and for a line that is still being picked.
