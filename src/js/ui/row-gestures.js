/** Tap a row to change it, drag it left to delete it. */
import { RULE_INSET_PX, OPEN_OFFSET_PX, FULL_SWIPE } from '../config.js';
import { clamp } from '../util.js';

/**
 * Adds row gestures to a list. A row looks like:
 *   <div class="row" data-key="…"><div class="row-content">…</div><button class="row-delete">…</button></div>
 * A tap (or Enter) calls onTap(row, target), where target is what was tapped inside the row.
 * Dragging left reveals Delete; dragging far deletes at once. The Delete key deletes a focused row.
 * onDelete(row) runs after the row has animated away.
 */
export function createRowGestures(container, { onTap, onDelete }) {
  let gesture = null;
  let openRow = null;
  let swallowClick = false;

  function slide(row, x, animate) {
    const content = row.querySelector('.row-content');
    const button = row.querySelector('.row-delete');
    content.classList.toggle('is-animating', animate);
    button.classList.toggle('is-animating', animate);
    content.style.transform = x ? `translateX(${x}px)` : '';
    button.style.width = `${Math.max(0, -x - RULE_INSET_PX)}px`;
    if (!x) row.classList.remove('is-armed');
  }

  function closeOpenRow() {
    if (!openRow) return;
    slide(openRow, 0, true);
    openRow = null;
  }

  function removeRow(row) {
    if (row.classList.contains('is-removing')) return;
    row.classList.add('is-removing');
    if (row === openRow) openRow = null;
    slide(row, -row.offsetWidth, true);
    setTimeout(() => {
      row.style.height = `${row.offsetHeight}px`;
      void row.offsetHeight;
      row.classList.add('is-collapsing');
      row.style.height = '0px';
      setTimeout(() => onDelete(row), 180);
    }, 200);
  }

  // Touching anywhere else closes an open row; that touch does nothing else.
  document.addEventListener('pointerdown', (e) => {
    swallowClick = false;
    if (openRow && !openRow.contains(e.target)) {
      closeOpenRow();
      swallowClick = container.contains(e.target);
    }
  }, true);

  container.addEventListener('pointerdown', (e) => {
    gesture = null;
    if (swallowClick || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const row = e.target.closest('.row');
    if (!row || row.classList.contains('is-removing') || e.target.closest('input, .row-delete')) return;
    gesture = {
      row,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      from: row === openRow ? -OPEN_OFFSET_PX : 0,
      x: 0,
      axis: null,
    };
  });

  container.addEventListener('pointermove', (e) => {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      if (g.axis === 'y') {
        gesture = null; // a scroll: leave it to the browser
        return;
      }
      try { g.row.setPointerCapture(g.pointerId); } catch (_) { /* pointer already released */ }
    }
    const width = g.row.offsetWidth;
    g.x = clamp(g.from + dx, -width, 0);
    slide(g.row, g.x, false);
    g.row.classList.toggle('is-armed', -g.x > width * FULL_SWIPE);
  });

  function endGesture(e) {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    gesture = null;
    if (g.axis !== 'x') return;
    swallowClick = true;
    if (e.type === 'pointercancel') {
      slide(g.row, g.from, true);
      return;
    }
    const width = g.row.offsetWidth;
    if (-g.x > width * FULL_SWIPE) {
      removeRow(g.row);
    } else if (-g.x > OPEN_OFFSET_PX / 2) {
      if (openRow !== g.row) closeOpenRow();
      slide(g.row, -OPEN_OFFSET_PX, true);
      openRow = g.row;
    } else {
      slide(g.row, 0, true);
      if (openRow === g.row) openRow = null;
    }
  }
  container.addEventListener('pointerup', endGesture);
  container.addEventListener('pointercancel', endGesture);

  container.addEventListener('click', (e) => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    const deleteButton = e.target.closest('.row-delete');
    if (deleteButton) {
      removeRow(deleteButton.closest('.row'));
      return;
    }
    if (e.target.closest('input')) return;
    const row = e.target.closest('.row');
    if (!row || row.classList.contains('is-removing')) return;
    if (row === openRow) closeOpenRow();
    else onTap(row, e.target);
  });

  container.addEventListener('keydown', (e) => {
    const row = e.target;
    if (!row.classList || !row.classList.contains('row')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap(row, row);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeRow(row);
    }
  });

  return { closeOpenRow };
}
