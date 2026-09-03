#!/usr/bin/env tsx
/**
 * Export every published recipe (and everything it references) as canonical
 * Emrooz JSON. The output format is stable and versioned so a self-hosted
 * copy can consume it directly via `pnpm recipes:import`.
 *
 * Called via `pnpm recipes:export -- --out=./out.json`.
 *
 * Reads from either:
 *   - Supabase (when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set)
 *   - The bundled demo seed (fallback — useful for CI and for developers
 *     without a live database)
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { COUNTRIES, CUISINES, INGREDIENTS, RECIPES, REGIONS } from '@emrooz/database/seed';

interface CliArgs {
  out: string;
  pretty: boolean;
}

function parseArgs(): CliArgs {
  let out = './emrooz-recipes-export.json';
  let pretty = true;
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith('--out=')) out = raw.slice('--out='.length);
    else if (raw === '--min') pretty = false;
  }
  return { out: resolve(out), pretty };
}

function log(event: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...extra }));
}

async function loadFromSupabase(supabase: SupabaseClient) {
  const [{ data: recipes }, { data: cuisines }, { data: countries }, { data: regions }, { data: ingredients }] =
    await Promise.all([
      supabase
        .from('recipes')
        .select(
          '*, recipe_cuisines(cuisine_id), recipe_regions(region_id), recipe_ingredients(*), recipe_steps(*), media_assets(*)',
        )
        .eq('editorial_state', 'published'),
      supabase.from('cuisines').select('*'),
      supabase.from('countries').select('*'),
      supabase.from('regions').select('*'),
      supabase.from('ingredients').select('*'),
    ]);
  return {
    recipes: recipes ?? [],
    cuisines: cuisines ?? [],
    countries: countries ?? [],
    regions: regions ?? [],
    ingredients: ingredients ?? [],
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  log('export.start', { out: args.out });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let payload: unknown;

  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    log('export.source', { source: 'supabase' });
    const data = await loadFromSupabase(supabase);
    payload = {
      emroozExport: {
        version: 1,
        generatedAt: new Date().toISOString(),
        source: 'supabase',
      },
      ...data,
    };
  } else {
    log('export.source', { source: 'demo-seed' });
    payload = {
      emroozExport: {
        version: 1,
        generatedAt: new Date().toISOString(),
        source: 'demo-seed',
      },
      recipes: RECIPES,
      cuisines: CUISINES,
      countries: COUNTRIES,
      regions: REGIONS,
      ingredients: INGREDIENTS,
    };
  }

  await writeFile(args.out, JSON.stringify(payload, null, args.pretty ? 2 : 0), 'utf8');
  log('export.done', { out: args.out });
}

main().catch((err) => {
  console.error(JSON.stringify({ event: 'export.failed', message: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
