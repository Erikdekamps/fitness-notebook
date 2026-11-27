/**
 * Makes pictures/rotary-torso/: Workout Guide has no rotary torso, so this drawing is put together from two
 * of its drawings (pictures/README.md says the same):
 *   - below the waist: the person on the hip adduction machine (frame 1): the seat, the legs, the knee pads
 *   - above the waist: the person of the Russian twist, who turns (frame 1, 2, 3: to one side, ahead, to the other)
 *   - over the hands and the dumbbell: a chest pad, the pad the arms hold on a rotary torso
 * The lines that are used are not changed, only moved, made a little smaller, and cut off at the waist.
 *
 *   node tools/draw-rotary-torso.js
 *
 * Run it after tools/import-pictures.js: it reads those two drawings from pictures/.
 * It measures the drawing in Chromium, with Playwright. CHROMIUM=/path/to/chrome picks another Chromium.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PEN = '#1d3a8a'; // --pen in index.html
const PICTURES = fileURLToPath(new URL('../pictures/', import.meta.url));
const OUT = join(PICTURES, 'rotary-torso');
const MARGIN = 0.03; // room around the drawing, as a share of its longest side, as in tools/import-pictures.js

/** The outline of a drawing of pictures/: one path. */
const pathOf = (file) => readFileSync(join(PICTURES, file), 'utf8').match(/ d="([^"]*)"/)[1];

const SEAT = pathOf('hip-adduction-machine/frame-1.svg');
// Below the waist of the person on the seat. Not their right arm and hand, by the right knee.
const BELOW = '0,228 340,228 340,312 600,312 600,700 0,700';
const WAIST = [265, 228]; // where the upper body goes
const SCALE = 0.95; // the person of the Russian twist is drawn a little bigger

/**
 * Per frame, in the coordinates of the Russian twist: what is above the waist (not the legs), the chest pad over
 * the hands and the dumbbell, and the point of the waist that goes on WAIST.
 */
const FRAMES = [
  { above: '0,0 480,0 480,215 300,215 240,250 240,262 0,262', pad: [58, 204, 202, 300], waist: [150, 284] },
  { above: '0,0 480,0 480,302 0,302', pad: [204, 212, 302, 304], waist: [253, 300] },
  { above: '0,0 480,0 480,295 300,295 290,268 240,250 180,215 0,215', pad: [356, 236, 478, 336], waist: [360, 298] },
];

const r1 = (n) => Math.round(n * 10) / 10;

/** The inside of a frame (no <svg> around it): the seat and the legs, the upper body, and the chest pad. */
function drawing(n, { above, pad, waist }) {
  const twist = pathOf(`weighted-russian-twist/frame-${n}.svg`);
  const [tx, ty] = [r1(WAIST[0] - SCALE * waist[0]), r1(WAIST[1] - SCALE * waist[1])];
  const [x1, y1] = [tx + SCALE * pad[0], ty + SCALE * pad[1]];
  const [x2, y2] = [tx + SCALE * pad[2], ty + SCALE * pad[3]];
  const rect = (inset, r) => `x="${r1(x1 + inset)}" y="${r1(y1 + inset)}" width="${r1(x2 - x1 - 2 * inset)}" height="${r1(y2 - y1 - 2 * inset)}" rx="${r}"`;
  return `<defs><clipPath id="below"><polygon points="${BELOW}"/></clipPath>` +
    `<clipPath id="above"><polygon points="${above}"/></clipPath>` +
    // What is behind the pad does not show through it.
    `<mask id="pad" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1000" height="1000">` +
    `<rect x="-200" y="-200" width="1000" height="1000" fill="#fff"/><rect ${rect(0, 17)} fill="#000"/></mask></defs>` +
    `<g mask="url(#pad)" fill="${PEN}" fill-rule="evenodd"><path clip-path="url(#below)" d="${SEAT}"/>` +
    `<g transform="translate(${tx} ${ty}) scale(${SCALE})"><path clip-path="url(#above)" d="${twist}"/></g></g>` +
    `<g fill="none" stroke="${PEN}"><rect ${rect(3, 15)} stroke-width="6"/><rect ${rect(13, 8)} stroke-width="3"/></g>`;
}

const insides = FRAMES.map((frame, i) => drawing(i + 1, frame));

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const page = await browser.newPage();
  // One frame around all three, so the drawing keeps its place from frame to frame. Measured in pixels drawn
  // (getBBox would count the lines that are cut off), one pixel per unit, the page from -200 to 800.
  const boxes = await page.evaluate((all) => Promise.all(all.map(async (inside) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="-200 -200 1000 1000">${inside}</svg>`;
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await img.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: 1000, height: 1000 });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, 1000, 1000);
    let [x1, y1, x2, y2] = [1000, 1000, 0, 0];
    for (let y = 0; y < 1000; y++) {
      for (let x = 0; x < 1000; x++) {
        if (data[(y * 1000 + x) * 4 + 3] > 0) [x1, y1, x2, y2] = [Math.min(x1, x), Math.min(y1, y), Math.max(x2, x + 1), Math.max(y2, y + 1)];
      }
    }
    return { x: x1 - 200, y: y1 - 200, width: x2 - x1, height: y2 - y1 };
  })), insides);
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const width = Math.max(...boxes.map((b) => b.x + b.width)) - left;
  const height = Math.max(...boxes.map((b) => b.y + b.height)) - top;
  const margin = Math.max(width, height) * MARGIN;
  const box = [r1(left - margin), r1(top - margin), r1(width + 2 * margin), r1(height + 2 * margin)];
  const size = `width="${Math.round(box[2])}" height="${Math.round(box[3])}" viewBox="${box.join(' ')}"`;
  mkdirSync(OUT, { recursive: true });
  insides.forEach((inside, i) => writeFileSync(join(OUT, `frame-${i + 1}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" ${size}>${inside}</svg>`));
  console.log('3 frames written to pictures/rotary-torso/');
} finally {
  await browser.close();
}
