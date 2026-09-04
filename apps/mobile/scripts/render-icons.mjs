#!/usr/bin/env node
/**
 * Render the hand-drawn Emrooz brand mark from `assets/icon-source.svg` into
 * every size the mobile app + web app need.
 *
 * Mobile targets (Expo reads these from app.json):
 *
 *   assets/icon.png            1024×1024   iOS/generic icon
 *   assets/adaptive-icon.png   1024×1024   Android foreground layer (art
 *                                          centered in the safe 66% zone;
 *                                          Android crops the outer ring
 *                                          to a shape mask)
 *   assets/splash-icon.png     1200×1200   splash screen (Expo pads it)
 *   assets/favicon.png         48×48       Expo web build (metro bundler)
 *
 * Web targets (Next.js public/):
 *
 *   apps/web/public/favicon.svg     copy of the source SVG
 *   apps/web/public/icon-192.svg    same (Next.js webmanifest icons)
 *   apps/web/public/icon-512.svg
 *
 * Prereq: `rsvg-convert` (brew install librsvg).
 *
 * Run:  pnpm --filter @emrooz/mobile render-icons
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOBILE = resolve(HERE, '..');
const REPO = resolve(MOBILE, '..', '..');
const WEB_PUBLIC = resolve(REPO, 'apps', 'web', 'public');

const SOURCE = resolve(MOBILE, 'assets', 'icon-source.svg');
const SOURCE_WEB = resolve(MOBILE, 'assets', 'icon-web.svg');
if (!existsSync(SOURCE)) {
  console.error(`[render-icons] missing source: ${SOURCE}`);
  process.exit(1);
}
if (!existsSync(SOURCE_WEB)) {
  console.error(`[render-icons] missing web source: ${SOURCE_WEB}`);
  process.exit(1);
}

try {
  execSync('rsvg-convert --version', { stdio: 'ignore' });
} catch {
  console.error('[render-icons] rsvg-convert not found. Install with: brew install librsvg');
  process.exit(1);
}

function renderPng(source, out, size) {
  execSync(`rsvg-convert -w ${size} -h ${size} "${source}" -o "${out}"`, { stdio: 'inherit' });
  console.log(`  ✓ ${out.replace(REPO + '/', '')}  (${size}×${size})`);
}

function withPaddedCanvas(sourceSvg, padPercent) {
  // Wrap the source SVG in an outer canvas with padding, so Android's
  // adaptive-icon mask (which crops ~1/6 off each edge) still leaves
  // the art visible.
  const raw = readFileSync(sourceSvg, 'utf8');
  const viewBoxMatch = raw.match(/viewBox="([^"]+)"/);
  if (!viewBoxMatch) throw new Error('source SVG missing viewBox');
  const [, vb] = viewBoxMatch;
  const [minX, minY, w, h] = vb.split(/\s+/).map(Number);
  const pad = padPercent * Math.max(w, h);
  const outer = `${minX - pad} ${minY - pad} ${w + 2 * pad} ${h + 2 * pad}`;
  const wrapped = raw
    .replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${outer}">`)
    .replace(
      '<defs>',
      '<defs><style>rect#paper-bg{width:100%;height:100%;x:' +
        (minX - pad) +
        ';y:' +
        (minY - pad) +
        '}</style>',
    );
  // Simpler: re-emit a wrapper SVG that draws the paper background across the
  // padded canvas, then the source's contents inside. That keeps the pencil
  // art centered within the Android safe zone.
  const inner = raw
    .replace(/<\?xml[^?]+\?>/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*<svg[^>]*>/, '<g>')
    .replace(/<\/svg>\s*$/, '</g>');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${outer}">
  <rect x="${minX - pad}" y="${minY - pad}" width="${w + 2 * pad}" height="${h + 2 * pad}" fill="#FFF8ED"/>
  ${inner}
</svg>`;
}

console.log('[render-icons] rendering from', SOURCE.replace(REPO + '/', ''));

// Mobile icons
renderPng(SOURCE, resolve(MOBILE, 'assets', 'icon.png'), 1024);

// Android adaptive icon: pad the art so it survives the Android launcher's shape mask.
// Android reserves the outer ~33% of the canvas as parallax/mask area (safe zone = 66%).
const adaptiveSvg = resolve(MOBILE, 'assets', 'icon-adaptive.svg');
writeFileSync(adaptiveSvg, withPaddedCanvas(SOURCE, 0.22));
renderPng(adaptiveSvg, resolve(MOBILE, 'assets', 'adaptive-icon.png'), 1024);

renderPng(SOURCE, resolve(MOBILE, 'assets', 'splash-icon.png'), 1200);
renderPng(SOURCE, resolve(MOBILE, 'assets', 'favicon.png'), 48);

// Web icons — Next.js serves SVGs directly at all three slots. We use
// icon-web.svg (flat vector, no filters) so it renders crisply at browser
// favicon sizes (16×16, 32×32). The pencil-artwork master is only used
// for large mobile PNGs where the filters can breathe.
if (!existsSync(WEB_PUBLIC)) mkdirSync(WEB_PUBLIC, { recursive: true });
for (const name of ['favicon.svg', 'icon-192.svg', 'icon-512.svg']) {
  const dest = resolve(WEB_PUBLIC, name);
  copyFileSync(SOURCE_WEB, dest);
  console.log(`  ✓ ${dest.replace(REPO + '/', '')}`);
}

console.log('[render-icons] done');
