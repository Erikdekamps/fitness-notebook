/**
 * A handwriting-styled text field that sits on a ruled line.
 * Enter submits, Escape cancels, tapping anywhere else submits and closes.
 * onSubmit(text, input) returns 'close' (default), 'clear' (stay open for another) or 'keep' (stay, keep the text).
 */
export function createLineInput({ value = '', placeholder = '', label, onSubmit, onClose }) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'line-input';
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', label || placeholder);
  input.setAttribute('enterkeyhint', 'done');
  input.setAttribute('autocapitalize', 'sentences');

  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('pointerdown', onPointerDownOutside, true);
    onClose();
  }

  // iOS keeps a text field focused when you tap plain paper, so blur it ourselves.
  function onPointerDownOutside(e) {
    if (e.target !== input) input.blur();
  }

  input.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const result = onSubmit(input.value.trim(), input) || 'close';
      if (result === 'clear') input.value = '';
      else if (result === 'close') close();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  input.addEventListener('blur', () => {
    if (closed) return;
    onSubmit(input.value.trim(), input);
    close();
  });

  document.addEventListener('pointerdown', onPointerDownOutside, true);
  return input;
}
