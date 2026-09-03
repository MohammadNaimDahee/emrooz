import { getServerSupabase } from '../../../lib/supabase-server';
import { CuisinesClient } from './client';

export const dynamic = 'force-dynamic';

async function load() {
  const supabase = await getServerSupabase();
  if (!supabase) return { cuisines: [], countries: [], recipeCounts: new Map<string, number>() };
  const [{ data: cuisines }, { data: countries }, { data: links }] = await Promise.all([
    supabase.from('cuisines').select('id, slug, name_en, primary_country_id').order('name_en'),
    supabase.from('countries').select('id, code, name_en').order('name_en'),
    supabase.from('recipe_cuisines').select('cuisine_id'),
  ]);
  const counts = new Map<string, number>();
  for (const l of (links as { cuisine_id: string }[] | null) ?? []) {
    counts.set(l.cuisine_id, (counts.get(l.cuisine_id) ?? 0) + 1);
  }
  return {
    cuisines: cuisines ?? [],
    countries: countries ?? [],
    recipeCounts: counts,
  };
}

export default async function AdminCuisinesPage() {
  const { cuisines, countries, recipeCounts } = await load();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-400">Taxonomy</div>
        <h1 className="font-display text-4xl text-ink-900 mt-1">Cuisines</h1>
        <p className="text-sm text-ink-500 mt-1">
          Cuisines are data-driven — recipes join them via <code>recipe_cuisines</code>. Add or edit
          entries here and every screen picks them up automatically.
        </p>
      </div>
      <CuisinesClient
        cuisines={cuisines.map((c) => ({
          ...c,
          recipe_count: recipeCounts.get(c.id) ?? 0,
        }))}
        countries={countries}
      />
    </div>
  );
}
