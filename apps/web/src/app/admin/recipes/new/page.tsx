import { getServerSupabase } from '../../../../lib/supabase-server';
import { RecipeEditor } from '../editor-client';

export const dynamic = 'force-dynamic';

async function loadTaxonomies() {
  const supabase = await getServerSupabase();
  if (!supabase) return { cuisines: [], regions: [], countries: [], ingredients: [] };
  const [{ data: cuisines }, { data: regions }, { data: countries }, { data: ingredients }] =
    await Promise.all([
      supabase.from('cuisines').select('id, name_en').order('name_en'),
      supabase.from('regions').select('id, name_en, country_id').order('name_en'),
      supabase.from('countries').select('id, code, name_en').order('name_en'),
      supabase.from('ingredients').select('id, name_en, slug').order('name_en'),
    ]);
  return {
    cuisines: cuisines ?? [],
    regions: regions ?? [],
    countries: countries ?? [],
    ingredients: ingredients ?? [],
  };
}

export default async function NewRecipe() {
  const tax = await loadTaxonomies();
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-ink-400">Create</div>
      <h1 className="font-display text-4xl text-ink-900 mt-1 mb-6">New recipe</h1>
      <RecipeEditor
        cuisines={tax.cuisines}
        regions={tax.regions}
        countries={tax.countries}
        ingredients={tax.ingredients}
      />
    </div>
  );
}
