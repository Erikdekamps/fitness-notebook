/** Reading and writing the notebook in the browser's localStorage. */
import { STORAGE_KEY } from './config.js';

/** True when a value has the shape of a saved notebook. */
export function isNotebook(value) {
  return Boolean(value) && Array.isArray(value.lines) && Array.isArray(value.machines);
}

/** The saved notebook, or null when there is none or it cannot be read. */
export function loadNotebook(storage = localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    return isNotebook(saved) ? saved : null;
  } catch (_) {
    return null; // storage blocked or unreadable
  }
}

/** Saves the notebook. Returns false when storage is blocked; the app then keeps working in memory. */
export function saveNotebook(notebook, storage = localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(notebook));
    return true;
  } catch (_) {
    return false;
  }
}
