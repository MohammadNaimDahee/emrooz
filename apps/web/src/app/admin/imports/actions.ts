'use server';
import { revalidatePath } from 'next/cache';

import { getServerSupabase } from '../../../lib/supabase-server';

async function requireEditor() {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('Backend not configured.');
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Sign in required.');
  const { data: staff } = await supabase
    .from('staff_members')
    .select('role')
    .eq('user_id', data.user.id)
    .in('role', ['admin', 'editor'] as never)
    .maybeSingle();
  if (!staff) throw new Error('Editor access required.');
  return supabase;
}

/**
 * Client-side StagedCandidate shape carried through from the imports UI.
 * Kept intentionally minimal — we only need the fields required to build a
 * new `recipes` row + its children. Anything richer stays in the raw
 * import payload for the reviewer to consult.
 */
export interface PromoteCandidateInput {
  providerRecipeId: string;
  title: string;
  provider: string;
  attributionText?: string;
  sourceUrl?: string;
  cuisineHints: string[];
  ingredientLines: Array<{
    raw: string;
    ingredient: string;
    quantity?: number;
    unit?: string;
  }>;
  resolvedIngredientIds: Array<string | null>;
  steps: string[];
}

const SLUG_MAX = 80;

function slugify(input: string, suffix: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX - suffix.length - 1);
  return `${base}-${suffix}`.slice(0, SLUG_MAX);
}

/**
 * Promote a staged import candidate to a draft recipe.
 *
 * - Ingredients that failed to normalise (null in resolvedIngredientIds) are
 *   skipped so the recipe compiles cleanly. The reviewer can fill them in
 *   from the editor before moving the recipe out of the `imported` state.
 * - Cuisine hints are matched case-insensitively against `cuisines.name_en`;
 *   unknown hints are ignored (again, reviewer resolves before publish).
 * - Provenance defaults to the provider's canonical shape so licensing
 *   metadata is captured immediately.
 * - The new recipe is state `imported`, which is a review-required state per
 *   CLAUDE.md §29.
 */
export async function promoteCandidate(input: PromoteCandidateInput): Promise<{ id: string }> {
  const supabase = await requireEditor();

  // Look up cuisine ids by name so we don't hard-code any mapping.
  const cuisineIds: string[] = [];
  if (input.cuisineHints.length > 0) {
    const orClause = input.cuisineHints
      .map((h) => `name_en.ilike.${h.replace(/[,()]/g, '')}`)
      .join(',');
    const { data } = await supabase.from('cuisines').select('id, name_en').or(orClause);
    for (const row of (data as { id: string; name_en: string }[] | null) ?? []) {
      if (input.cuisineHints.some((h) => h.toLowerCase() === row.name_en.toLowerCase())) {
        cuisineIds.push(row.id);
      }
    }
  }

  const slug = slugify(input.title, input.providerRecipeId);

  const { data: created, error } = await supabase
    .from('recipes')
    .insert({
      slug,
      title_en: input.title,
      prep_minutes: 0,
      cook_minutes: 0,
      total_minutes: 1, // constraint: total > 0. Reviewer fills in real values.
      difficulty: 'easy',
      meal_types: [],
      servings: 4,
      dietary_tags: [],
      allergens: [],
      content_owner: `${input.provider} contributors`,
      ownership_type: 'licensed',
      source_provider: input.provider,
      source_recipe_id: input.providerRecipeId,
      source_url: input.sourceUrl ?? null,
      attribution_text: input.attributionText ?? null,
      storage_permission: 'permanent',
      editorial_state: 'imported',
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const recipeId = created.id;

  if (cuisineIds.length > 0) {
    const { error: e2 } = await supabase
      .from('recipe_cuisines')
      .insert(cuisineIds.map((cuisine_id) => ({ recipe_id: recipeId, cuisine_id })));
    if (e2) throw new Error(`Cuisines: ${e2.message}`);
  }

  const ingredientRows = input.ingredientLines
    .map((line, i) => {
      const ingredient_id = input.resolvedIngredientIds[i];
      if (!ingredient_id) return null;
      return {
        recipe_id: recipeId,
        ingredient_id,
        position: i,
        quantity: line.quantity ?? null,
        unit: line.unit ?? null,
        note_en: null,
        optional: false,
        group_en: null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (ingredientRows.length > 0) {
    const { error: e3 } = await supabase.from('recipe_ingredients').insert(ingredientRows);
    if (e3) throw new Error(`Ingredients: ${e3.message}`);
  }

  if (input.steps.length > 0) {
    const { error: e4 } = await supabase.from('recipe_steps').insert(
      input.steps.map((text, i) => ({
        recipe_id: recipeId,
        step_order: i,
        text_en: text,
        duration_minutes: null,
      })),
    );
    if (e4) throw new Error(`Steps: ${e4.message}`);
  }

  revalidatePath('/admin/recipes');
  revalidatePath(`/admin/recipes/${recipeId}`);
  return { id: recipeId };
}
