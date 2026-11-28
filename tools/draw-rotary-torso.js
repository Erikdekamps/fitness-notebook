/**
 * Draws pictures/rotary-torso/: Workout Guide has no rotary torso, so this one is made here, in the style of the
 * others: a line drawing in pen blue, three frames of the move, no fill, so it sits on any paper.
 *
 *   node tools/draw-rotary-torso.js
 *
 * The kneeling rotary torso: you kneel on a knee pad that swivels, your chest against a pad, your hands on the
 * handles at the sides of it. The chest stays where it is; the knee pad, your knees and your hips turn to one side
 * (frame 1), back to the middle (2) and to the other side (3).
 *
 * The person and the machine are made of round tubes, balls and boxes in 3D, seen from the front and a little from
 * the side and above. Each part (a thigh, the head, the chest pad) is drawn as its outline: a filter keeps a thin
 * band along the edge of its shape, so the tubes and balls a part is made of show as one shape, with no seams.
 * A part hides what is behind it with a mask, nearest part in front.
 *
 * It measures the drawing in Chromium, with Playwright. CHROMIUM=/path/to/chrome picks another Chromium.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PEN = '#1d3a8a'; // --pen in index.html
const OUT = fileURLToPath(new URL('../pictures/rotary-torso/', import.meta.url));
const MARGIN = 0.03; // room around the drawing, as a share of its longest side, as in tools/import-pictures.js
const TURNS = [-34, 0, 34]; // degrees the knee pad turns, frame 1 to 3
const LINE = 1.5; // width of an outline
const DETAIL = 0.9; // width of a line inside a part
const YAW = (-32 * Math.PI) / 180; // the view: from the front, a little from the person's right
const PITCH = (14 * Math.PI) / 180; // and a little from above

const r2 = (n) => Math.round(n * 100) / 100;

/* ---- 3D ---- */

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const D = [Math.sin(YAW), 0, Math.cos(YAW)]; // toward the viewer, flat
const RIGHT = [Math.cos(YAW), 0, -Math.sin(YAW)];
const UP = add(scale([0, 1, 0], Math.cos(PITCH)), scale(D, -Math.sin(PITCH)));
const NEAR = add(scale(D, Math.cos(PITCH)), scale([0, 1, 0], Math.sin(PITCH)));

/** A point on the page: [x, y], and how near it is. */
const project = (p) => ({ x: dot(p, RIGHT), y: -dot(p, UP), near: dot(p, NEAR) });

/** Turns a point around the upright line through the middle of the knee pad. */
const turnY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];

/* ---- shapes on the page ---- */

/** A ball. */
function ball(c, r) {
  const { x, y } = project(c);
  return `M${r2(x - r)} ${r2(y)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0Z`;
}

/** A round tube from a (radius ra) to b (radius rb): two circles and the lines that touch both. */
function tube(a, ra, b, rb) {
  const p = project(a);
  const q = project(b);
  const d = Math.hypot(q.x - p.x, q.y - p.y);
  if (d + Math.min(ra, rb) <= Math.max(ra, rb)) return ra > rb ? ball(a, ra) : ball(b, rb);
  const t = Math.atan2(q.y - p.y, q.x - p.x);
  const s = Math.acos((ra - rb) / d);
  const at = (c, r, angle) => [c.x + r * Math.cos(angle), c.y + r * Math.sin(angle)];
  const [a1, b1, b2, a2] = [at(p, ra, t + s), at(q, rb, t + s), at(q, rb, t - s), at(p, ra, t - s)];
  const big = (span) => (span > Math.PI ? 1 : 0);
  return `M${r2(a1[0])} ${r2(a1[1])}L${r2(b1[0])} ${r2(b1[1])}` +
    `A${r2(rb)} ${r2(rb)} 0 ${big(2 * s)} 0 ${r2(b2[0])} ${r2(b2[1])}` +
    `L${r2(a2[0])} ${r2(a2[1])}A${r2(ra)} ${r2(ra)} 0 ${big(2 * Math.PI - 2 * s)} 0 ${r2(a1[0])} ${r2(a1[1])}Z`;
}

/** The outline around points on the page (gift wrapping). */
function hull(points) {
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list) => list.reduce((h, p) => {
    while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
    h.push(p);
    return h;
  }, []);
  const lower = half(sorted);
  const upper = half(sorted.slice().reverse());
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const line = (points) => points.map((p, i) => `${i ? 'L' : 'M'}${r2(p.x)} ${r2(p.y)}`).join('');

/**
 * A box: center c, size [x, y, z], turned `a` around the upright line through `pivot`. Its shape, and as lines
 * inside: the edges between the sides you see, and `marks` (lines across the front, such as weight plates).
 */
