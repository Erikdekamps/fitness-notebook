/** The one notebook the app is showing. Every view reads and changes `state.data`. */
import { loadNotebook, saveNotebook } from './storage.js';
import { exampleNotebook, sortMachines } from './notebook.js';

export const state = { data: loadNotebook() || exampleNotebook() };

/** Writes the current notebook to storage. Call it after every change. */
export const save = () => saveNotebook(state.data);

/** Loads the notebook again, for when another tab changed it. */
export function reload() {
  state.data = loadNotebook() || exampleNotebook();
}

/** The machines in alphabetical order, the way every list and wheel shows them. */
export const machinesAZ = () => sortMachines(state.data.machines);
