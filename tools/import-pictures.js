/**
 * Makes pictures/ from a copy of Workout Guide (https://github.com/bryllim/workout-guide).
 * For every machine in the app's list of drawings (the "pictures" block of index.html) it writes the three
 * frames of its drawing, changed in two ways (pictures/README.md says the same):
 *   - cut to what is drawn: one frame around all three, so the drawing keeps its place from frame to frame
 *   - colored in the notebook's pen blue, instead of white
 * The lines of the drawing are not changed.
 *
 *   git clone --depth 1 https://github.com/bryllim/workout-guide /tmp/workout-guide
 *   node tools/import-pictures.js /tmp/workout-guide
 *
 * It measures the drawings in Chromium, with Playwright. CHROMIUM=/path/to/chrome picks another Chromium.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { load } from '../tests/unit/load.js';

const PEN = '#1d3a8a'; // --pen in index.html
const MARGIN = 0.03; // room around the drawing, as a share of its longest side
const OUT = fileURLToPath(new URL('../pictures/', import.meta.url));

const source = process.argv[2];
if (!source || !existsSync(join(source, 'packages/workout-guide/assets'))) {
  console.error('Usage: node tools/import-pictures.js <a copy of github.com/bryllim/workout-guide>');
  process.exit(1);
}
const assets = join(source, 'packages/workout-guide/assets');
const { Pictures } = load('pictures');

/**
 * The box around all frames, with a margin: [x, y, width, height].
 * @returns {[number, number, number, number]}
 */
function frameAround(boxes) {
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const width = Math.max(...boxes.map((b) => b.x + b.width)) - left;
  const height = Math.max(...boxes.map((b) => b.y + b.height)) - top;
  const margin = Math.max(width, height) * MARGIN;
  const round = (n) => Math.round(n * 10) / 10;
  return [round(left - margin), round(top - margin), round(width + 2 * margin), round(height + 2 * margin)];
}

/** A frame of the drawing, cut to `box` and colored pen blue. */
function changed(svg, [x, y, width, height]) {
  const size = `width="${Math.round(width)}" height="${Math.round(height)}" viewBox="${x} ${y} ${width} ${height}"`;
  return svg.replace(/width="512" height="512" viewBox="0 0 512 512"/, size).replace(/fill="#fff"/g, `fill="${PEN}"`);
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  const page = await browser.newPage();
  for (const picture of readdirSync(OUT)) {
    if (!picture.includes('.') && !Pictures.has(picture)) rmSync(join(OUT, picture), { recursive: true });
  }
  for (const [, picture] of Pictures.CATALOG) {
    const frames = Pictures.FRAMES.map((n) => readFileSync(join(assets, picture, `frame-${n}.svg`), 'utf8'));
    const boxes = await page.evaluate((svgs) => svgs.map((svg) => {
      document.body.innerHTML = svg;
      const { x, y, width, height } = document.querySelector('svg').getBBox();
      return { x, y, width, height };
    }), frames);
    const box = frameAround(boxes);
    mkdirSync(join(OUT, picture), { recursive: true });
    frames.forEach((svg, i) => writeFileSync(join(OUT, picture, `frame-${i + 1}.svg`), changed(svg, box)));
  }
  console.log(`${Pictures.CATALOG.length} drawings written to pictures/`);
} finally {
  await browser.close();
}