function box(c, [sx, sy, sz], a = 0, { marks = 0 } = {}) {
  const corner = (i) => add(c, [((i & 1) ? 0.5 : -0.5) * sx, ((i & 2) ? 0.5 : -0.5) * sy, ((i & 4) ? 0.5 : -0.5) * sz]);
  const corners3 = [...Array(8).keys()].map((i) => turnY(corner(i), a));
  const corners = corners3.map(project);
  const faces = [ // corner numbers, and which way the side looks
    [[0, 2, 6, 4], [-1, 0, 0]], [[1, 3, 7, 5], [1, 0, 0]],
    [[0, 1, 5, 4], [0, -1, 0]], [[2, 3, 7, 6], [0, 1, 0]],
    [[0, 1, 3, 2], [0, 0, -1]], [[4, 5, 7, 6], [0, 0, 1]],
  ];
  const seen = faces.filter(([, n]) => dot(turnY(n, a), NEAR) > 0.02).map(([f]) => f);
  const edges = new Map();
  for (const f of seen) {
    f.forEach((v, i) => {
      const w = f[(i + 1) % 4];
      const key = [Math.min(v, w), Math.max(v, w)].join();
      edges.set(key, (edges.get(key) || 0) + 1);
    });
  }
  const details = [...edges].filter(([, n]) => n === 2).map(([key]) => line(key.split(',').map((i) => corners[Number(i)])));
  for (let i = 1; i <= marks; i++) { // lines across the side that looks most at you
    const f = seen.slice().sort((f1, f2) => area(corners, f2) - area(corners, f1))[0];
    const k = i / (marks + 1);
    const mix = (u, v) => ({ x: u.x + (v.x - u.x) * k, y: u.y + (v.y - u.y) * k });
    details.push(line([mix(corners[f[0]], corners[f[3]]), mix(corners[f[1]], corners[f[2]])]));
  }
  return { shape: `${line(hull(corners))}Z`, details };
}

function area(corners, f) {
  const p = f.map((i) => corners[i]);
  return Math.abs(p.reduce((s, v, i) => s + v.x * p[(i + 1) % 4].y - p[(i + 1) % 4].x * v.y, 0)) / 2;
}

/* ---- the scene ---- */

/** The parts of one frame: { shapes, details, at } where `at` is a point of the part, for which is nearer. */
function scene(degrees) {
  const a = (degrees * Math.PI) / 180;
  const low = (p) => turnY(p, a); // the knee pad, the legs and the hips turn
  const waist = (p) => turnY(p, a * 0.45); // the belly turns a little
  const parts = [];
  const part = (at, shapes, details = []) => parts.push({ at, shapes, details });
  const tubeT = (f, p, rp, q, rq) => tube(f(p), rp, f(q), rq);

  // The machine: the floor frame, the post under the knee pad, the knee pad.
  const base = box([12, -26, 6], [56, 6, 84]);
  part([12, -26, 6], [base.shape], base.details);
  part([0, -14, -6], [tube([0, -23, -6], 3.2, [0, -7, -6], 3.2)]);
  const kneePad = box([0, -3, -11], [34, 7, 48], a);
  part(low([0, -3, -11]), [kneePad.shape], kneePad.details);

  // At the far side: the column that holds the chest pad, its arm over to the pad, and the weight stack behind.
  part([30, 42, 22], [tube([30, -23, 22], 3.2, [30, 100, 22], 3.2)]);
  part([22, 84, 20], [tube([30, 84, 22], 2.4, [13, 84, 20], 2.4)]);
  const tower = box([40, 38, 46], [16, 122, 12], 0);
  part([40, 38, 46], [tower.shape], tower.details);
  const stack = box([40, 6, 52.4], [11, 36, 0.8], 0, { marks: 9 });
  // The plates are on the front of the tower, so in front of it.
  part([40, 60, 54], [stack.shape], stack.details);
  part([30, 100, 34], [tube([30, 100, 22], 2.6, [34, 98, 40], 2.6)]);

  // The person, kneeling: shins and feet back on the knee pad, thighs up, hips, belly, chest, shoulders, head.
  for (const s of [-1, 1]) {
    part(low([s * 9, 3, -20]), [tubeT(low, [s * 9, 5, 4], 5.6, [s * 8.5, 3.6, -29], 3.6), tubeT(low, [s * 8.5, 3.6, -29], 3.4, [s * 8.5, 1.8, -41], 2.8)]);
    part(low([s * 9, 26, 3]), [tubeT(low, [s * 9, 5, 4], 6.4, [s * 9.5, 30, 2], 8), tubeT(low, [s * 9.5, 30, 2], 8, [s * 9.5, 44, 1], 8.8)]);
  }
  part(low([0, 46, 1]), [tubeT(low, [-9, 46, 1], 11, [9, 46, 1], 11)], [line([project(low([-17, 54, 3])), project(low([0, 56, 9])), project(low([17, 54, 3]))])]);
  part(waist([0, 70, 3]), [
    tubeT(waist, [0, 52, 2], 12.5, [0, 64, 3], 13),
    tube([-9, 78, 3], 13, [9, 78, 3], 13),
    tube([-20, 90, 0], 7.6, [20, 90, 0], 7.6),
    tube([-8, 92, 0], 8.5, [8, 92, 0], 8.5),
  ]);
  part([0, 106, 1], [tube([0, 92, 0], 5.8, [0, 101, 1], 5.4), tube([0, 108, 2], 8.6, [0, 115, 1.5], 8.2)]);

  // The chest pad, and the handles at its sides.
  const chestPad = box([0, 82, 19.5], [28, 24, 5]);
  part([0, 82, 19.5], [chestPad.shape], chestPad.details);
  for (const s of [-1, 1]) {
    part([s * 16, 89, 21], [tube([s * 14, 80, 21], 1.7, [s * 17.5, 80, 22], 1.7), tube([s * 17.5, 80, 22], 1.7, [s * 17.5, 98, 23], 1.7)]);
  }

  // The arms: from the shoulder down to the elbow, then forward and up to the hand on the handle.
  for (const s of [-1, 1]) {
    part([s * 23, 83, 5], [tube([s * 22, 90, 0], 7.4, [s * 25, 75, 10], 5.4)]);
    part([s * 21, 82, 17], [tube([s * 25, 75, 10], 5.2, [s * 18, 88, 22], 4.2), ball([s * 17.5, 89.5, 23], 4.8)]);
  }
  return parts;
}

