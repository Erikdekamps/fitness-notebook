/** Every fixed value of the app in one place. */
import { range } from './util.js';

export const STORAGE_KEY = 'fitness-notebook.v1';
export const DAY_NAMES = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']; // Dutch, as in the paper notebook
export const MONTH_NAMES = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const KG_STEP = 2.5;          // every notch on the kg wheel
export const KG_MAX = 300;
export const SETS = range(1, 10);
export const REPS = range(1, 50);
export const FIRST_TIME_VALUES = { weight: 20, sets: 3, reps: 12 };
export const YEARS_BACK = 5;

export const WHEEL_ITEM_PX = 36;     // keep in sync with --wheel-item
export const DELETE_WIDTH_PX = 96;   // width of the revealed Delete button
export const RULE_INSET_PX = 20;     // keep in sync with --rule-inset
export const OPEN_OFFSET_PX = DELETE_WIDTH_PX + RULE_INSET_PX; // how far a row slides to show Delete
export const FULL_SWIPE = 0.55;      // drag this share of the row to delete in one go
export const UNDO_MS = 5000;
export const PREVIEW_ID = '__preview__';
export const BLANK_ROW = '<div class="blank" aria-hidden="true"></div>';

export const svg = (w, h, stroke, body) =>
  `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" stroke="currentColor" stroke-width="${stroke}" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const Icons = {
  up: svg(16, 22, 2, '<path d="M8 20V3M2 9l6-6 6 6"/>'),
  down: svg(16, 22, 2, '<path d="M8 2v17M2 13l6 6 6-6"/>'),
};
