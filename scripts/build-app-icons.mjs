#!/usr/bin/env node
/**
 * Renders the Wordskiis app icons and splash screens (Android + iOS) from the
 * logo SVG using Playwright's Chromium. Run: node scripts/build-app-icons.mjs
 */
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG = '#0c0f15';
// The tile-stack mark on a 64×64 grid (same art as public/icon.svg, without its background).
const MARK = `
  <rect x="18" y="8" width="38" height="38" rx="9" fill="#f2b544" transform="rotate(8 37 27)"/>
  <rect x="8" y="18" width="38" height="38" rx="9" fill="#43d197"/>
  <path d="M15.5 28 L20 44.5 L27 32 L34 44.5 L38.5 28" fill="none" stroke="#04241a" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`;

/** markScale: fraction of the canvas the 64-unit mark should occupy. */
const svg = ({ w, h, markScale, background = true, round = false, radius = 0 }) => {
  const size = Math.min(w, h) * markScale;
  const x = (w - size) / 2;
  const y = (h - size) / 2;
  const bg = !background
    ? ''
    : round
      ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}" fill="${BG}"/>`
      : `<rect width="${w}" height="${h}" rx="${radius}" fill="${BG}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg}
    <g transform="translate(${x} ${y}) scale(${size / 64})">${MARK}</g></svg>`;
};

const jobs = [];
const res = (p) => join(root, 'android/app/src/main/res', p);
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(densities)) {
  const icon = 48 * k;
  jobs.push({ out: res(`mipmap-${d}/ic_launcher.png`), w: icon, h: icon, markScale: 0.78, radius: icon * 0.2 });
  jobs.push({ out: res(`mipmap-${d}/ic_launcher_round.png`), w: icon, h: icon, markScale: 0.72, round: true });
  // Adaptive icon foreground: 108dp canvas, art kept inside the 66dp safe zone.
  const fg = 108 * k;
  jobs.push({ out: res(`mipmap-${d}/ic_launcher_foreground.png`), w: fg, h: fg, markScale: 0.56, background: false });
}
const splash = {
  'drawable/splash.png': [480, 320],
  'drawable-land-mdpi/splash.png': [480, 320],
  'drawable-land-hdpi/splash.png': [800, 480],
  'drawable-land-xhdpi/splash.png': [1280, 720],
  'drawable-land-xxhdpi/splash.png': [1600, 960],
  'drawable-land-xxxhdpi/splash.png': [1920, 1280],
  'drawable-port-mdpi/splash.png': [320, 480],
  'drawable-port-hdpi/splash.png': [480, 800],
  'drawable-port-xhdpi/splash.png': [720, 1280],
  'drawable-port-xxhdpi/splash.png': [960, 1600],
  'drawable-port-xxxhdpi/splash.png': [1280, 1920],
};
for (const [p, [w, h]] of Object.entries(splash)) jobs.push({ out: res(p), w, h, markScale: 0.28 });

// iOS (if the iOS project exists): App Store icon (no transparency) + splash.
const ios = join(root, 'ios/App/App/Assets.xcassets');
if (existsSync(ios)) {
  jobs.push({ out: join(ios, 'AppIcon.appiconset/AppIcon-512@2x.png'), w: 1024, h: 1024, markScale: 0.72 });
  for (const n of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    jobs.push({ out: join(ios, 'Splash.imageset', n), w: 2732, h: 2732, markScale: 0.16 });
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const job of jobs) {
  if (!existsSync(dirname(job.out))) mkdirSync(dirname(job.out), { recursive: true });
  await page.setViewportSize({ width: Math.round(job.w), height: Math.round(job.h) });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg(job)}`);
  await page.locator('svg').screenshot({ path: job.out, omitBackground: true });
}
await browser.close();
console.log(`Rendered ${jobs.length} images`);
