/** The panel that slides up from the bottom: wheels, a text field, or a question. */
import { escapeHtml } from '../util.js';
import { byId } from '../dom.js';
import { Toast } from './toast.js';
import { createWheel } from './wheel.js';

export const Sheet = (() => {
  const sheet = byId('sheet');
  const backdrop = byId('backdrop');
  const title = byId('sheetTitle');
  const textField = byId('sheetText');
  const labels = byId('sheetLabels');
  const wheelsEl = byId('sheetWheels');
  const action = byId('sheetAction');
  const cancelButton = byId('sheetCancel');
  const info = byId('sheetInfo');
  const behind = ['notebook', 'settings', 'cogBtn', 'statsBtn', 'todayBtn'].map(byId);
  let config = null;

  /** What is typed in the text field ('' when the sheet has none). */
  const text = () => (textField.hidden ? '' : textField.value.trim());

  /** While typing, the wheels fold away so the field and the button fit above the keyboard. */
  function updateTyping() {
    const typing =
      !!config &&
      (config.wheels.length === 0 || (!textField.hidden && (textField.value !== '' || document.activeElement === textField)));
    sheet.classList.toggle('is-typing', typing);
  }

  /**
   * Opens the sheet and returns its wheels.
   * config: { title, info: { heading, details: [..], note } (optional), text: { value, placeholder } (optional),
   *           columns, center, labels: [{ text, left }], wheels: [{ label, align, items, index }],
   *           actionLabel, cancelLabel (optional),
   *           onChange(i), onSettle(i), onAction(), onCancel() }   onChange(-1) = the text changed
   */
  function open(cfg) {
    close();
    Toast.hide(); // a leftover message would sit on top of the sheet's buttons
    config = cfg;
    title.textContent = cfg.title;
    action.textContent = cfg.actionLabel;
    cancelButton.hidden = !cfg.cancelLabel;
    cancelButton.textContent = cfg.cancelLabel || '';
    info.hidden = !cfg.info;
    info.innerHTML = cfg.info
      ? `<h3>${escapeHtml(cfg.info.heading)}</h3>` +
        cfg.info.details.map((detail) => `<p class="is-muted">${escapeHtml(detail)}</p>`).join('') +
        `<p>${escapeHtml(cfg.info.note)}</p>`
      : '';
    textField.hidden = !cfg.text;
    textField.value = cfg.text ? cfg.text.value || '' : '';
    textField.placeholder = cfg.text ? cfg.text.placeholder : '';
    for (const el of [labels, wheelsEl]) {
      el.style.gridTemplateColumns = cfg.columns;
      el.style.justifyContent = cfg.center ? 'center' : '';
    }
    labels.innerHTML = cfg.labels.map((l) => `<span${l.left ? ' class="is-left"' : ''}>${escapeHtml(l.text)}</span>`).join('');

    wheelsEl.replaceChildren();
    const wheels = cfg.wheels.map((spec, i) => {
      const wheel = createWheel({
        label: spec.label,
        align: spec.align,
        onChange: () => { if (config === cfg && cfg.onChange) cfg.onChange(i); },
        onSettle: () => { if (config === cfg && cfg.onSettle) cfg.onSettle(i); },
      });
      wheelsEl.appendChild(wheel.el);
      return wheel;
    });

    backdrop.hidden = false;
    sheet.classList.add('is-open');
    behind.forEach((el) => { el.inert = true; });
    wheels.forEach((wheel, i) => wheel.setItems(cfg.wheels[i].items, cfg.wheels[i].index));
    updateTyping();
    if (wheels.length && !sheet.classList.contains('is-typing')) wheels[0].el.focus({ preventScroll: true });
    else if (!textField.hidden) textField.focus({ preventScroll: true });
    else action.focus({ preventScroll: true });
    return wheels;
  }

  function close() {
    if (!config) return null;
    const cfg = config;
    config = null;
    sheet.classList.remove('is-open');
    backdrop.hidden = true;
    behind.forEach((el) => { el.inert = false; });
    if (sheet.contains(document.activeElement)) document.activeElement.blur();
    return cfg;
  }

  function cancel() {
    const cfg = close();
    if (cfg && cfg.onCancel) cfg.onCancel();
  }

  action.addEventListener('click', () => {
    const cfg = close();
    if (cfg) cfg.onAction();
  });
  backdrop.addEventListener('click', cancel);
  cancelButton.addEventListener('click', cancel);

  textField.addEventListener('input', () => {
    updateTyping();
    if (config && config.onChange) config.onChange(-1);
  });
  textField.addEventListener('focus', updateTyping);
  // Wait a moment before unfolding the wheels, so a tap on the button still lands on it.
  textField.addEventListener('blur', () => setTimeout(updateTyping, 250));
  textField.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    action.click();
  });

  document.addEventListener('keydown', (e) => {
    if (!config) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter' && e.target.classList.contains('wheel')) {
      e.preventDefault();
      action.click();
    }
  });

  // Keep the paper underneath still while the sheet is up.
  sheet.addEventListener('touchmove', (e) => { if (!e.target.closest('.wheel')) e.preventDefault(); }, { passive: false });
  backdrop.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  backdrop.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

  // Ride on top of the on-screen keyboard.
  if (window.visualViewport) {
    const viewport = window.visualViewport;
    const lift = () => {
      sheet.style.bottom = `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`;
    };
    viewport.addEventListener('resize', lift);
    viewport.addEventListener('scroll', lift);
  }

  return {
    open,
    cancel,
    text,
    isOpen: () => config !== null,
    height: () => sheet.offsetHeight,
  };
})();