/* ---- the SVG ---- */

/** The inside of a frame (no <svg> around it): each part as its outline, masked by the parts nearer than it. */
function drawing(degrees, n) {
  const parts = scene(degrees).map((p) => ({ ...p, near: project(p.at).near })).sort((p, q) => p.near - q.near);
  const area = 'x="-200" y="-300" width="600" height="600"';
  const id = (name) => `f${n}${name}`;
  let defs = `<filter id="${id('o')}" filterUnits="userSpaceOnUse" ${area}>` +
    `<feMorphology in="SourceAlpha" operator="erode" radius="${LINE}" result="in"/>` +
    `<feComposite in="SourceGraphic" in2="in" operator="out"/></filter>`;
  parts.forEach((p, i) => { defs += `<path id="${id(`s${i}`)}" d="${p.shapes.join('')}"/>`; });
  let body = '';
  parts.forEach((p, i) => {
    const nearer = parts.slice(i + 1).map((_, j) => `<use href="#${id(`s${i + 1 + j}`)}"/>`).join('');
    if (nearer) defs += `<mask id="${id(`m${i}`)}" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#fff"/><g fill="#000">${nearer}</g></mask>`;
    const lines = p.details.length ? `<path d="${p.details.join('')}" fill="none" stroke="${PEN}" stroke-width="${DETAIL}" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    body += `<g${nearer ? ` mask="url(#${id(`m${i}`)})"` : ''}><use href="#${id(`s${i}`)}" fill="${PEN}" filter="url(#${id('o')})"/>${lines}</g>`;
  });
  return `<defs>${defs}</defs>${body}`;
}

const insides = TURNS.map((degrees, i) => drawing(degrees, i + 1));

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const page = await browser.newPage();
  // One frame around all three, so the drawing keeps its place from frame to frame. Measured in pixels drawn,
  // four pixels per unit, the page from -100 to 100 across and -150 to 50 down.
  const boxes = await page.evaluate((all) => Promise.all(all.map(async (inside) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="-100 -150 200 200">${inside}</svg>`;
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await img.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: 800, height: 800 });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, 800, 800);
    let [x1, y1, x2, y2] = [800, 800, 0, 0];
    for (let y = 0; y < 800; y++) {
      for (let x = 0; x < 800; x++) {
        if (data[(y * 800 + x) * 4 + 3] > 0) [x1, y1, x2, y2] = [Math.min(x1, x), Math.min(y1, y), Math.max(x2, x + 1), Math.max(y2, y + 1)];
      }
    }
    return { x: x1 / 4 - 100, y: y1 / 4 - 150, width: (x2 - x1) / 4, height: (y2 - y1) / 4 };
  })), insides);
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const width = Math.max(...boxes.map((b) => b.x + b.width)) - left;
  const height = Math.max(...boxes.map((b) => b.y + b.height)) - top;
  const margin = Math.max(width, height) * MARGIN;
  const box = [r2(left - margin), r2(top - margin), r2(width + 2 * margin), r2(height + 2 * margin)];
  // Drawn 3 times bigger than the units, like the size of the other drawings.
  const size = `width="${Math.round(box[2] * 3)}" height="${Math.round(box[3] * 3)}" viewBox="${box.join(' ')}"`;
  mkdirSync(OUT, { recursive: true });
  insides.forEach((inside, i) => writeFileSync(join(OUT, `frame-${i + 1}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" ${size}>${inside}</svg>\n`));
  console.log('3 frames written to pictures/rotary-torso/');
} finally {
  await browser.close();
}
