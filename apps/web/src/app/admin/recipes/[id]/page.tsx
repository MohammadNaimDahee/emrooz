import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getServerSupabase } from '../../../../lib/supabase-server';
import { RecipeEditor } from '../editor-client';
import { TransitionBar } from '../transition-bar';
import { VersionsPanel } from '../versions-panel';

export const dynamic = 'force-dynamic';

interface RecipeRow {
  id: string;
  slug: string;
  title_en: string;
  description_en: string | null;
  origin_country_id: string | null;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  meal_types: string[];
  servings: number;
  dietary_tags: string[];
  allergens: string[];
  editorial_state: string;
  version: number;
  content_owner: string;
  ownership_type: string;
  source_provider: string | null;
  source_recipe_id: string | null;
  source_url: string | null;
  attribution_text: string | null;
  storage_permission: string;
  recipe_cuisines: { cuisine_id: string }[];
  recipe_regions: { region_id: string }[];
  recipe_ingredients: {
    ingredient_id: string;
    position: number | null;
    quantity: number | null;
    unit: string | null;
    note_en: string | null;
    optional: boolean;
    group_en: string | null;
  }[];
  recipe_steps: {
    step_order: number;
    text_en: string;
    duration_minutes: number | null;
  }[];
}

async function loadRecipe(id: string): Promise<RecipeRow | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from('recipes')
    .select(
      'id, slug, title_en, description_en, origin_country_id, prep_minutes, cook_minutes, total_minutes, difficulty, meal_types, servings, dietary_tags, allergens, editorial_state, version, content_owner, ownership_type, source_provider, source_recipe_id, source_url, attribution_text, storage_permission, recipe_cuisines(cuisine_id), recipe_regions(region_id), recipe_ingredients(ingredient_id, position, quantity, unit, note_en, optional, group_en), recipe_steps(step_order, text_en, duration_minutes)',
    )
    .eq('id', id)
    .maybeSingle<RecipeRow>();
  return data;
}

async function loadTaxonomies() {
  const supabase = await getServerSupabase();
  if (!supabase) return { cuisines: [], regions: [], countries: [], ingredients: [] };
  const [{ data: cuisines }, { data: regions }, { data: countries }, { data: ingredients }] = await Promise.all([
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

async function loadVersions(id: string) {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('recipe_versions')
    .select('id, version, change_reason, editor_id, created_at, snapshot')
    .eq('recipe_id', id)
    .order('version', { ascending: false })
    .limit(20);
  return (data as { id: string; version: number; change_reason: string | null; editor_id: string | null; created_at: string; snapshot: unknown }[] | null) ?? [];
}

export default async function EditRecipe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, tax, versions] = await Promise.all([loadRecipe(id), loadTaxonomies(), loadVersions(id)]);
  if (!recipe) notFound();

  const initial = {
    id: recipe.id,
    version: recipe.version,
    slug: recipe.slug,
    title_en: recipe.title_en,
    description_en: recipe.description_en ?? undefined,
    origin_country_id: recipe.origin_country_id,
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    total_minutes: recipe.total_minutes,
    difficulty: recipe.difficulty,
    meal_types: recipe.meal_types,
    servings: recipe.servings,
    dietary_tags: recipe.dietary_tags,
    allergens: recipe.allergens,
    content_owner: recipe.content_owner,
    ownership_type: recipe.ownership_type as 'emrooz_owned',
    source_provider: recipe.source_provider,
    source_recipe_id: recipe.source_recipe_id,
    source_url: recipe.source_url,
    attribution_text: recipe.attribution_text,
    storage_permission: recipe.storage_permission as 'permanent',
    cuisine_ids: recipe.recipe_cuisines.map((c) => c.cuisine_id),
    region_ids: recipe.recipe_regions.map((r) => r.region_id),
    ingredients: recipe.recipe_ingredients
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((i) => ({
        ingredient_id: i.ingredient_id,
        position: i.position ?? 0,
        quantity: i.quantity,
        unit: i.unit,
        note_en: i.note_en,
        optional: i.optional,
        group_en: i.group_en,
      })),
    steps: recipe.recipe_steps
      .slice()
      .sort((a, b) => a.step_order - b.step_order)
      .map((s) => ({
        step_order: s.step_order,
        text_en: s.text_en,
        duration_minutes: s.duration_minutes,
      })),
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-400">Editing</div>
          <h1 className="font-display text-4xl text-ink-900 mt-1">{recipe.title_en}</h1>
          <div className="text-sm text-ink-500 mt-1 flex flex-wrap gap-3">
            <span>state · <strong className="capitalize">{recipe.editorial_state.replace('_', ' ')}</strong></span>
            <span>version {recipe.version}</span>
            <Link
              href={`/recipes/${recipe.slug}`}
              className="text-emerald-700 hover:underline focus-ring"
              target="_blank"
              rel="noreferrer"
            >
              Preview public page →
            </Link>
          </div>
        </div>
        <TransitionBar recipeId={recipe.id} state={recipe.editorial_state as never} />
      </div>

      <RecipeEditor
        initial={initial}
        cuisines={tax.cuisines}
        regions={tax.regions}
        countries={tax.countries}
        ingredients={tax.ingredients}
      />

      <VersionsPanel versions={versions} />
    </div>
  );
}
