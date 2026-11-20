/** The small message at the bottom of the screen, with an optional Undo. */
import { UNDO_MS } from '../config.js';
import { byId } from '../dom.js';

export const Toast = (() => {
  const el = byId('toast');
  const text = byId('toastText');
  const button = byId('toastUndo');
  let timer = 0;
  let undo = null;

  function hide() {
    clearTimeout(timer);
    el.classList.remove('is-visible');
    undo = null;
  }

  /** Shows a short message. With onUndo it also offers an Undo button. */
  function show(message, onUndo) {
    clearTimeout(timer);
    text.textContent = message;
    undo = onUndo || null;
    button.hidden = !undo;
    el.classList.toggle('is-plain', !undo);
    el.classList.add('is-visible');
    timer = setTimeout(hide, UNDO_MS);
  }

  button.addEventListener('click', () => {
    const fn = undo;
    hide();
    if (fn) fn();
  });

  return { show, hide };
})();
