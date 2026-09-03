import { getServerSupabase } from '../../../lib/supabase-server';
import { IngredientsClient } from './client';

export const dynamic = 'force-dynamic';

interface IngredientRow {
  id: string;
  slug: string;
  name_en: string;
  category: string;
  common_units: string[];
  allergens: string[];
  dietary_compatibility: Record<string, string>;
}

interface AliasRow {
  ingredient_id: string;
  alias: string;
}

async function load(): Promise<{ ingredients: IngredientRow[]; aliases: Map<string, string[]> }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ingredients: [], aliases: new Map() };
  const [{ data: ing }, { data: al }] = await Promise.all([
    supabase.from('ingredients').select('*').order('name_en'),
    supabase.from('ingredient_aliases').select('ingredient_id, alias').eq('locale', 'en'),
  ]);
  const aliasMap = new Map<string, string[]>();
  for (const row of (al as AliasRow[] | null) ?? []) {
    const list = aliasMap.get(row.ingredient_id) ?? [];
    list.push(row.alias);
    aliasMap.set(row.ingredient_id, list);
  }
  return { ingredients: (ing as IngredientRow[] | null) ?? [], aliases: aliasMap };
}

export default async function AdminIngredientsPage() {
  const { ingredients, aliases } = await load();
  const initial = ingredients.map((i) => ({
    id: i.id,
    slug: i.slug,
    name_en: i.name_en,
    category: i.category,
    common_units: i.common_units ?? [],
    allergens: i.allergens ?? [],
    dietary_compatibility: (i.dietary_compatibility as Record<string, string>) ?? {},
    aliases: aliases.get(i.id) ?? [],
  }));
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-400">Taxonomy</div>
        <h1 className="font-display text-4xl text-ink-900 mt-1">Ingredients</h1>
        <p className="text-sm text-ink-500 mt-1">
          Canonical ingredient catalogue. Aliases feed the alias index used by pantry search and
          recommendations.
        </p>
      </div>
      <IngredientsClient rows={initial} />
    </div>
  );
}
