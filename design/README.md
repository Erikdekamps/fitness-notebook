# Design screens

The design for Fitness Notebook, one picture per screen. Every screen is 390 × 844 (iPhone 13).

The numbers and dates on the screens are examples.

| Group | Screen | Picture |
| --- | --- | --- |
| 1. The notebook | Today, bottom of the page | [png](1-notebook-today.png) |
| 1. The notebook | Scrolled up into older days | [png](1-notebook-scrolled-up.png) |
| 2. Add a line | Tap the add line: wheels or your own text | [png](2-add-line.png) |
| 2. Add a line | Typing your own line | [png](2-add-line-typing.png) |
| 3. Start a new date | Tap below the add line, pick the date | [png](3-new-date.png) |
| 4. Remove a line | Drag left to delete | [png](4-remove-line.png) |
| 5. Settings | Machines and backup, cog icon | [png](5-settings-machines.png) |
| 5. Settings | Export: saved as a JSON file | [png](5-settings-export.png) |
| 5. Settings | Import: check the file, then replace | [png](5-settings-import.png) |
| 6. Statistics | This month: only an arrow back | [png](6-statistics-month.png) |
| 6. Statistics | An older month: arrows both ways | [png](6-statistics-older-month.png) |
| 6. Statistics | One machine: weights and dates | [png](6-statistics-machine.png) |
| 6. Statistics | One machine with a year of data | [png](6-statistics-machine-year.png) |

## What is built

All six groups are built in [`../index.html`](../index.html).

## Look

- Paper `#e8d3bc`, ruled lines `#5a5048`, one line every 44 px, stopping 20 px short of both edges.
- Pen `#1d3a8a`, pencil `#4d535c`, handwriting font Caveat at 27 px.
- Pen is for what has been logged. Pencil is for hints and for a line that is still being picked.
