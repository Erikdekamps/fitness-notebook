/** The notebook screen: the lines, adding a line, starting a date, removing. */
import { SETS, REPS, FIRST_TIME_VALUES, YEARS_BACK, PREVIEW_ID, BLANK_ROW, Icons } from '../config.js';
import { range, round2, formatKg, newId, indexOr, escapeHtml } from '../util.js';
import { byId, scrollToBottom } from '../dom.js';
import { Dates } from '../dates.js';
import { state, save, machinesAZ } from '../state.js';
import { analyzeLines, machinesInCurrentDay, kgOptions } from '../notebook.js';
import { createRowGestures } from '../ui/row-gestures.js';
import { Sheet } from '../ui/sheet.js';
import { Toast } from '../ui/toast.js';

export const NotebookView = (() => {
  const root = byId('notebook');
  const linesEl = byId('lines');
  const addArea = byId('addArea');
  const rowNext = byId('rowNext');
  const rowDate = byId('rowDate');
  const filler = byId('notebookFiller');
  const todayBtn = byId('todayBtn');

  let busy = false; // a sheet is open

  /* ---- Markup ---- */

  function markHtml(mark) {
    if (mark === 'up') return `<span class="mark" role="img" aria-label="heavier than last time">${Icons.up}</span>`;
    if (mark === 'down') return `<span class="mark" role="img" aria-label="lighter than last time">${Icons.down}</span>`;
    if (typeof mark === 'number') {
      return `<span class="mark" role="img" aria-label="same weight, ${mark} ${mark === 1 ? 'time' : 'times'} in a row">–${mark}</span>`;
    }
    return '';
  }

  function contentHtml(line, mark) {
    if (line.type === 'date') {
      const { date, day } = Dates.written(line.date);
      return `<span>${date}</span><span>${day}</span>`;
    }
    if (line.type === 'text') return escapeHtml(line.text);
    return (
      `<span class="name">${escapeHtml(line.name)}</span>` +
      `<span class="nums">${formatKg(line.weight)} × ${Number(line.sets)} × ${Number(line.reps)}</span>` +
      markHtml(mark)
    );
  }

  function rowHtml(line, mark) {
    return (
      `<div class="row row--${line.type}" role="listitem" tabindex="0" data-key="${escapeHtml(line.id)}">` +
      `<div class="row-content">${contentHtml(line, mark)}</div>` +
      '<button class="row-delete" type="button" tabindex="-1" aria-label="Delete line"><span>Delete</span></button>' +
      '</div>'
    );
  }

  function render() {
    const { marks } = analyzeLines(state.data.lines);
    linesEl.innerHTML = state.data.lines
      .map((line, i) => (line.type === 'date' && i > 0 ? BLANK_ROW : '') + rowHtml(line, marks.get(line.id)))
      .join('');
    showAddLines();
    filler.style.height = '';
    updateTodayButton();
  }

  /* ---- The lines under the last entry ----
     First empty line: tap to add a line. Anywhere below it: tap to start a new date. */

  function showAddLines() {
    const empty = state.data.lines.length === 0; // a fresh notebook starts with a date
    rowNext.hidden = empty;
    setButton(rowNext, 'line', 'tap to add a line');
    setButton(rowDate, 'date', empty ? 'tap to start with a date' : '', 'Start a new date');
  }

  function setButton(row, action, text, label) {
    row.className = 'add-row';
    row.innerHTML =
      `<button class="add-btn is-pencil" type="button" data-action="${action}"` +
      `${label ? ` aria-label="${label}"` : ''}>${text}</button>`;
  }

  function setRowContent(row, html, className = '') {
    row.className = 'add-row';
    row.innerHTML = `<div class="row-content ${className}">${html}</div>`;
  }

  function clearRow(row) {
    row.className = 'add-row';
    row.innerHTML = '';
  }

  function rowFor(line) {
    return linesEl.querySelector(`.row[data-key="${CSS.escape(line.id)}"]`);
  }

  /** Shows a pencil preview in the row of the line that is being changed. */
  function showInRow(line, type, html) {
    const row = rowFor(line);
    if (!row) return;
    row.className = `row row--${type}`;
    const content = row.querySelector('.row-content');
    content.classList.add('is-pencil');
    content.innerHTML = html;
  }

  /** Leaves room under the page and scrolls so `target` stays visible above the sheet. */
  function makeRoomFor(target) {
    const sheetHeight = Sheet.height();
    filler.style.height = `calc(var(--line) * 4 + ${sheetHeight}px)`;
    if (!target) return;
    const limit = window.innerHeight - sheetHeight - 16;
    const bottom = target.getBoundingClientRect().bottom;
    if (bottom > limit) window.scrollBy({ top: bottom - limit, behavior: 'smooth' });
  }

  function finish({ scroll } = {}) {
    busy = false;
    render();
    if (scroll) scrollToBottom(true);
  }

  /* ---- Add or change a line: machine wheels, or your own text ---- */

  function openLineSheet(editing) {
    const editingMachine = editing && editing.type === 'machine' ? editing : null;
    const machines = machinesAZ();
    if (editingMachine && !machines.some((m) => m.id === editingMachine.machineId)) {
      // The machine was removed in settings; keep it pickable for this line.
      machines.unshift({ id: editingMachine.machineId, name: editingMachine.name });
    }
    const hasWheels = machines.length > 0;
    const { latest } = analyzeLines(state.data.lines);
    const lastTime = (machine) => latest.get(machine.id) || FIRST_TIME_VALUES;

    let machineIndex = 0;
    if (editingMachine) {
      machineIndex = machines.findIndex((m) => m.id === editingMachine.machineId);
    } else if (hasWheels) {
      const done = machinesInCurrentDay(state.data.lines);
      machineIndex = Math.max(0, machines.findIndex((m) => !done.has(m.id)));
    }
    let settledIndex = machineIndex;
    const start = editingMachine || (hasWheels ? lastTime(machines[machineIndex]) : FIRST_TIME_VALUES);
    let kgList = kgOptions(start.weight);
    let wheels = null;

    const wheelValues = () => ({ weight: kgList[wheels[1].index], sets: SETS[wheels[2].index], reps: REPS[wheels[3].index] });

    /** What the button would write: a text line when something is typed, else a machine line. */
    function fields() {
      const text = Sheet.text();
      if (text) return { type: 'text', text };
      if (!hasWheels) return null;
      const machine = machines[wheels[0].index];
      // While the machine wheel is still moving, show the numbers it will fill in.
      const moving = !editingMachine && wheels[0].index !== settledIndex;
      const { weight, sets, reps } = moving ? lastTime(machine) : wheelValues();
      const keepName = editingMachine && machine.id === editingMachine.machineId; // old lines keep their written name
      return { type: 'machine', machineId: machine.id, name: keepName ? editingMachine.name : machine.name, weight, sets, reps };
    }

    function preview() {
      if (!wheels) return;
      const next = fields();
      let type = 'text';
      let html = '';
      if (next) {
        const line = { id: editing ? editing.id : PREVIEW_ID, ...next };
        const lines = editing ? state.data.lines.map((l) => (l === editing ? line : l)) : state.data.lines.concat(line);
        type = line.type;
        html = contentHtml(line, analyzeLines(lines).marks.get(line.id));
      }
      if (editing) {
        showInRow(editing, type, html);
      } else {
        setRowContent(rowNext, html, type === 'text' ? 'is-pencil is-text' : 'is-pencil');
        clearRow(rowDate);
      }
    }

    /** When the machine wheel stops on a new machine, load that machine's numbers. */
    function followMachine() {
      const index = wheels[0].index;
      if (index === settledIndex) return;
      settledIndex = index;
      const values = editingMachine ? wheelValues() : lastTime(machines[index]);
      kgList = kgOptions(values.weight);
      wheels[1].setItems(kgList.map(formatKg), indexOr(kgList, round2(values.weight)));
      wheels[2].setIndex(indexOr(SETS, values.sets, 2), false);
      wheels[3].setIndex(indexOr(REPS, values.reps, 11), false);
      preview();
    }

    function commitLine() {
      const next = fields();
      if (next) {
        if (editing) state.data.lines[state.data.lines.indexOf(editing)] = { id: editing.id, ...next };
        else state.data.lines.push({ id: newId('l'), ...next });
        save();
      }
      finish({ scroll: !editing && !!next });
    }

    busy = true;
    wheels = Sheet.open({
      title: editing ? 'Change this line' : 'Add a line',
      text: {
        value: editing && editing.type === 'text' ? editing.text : '',
        placeholder: hasWheels ? 'or write your own line' : 'write a line',
      },
      columns: 'minmax(0, 1fr) 56px 40px 40px',
      labels: [{ text: 'Machine', left: true }, { text: 'kg' }, { text: 'sets' }, { text: 'reps' }],
      wheels: hasWheels
        ? [
            { label: 'Machine', align: 'left', items: machines.map((m) => m.name), index: machineIndex },
            { label: 'Weight in kg', items: kgList.map(formatKg), index: indexOr(kgList, round2(start.weight)) },
            { label: 'Sets', items: SETS.map(String), index: indexOr(SETS, start.sets, 2) },
            { label: 'Reps', items: REPS.map(String), index: indexOr(REPS, start.reps, 11) },
          ]
        : [],
      actionLabel: editing ? 'Save' : 'Log',
      onChange: preview,
      onSettle: (i) => { if (i === 0) followMachine(); },
      onAction: commitLine,
      onCancel: () => finish(),
    });
    preview();
    makeRoomFor(editing ? rowFor(editing) : rowNext);
  }

  /* ---- Date lines ---- */

  function openDateSheet(editing) {
    const today = Dates.today();
    const now = Dates.parts(today);
    const start = Dates.parts(editing ? editing.date : today);
    const writtenYears = state.data.lines.filter((l) => l.type === 'date').map((l) => Dates.parts(l.date).y);
    const years = range(Math.min(now.y - YEARS_BACK, start.y, ...writtenYears), Math.max(now.y, start.y));
    const days = range(1, 31);
    const months = range(1, 12);
    let wheels = null;

    /** The picked date, made valid: no 31 November, nothing after today. */
    function picked() {
      const y = years[wheels[2].index];
      const m = months[wheels[1].index];
      const d = Math.min(days[wheels[0].index], Dates.daysInMonth(y, m));
      const iso = Dates.toIso(y, m, d);
      return iso > today ? today : iso;
    }

    function snapToValid() {
      const { y, m, d } = Dates.parts(picked());
      if (wheels[0].index !== d - 1) wheels[0].setIndex(d - 1, true);
      if (wheels[1].index !== m - 1) wheels[1].setIndex(m - 1, true);
      const yearIndex = years.indexOf(y);
      if (wheels[2].index !== yearIndex) wheels[2].setIndex(yearIndex, true);
    }

    function preview() {
      if (!wheels) return;
      const html = contentHtml({ type: 'date', date: picked() });
      if (editing) {
        showInRow(editing, 'date', html);
      } else {
        clearRow(rowNext); // this becomes the skipped line
        setRowContent(rowDate, html, 'is-pencil is-bold');
      }
    }

    function commitDate() {
      const date = picked();
      if (editing) state.data.lines[state.data.lines.indexOf(editing)] = { id: editing.id, type: 'date', date };
      else state.data.lines.push({ id: newId('l'), type: 'date', date });
      save();
      finish({ scroll: !editing });
    }

    busy = true;
    wheels = Sheet.open({
      title: editing ? 'Change the date' : 'Start a new date',
      columns: '64px 64px 84px',
      center: true,
      labels: [{ text: 'day' }, { text: 'month' }, { text: 'year' }],
      wheels: [
        { label: 'Day', items: days.map(String), index: start.d - 1 },
        { label: 'Month', items: months.map(String), index: start.m - 1 },
        { label: 'Year', items: years.map(String), index: indexOr(years, start.y, years.length - 1) },
      ],
      actionLabel: editing ? 'Save' : 'Log',
      onChange: preview,
      onSettle: snapToValid,
      onAction: commitDate,
      onCancel: () => finish(),
    });
    preview();
    makeRoomFor(editing ? rowFor(editing) : rowDate);
  }

  /* ---- Removing ---- */

  function removeLine(id) {
    const index = state.data.lines.findIndex((l) => l.id === id);
    if (index === -1) return;
    const [line] = state.data.lines.splice(index, 1);
    save();
    render();
    Toast.show(line.type === 'date' ? 'Date removed' : 'Line removed', () => {
      state.data.lines.splice(Math.min(index, state.data.lines.length), 0, line);
      save();
      render();
    });
  }

  /* ---- Back to today ---- */

  function updateTodayButton() {
    const away = !root.hidden && !Sheet.isOpen() && addArea.getBoundingClientRect().top > window.innerHeight;
    todayBtn.classList.toggle('is-visible', away);
  }

  /* ---- Events ---- */

  addArea.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button || busy) return;
    if (button.dataset.action === 'line') openLineSheet(null);
    else openDateSheet(null);
  });

  // The empty paper below the add line also starts a new date.
  filler.addEventListener('click', () => {
    if (!busy) openDateSheet(null);
  });

  createRowGestures(linesEl, {
    onTap(row) {
      const line = state.data.lines.find((l) => l.id === row.dataset.key);
      if (!line || busy) return;
      if (line.type === 'date') openDateSheet(line);
      else openLineSheet(line);
    },
    onDelete: (row) => removeLine(row.dataset.key),
  });

  todayBtn.addEventListener('click', () => scrollToBottom(true));

  return { render, updateTodayButton };
})();
