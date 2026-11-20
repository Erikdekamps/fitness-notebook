/** One iOS-style picker wheel. */
import { WHEEL_ITEM_PX } from '../config.js';
import { clamp, escapeHtml } from '../util.js';
import { onNextFrame } from '../dom.js';

/**
 * An iOS-style picker wheel. It is a native scroll container with scroll snapping,
 * so momentum and feel come from the browser. Works with touch, mouse wheel,
 * mouse drag, taps on an item and the arrow keys.
 */
export function createWheel({ label, align, onChange, onSettle }) {
  const el = document.createElement('div');
  el.className = align === 'left' ? 'wheel wheel--left' : 'wheel';
  el.tabIndex = 0;
  el.setAttribute('role', 'spinbutton');
  el.setAttribute('aria-label', label);

  let items = [];
  let current = -1;
  let settleTimer = 0;
  let drag = null;
  let swallowClick = false;
  const styled = new Set();
  const itemAt = (i) => el.children[i + 1]; // children[0] is the top padding

  /** Replaces the items. Must be called once the wheel is in the page. */
  function setItems(list, index) {
    items = list;
    el.innerHTML =
      '<div class="wheel-pad"></div>' +
      list.map((text, i) => `<div class="wheel-item" data-index="${i}">${escapeHtml(text)}</div>`).join('') +
      '<div class="wheel-pad"></div>';
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', String(list.length - 1));
    styled.clear();
    current = -1;
    if (align === 'left') fitText();
    setIndex(index, false);
  }

  /** Shrinks the text until the longest name fits, so names are never cut off. */
  function fitText() {
    el.style.fontSize = '';
    el.classList.add('is-measuring'); // measure at the bold weight of the picked row
    const nodes = Array.from(el.querySelectorAll('.wheel-item'));
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (size > 12 && nodes.some((node) => node.scrollWidth > node.clientWidth)) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    el.classList.remove('is-measuring');
  }

  /** Moves to an item. Instant moves are silent; smooth moves report changes as they scroll. */
  function setIndex(index, smooth) {
    const top = clamp(index, 0, items.length - 1) * WHEEL_ITEM_PX;
    if (smooth) {
      el.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    el.scrollTop = top;
    sync(true);
  }

  /** Shrinks and fades items away from the middle and reports a new pick. */
  function sync(silent) {
    if (!items.length) return;
    const position = el.scrollTop / WHEEL_ITEM_PX;
    const index = clamp(Math.round(position), 0, items.length - 1);
    const first = Math.max(0, Math.floor(position) - 3);
    const last = Math.min(items.length - 1, Math.ceil(position) + 3);

    for (const i of styled) {
      if (i >= first && i <= last) continue;
      const node = itemAt(i);
      node.style.transform = '';
      node.style.opacity = '';
      node.classList.remove('is-current');
      styled.delete(i);
    }
    for (let i = first; i <= last; i++) {
      const node = itemAt(i);
      const distance = Math.abs(i - position);
      node.style.transform = `scale(${Math.max(0.74, 1 - distance * 0.08).toFixed(3)})`;
      node.style.opacity = Math.max(0.3, 1 - distance * 0.24).toFixed(3);
      node.classList.toggle('is-current', i === index);
      styled.add(i);
    }

    if (index !== current) {
      current = index;
      el.setAttribute('aria-valuenow', String(index));
      el.setAttribute('aria-valuetext', items[index]);
      if (!silent && onChange) onChange(index);
    }
  }

  function settle() {
    clearTimeout(settleTimer);
    sync(false);
    if (onSettle) onSettle(current);
  }

  const syncOnFrame = onNextFrame(() => sync(false));
  el.addEventListener('scroll', () => {
    syncOnFrame();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 160);
  }, { passive: true });
  el.addEventListener('scrollend', settle);

  el.addEventListener('click', (e) => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    const item = e.target.closest('.wheel-item');
    if (item) setIndex(Number(item.dataset.index), true);
  });

  el.addEventListener('keydown', (e) => {
    const step = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key];
    let target = null;
    if (step) target = Math.round(el.scrollTop / WHEEL_ITEM_PX) + step;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = items.length - 1;
    if (target === null) return;
    e.preventDefault();
    el.scrollTop = clamp(target, 0, items.length - 1) * WHEEL_ITEM_PX; // the scroll event reports it
  });

  // Mouse drag (touch and trackpads scroll natively).
  el.addEventListener('pointerdown', (e) => {
    swallowClick = false;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { y: e.clientY, top: el.scrollTop, moved: false };
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 3) drag.moved = true;
    el.scrollTop = drag.top - dy;
  });
  function endDrag() {
    if (!drag) return;
    swallowClick = drag.moved;
    drag = null;
    el.classList.remove('is-dragging');
    setIndex(Math.round(el.scrollTop / WHEEL_ITEM_PX), true);
  }
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);
  el.addEventListener('lostpointercapture', endDrag);

  return {
    el,
    setItems,
    setIndex,
    get index() { return current; },
  };
}
