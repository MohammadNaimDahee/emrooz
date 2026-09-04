#!/usr/bin/env tsx
/**
 * Generate PNG mobile icons from the SVG mark that lives in `apps/web/public`.
 *
 * Runs via `pnpm mobile:icons`. Produces:
 *
 *   apps/mobile/assets/icon.png                       1024×1024  (source)
 *   apps/mobile/assets/adaptive-icon.png              1024×1024  (Android foreground layer)
 *   apps/mobile/assets/splash-icon.png                1200×1200  (splash centerpiece)
 *   apps/mobile/assets/favicon.png                       48×48   (Expo web)
 *
 * We rely on `sharp` for the raster conversion because it's a single native
 * dependency that ships with reasonable defaults for icon sizes, gamma, and
 * PNG compression.
 *
 * The generated files are committed so `expo prebuild` and EAS Build can
 * consume them without needing to install sharp on the build image.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import sharp from 'sharp';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const SVG_SOURCE = resolve(REPO_ROOT, 'apps/web/public/icon-512.svg');
const OUTPUT_DIR = resolve(REPO_ROOT, 'apps/mobile/assets');

interface IconTarget {
  filename: string;
  size: number;
  background: string;
  padding: number; // fraction of the size — 0.08 = 8% margin
}

const TARGETS: IconTarget[] = [
  { filename: 'icon.png', size: 1024, background: '#254D32', padding: 0.05 },
  // Android adaptive icons expect a foreground layer that's 108dp × 108dp with
  // the visible glyph within the middle 72dp; padding 25% keeps the icon safe.
  { filename: 'adaptive-icon.png', size: 1024, background: '#254D32', padding: 0.25 },
  // Splash screen centrepiece — Expo composes it against a plain background.
  { filename: 'splash-icon.png', size: 1200, background: '#FBF6EC', padding: 0.28 },
  { filename: 'favicon.png', size: 48, background: '#254D32', padding: 0.1 },
];

async function main(): Promise<void> {
  const svg = await readFile(SVG_SOURCE);
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const target of TARGETS) {
    const inner = Math.round(target.size * (1 - target.padding * 2));
    const paddingPx = Math.round((target.size - inner) / 2);
    const rendered = await sharp(svg, { density: 384 })
      .resize({ width: inner, height: inner, fit: 'contain' })
      .toBuffer();

    const composed = await sharp({
      create: {
        width: target.size,
        height: target.size,
        channels: 4,
        background: target.background,
      },
    })
      .composite([{ input: rendered, top: paddingPx, left: paddingPx }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    const outPath = resolve(OUTPUT_DIR, target.filename);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, composed);
    console.log(
      JSON.stringify({
        event: 'icon.written',
        target: target.filename,
        size: target.size,
        bytes: composed.byteLength,
      }),
    );
  }
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'icon.failed',
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(1);
});
