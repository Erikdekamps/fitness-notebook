/** Dates, stored as "YYYY-MM-DD" and always in local time. */
import { DAY_NAMES } from './config.js';

export const Dates = {
  toIso(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  },
  today() {
    const now = new Date();
    return Dates.toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
  },
  parts(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d };
  },
  daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  },
  /** How a date is written in the notebook: "18/11" + "wo" ("18/11/25" when it is not this year). */
  written(iso) {
    const { y, m, d } = Dates.parts(iso);
    const year = y === new Date().getFullYear() ? '' : '/' + String(y).slice(-2);
    return {
      date: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}${year}`,
      day: DAY_NAMES[new Date(y, m - 1, d).getDay()],
    };
  },
};
