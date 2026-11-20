/** The settings screen: the machines list and the backup. */
import { cleanName, sameName, newId, escapeHtml } from '../util.js';
import { byId, shake, downloadFile } from '../dom.js';
import { Dates } from '../dates.js';
import { state, save, machinesAZ } from '../state.js';
import { withoutExamples } from '../notebook.js';
import { backupFileName, toBackupJson, parseBackup, describeNotebook } from '../backup.js';
import { navigation } from '../navigation.js';
import { createLineInput } from '../ui/line-input.js';
import { createRowGestures } from '../ui/row-gestures.js';
import { Sheet } from '../ui/sheet.js';
import { Toast } from '../ui/toast.js';

export const SettingsView = (() => {
  const list = byId('machineList');
  const addRow = byId('addMachineRow');
  const examplesBtn = byId('removeExamples');
  const importFile = byId('importFile');

  function render() {
    renderList();
    renderAddRow();
    examplesBtn.hidden = !state.data.lines.some((l) => l.example);
  }

  function renderList() {
    list.innerHTML = machinesAZ()
      .map((m) => {
        const name = escapeHtml(m.name);
        return (
          `<div class="row row--machine" role="listitem" tabindex="0" data-key="${escapeHtml(m.id)}">` +
          `<div class="row-content"><span class="name">${name}</span></div>` +
          `<button class="row-delete" type="button" tabindex="-1" aria-label="Remove ${name}"><span>Delete</span></button>` +
          '</div>'
        );
      })
      .join('');
  }

  function renderAddRow() {
    addRow.className = 'bleed add-row add-row--pencil';
    addRow.innerHTML = '<button class="pencil-btn" type="button">tap here to add a machine</button>';
  }

  const nameTaken = (name, exceptId) => state.data.machines.some((m) => m.id !== exceptId && sameName(m.name, name));

  function addMachine(name) {
    const clean = cleanName(name);
    // Re-adding a machine that was removed earlier picks its history back up.
    let oldId = null;
    for (let i = state.data.lines.length - 1; i >= 0 && !oldId; i--) {
      const l = state.data.lines[i];
      if (l.type === 'machine' && sameName(l.name, clean) && !state.data.machines.some((m) => m.id === l.machineId)) oldId = l.machineId;
    }
    state.data.machines.push({ id: oldId || newId('m'), name: clean });
    save();
    renderList();
  }

  function startAdding() {
    addRow.className = 'bleed add-row';
    addRow.innerHTML = '<div class="row-content"></div>';
    const input = createLineInput({
      placeholder: 'machine name',
      label: 'New machine',
      onSubmit(name, field) {
        if (!name) return 'close';
        if (nameTaken(name)) {
          shake(field);
          return 'keep';
        }
        addMachine(name);
        return 'clear'; // ready for the next one
      },
      onClose: renderAddRow,
    });
    addRow.firstElementChild.appendChild(input);
    input.focus();
  }

  function rename(row) {
    const machine = state.data.machines.find((m) => m.id === row.dataset.key);
    if (!machine) return;
    const input = createLineInput({
      value: machine.name,
      label: 'Machine name',
      onSubmit(name, field) {
        if (!name || name === machine.name) return 'close';
        if (nameTaken(name, machine.id)) {
          shake(field);
          return 'keep';
        }
        machine.name = cleanName(name);
        save();
        return 'close';
      },
      onClose: renderList,
    });
    row.querySelector('.name').replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function removeMachine(id) {
    const index = state.data.machines.findIndex((m) => m.id === id);
    if (index === -1) return;
    const [machine] = state.data.machines.splice(index, 1);
    save();
    renderList();
    Toast.show('Machine removed', () => {
      state.data.machines.splice(Math.min(index, state.data.machines.length), 0, machine);
      save();
      renderList();
    });
  }

  addRow.addEventListener('click', (e) => {
    if (e.target.closest('.pencil-btn')) startAdding();
  });

  examplesBtn.addEventListener('click', () => {
    const before = state.data.lines;
    state.data.lines = withoutExamples(before);
    save();
    examplesBtn.hidden = true;
    Toast.show('Example lines removed', () => {
      state.data.lines = before;
      save();
      navigation.refresh();
    });
  });

  createRowGestures(list, {
    onTap: rename,
    onDelete: (row) => removeMachine(row.dataset.key),
  });

  /* ---- Backup ---- */

  byId('exportBtn').addEventListener('click', () => {
    const fileName = backupFileName(Dates.today());
    downloadFile(fileName, toBackupJson(state.data, new Date()));
    Toast.show(`Saved ${fileName}`);
  });

  byId('importBtn').addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', () => {
    const file = importFile.files[0];
    importFile.value = ''; // so the same file can be picked again
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => Toast.show('That file could not be read');
    reader.onload = () => {
      const { notebook, error } = parseBackup(String(reader.result));
      if (error) Toast.show(error);
      else askToReplace(file.name, notebook);
    };
    reader.readAsText(file);
  });

  /** Shows what is in the file and replaces the notebook only after a yes. */
  function askToReplace(fileName, notebook) {
    Sheet.open({
      title: 'Import a notebook',
      info: {
        heading: fileName,
        details: describeNotebook(notebook),
        note: 'This replaces the notebook and the machines on this phone.',
      },
      columns: 'none',
      labels: [],
      wheels: [],
      actionLabel: 'Replace my notebook',
      cancelLabel: 'Cancel',
      onAction() {
        const before = state.data;
        state.data = notebook;
        save();
        navigation.refresh();
        Toast.show('Notebook replaced', () => {
          state.data = before;
          save();
          navigation.refresh(); // you may have left Settings by now
        });
      },
    });
  }

  return { render };
})();
