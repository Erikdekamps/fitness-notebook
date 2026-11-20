/** Small pure helpers. */

export function range(from, to) {
  const list = [];
  for (let n = from; n <= to; n++) list.push(n);
  return list;
}

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const round2 = (n) => Math.round(n * 100) / 100;
export const formatKg = (kg) => String(round2(kg));
export const cleanName = (s) => String(s).trim().replace(/\s+/g, ' ');
export const sameName = (a, b) => cleanName(a).toLowerCase() === cleanName(b).toLowerCase();
export const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function indexOr(list, value, fallback = 0) {
  const i = list.indexOf(value);
  return i === -1 ? fallback : i;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
