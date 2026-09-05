#!/usr/bin/env node
/**
 * Push the bundled demo ingredient catalogue into a Supabase `ingredients`
 * table via the service key. Idempotent — upserts by `slug`.
 *
 * Why this exists:
 * - The import pipeline (`packages/recipe-import`) normalizes TheMealDB
 *   ingredient names against the demo dataset in `packages/database/src/demo`
 *   and returns matches. Those matches were failing to promote because the
 *   demo IDs are strings like `ing_sugar`, not Postgres UUIDs.
 * - `promoteCandidate` now looks up ingredient UUIDs by name from the live
 *   DB. For that to actually resolve anything, the live DB has to contain
 *   the same catalogue. This script populates it.
 *
 * Env:
 *   SUPABASE_URL           – e.g. http://127.0.0.1:54321
 *   SUPABASE_SECRET_KEY    – sb_secret_* (or legacy SUPABASE_SERVICE_ROLE_KEY)
 *
 * Run:
 *   pnpm exec node --env-file=apps/web/.env.local \
 *     scripts/seed-supabase-ingredients.mjs
 *
 * Or set env vars inline and run bare `node scripts/seed-supabase-ingredients.mjs`.
 */
import { createClient } from '@supabase/supabase-js';
import { INGREDIENTS } from '@emrooz/database/seed';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const rows = INGREDIENTS.map((i) => ({
  slug: i.slug,
  name_en: i.name.en,
  category: i.category,
  common_units: i.commonUnits ?? [],
  allergens: i.allergens ?? [],
  dietary_compatibility: i.dietaryCompatibility ?? {},
}));

console.log(`Upserting ${rows.length} ingredients…`);
const { error, count } = await supabase
  .from('ingredients')
  .upsert(rows, { onConflict: 'slug', count: 'exact' });
if (error) {
  console.error('Upsert failed:', error);
  process.exit(1);
}
console.log(`Done. ${count ?? rows.length} rows written.`);
