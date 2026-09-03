import { describe, expect, it } from 'vitest';
import type { Ingredient, Recipe, UserPreferences } from '@emrooz/types';

import { checkDietarySafety } from '../src/dietary';

function ing(id: string, over: Partial<Ingredient> = {}): Ingredient {
  return {
    id,
    slug: id,
    name: { en: id },
    aliases: { en: [] },
    category: 'other',
    commonUnits: [],
    allergens: over.allergens ?? [],
    dietaryCompatibility: over.dietaryCompatibility ?? {},
  };
}

function baseRecipe(over: Partial<Recipe> = {}): Pick<Recipe, 'ingredients' | 'allergens' | 'dietaryTags'> {
  return {
    ingredients: over.ingredients ?? [],
    allergens: over.allergens ?? [],
    dietaryTags: over.dietaryTags ?? [],
  };
}

function prefs(over: Partial<UserPreferences>): Pick<UserPreferences, 'allergens' | 'dietaryTags' | 'dislikedIngredientIds'> {
  return {
    allergens: over.allergens ?? [],
    dietaryTags: over.dietaryTags ?? [],
    dislikedIngredientIds: over.dislikedIngredientIds ?? [],
  };
}

describe('checkDietarySafety', () => {
  it('is safe when nothing conflicts', () => {
    const map = new Map([['rice', ing('rice', { dietaryCompatibility: { vegan: 'compatible' } })]]);
    const r = baseRecipe({
      ingredients: [{ ingredientId: 'rice' }],
      dietaryTags: ['vegan'],
    });
    const result = checkDietarySafety(r, map, prefs({ dietaryTags: ['vegan'] }));
    expect(result.safe).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('flags allergens contributed by ingredients', () => {
    const map = new Map([['milk', ing('milk', { allergens: ['dairy'] })]]);
    const r = baseRecipe({
      ingredients: [{ ingredientId: 'milk' }],
      allergens: [],
    });
    const result = checkDietarySafety(r, map, prefs({ allergens: ['dairy'] }));
    expect(result.safe).toBe(false);
    expect(result.reasons).toContainEqual({ kind: 'allergen', allergen: 'dairy' });
  });

  it('flags allergens declared at recipe level even when ingredient data is missing', () => {
    const map = new Map<string, Ingredient>();
    const r = baseRecipe({
      ingredients: [{ ingredientId: 'unknown' }],
      allergens: ['gluten'],
    });
    const result = checkDietarySafety(r, map, prefs({ allergens: ['gluten'] }));
    expect(result.safe).toBe(false);
    expect(result.reasons).toContainEqual({ kind: 'allergen', allergen: 'gluten' });
  });

  it('flags disliked ingredients as strict exclusions', () => {
    const map = new Map([['peanut', ing('peanut')]]);
    const r = baseRecipe({ ingredients: [{ ingredientId: 'peanut' }] });
    const result = checkDietarySafety(r, map, prefs({ dislikedIngredientIds: ['peanut'] }));
    expect(result.safe).toBe(false);
    expect(result.reasons).toContainEqual({ kind: 'disliked', ingredientId: 'peanut' });
  });

  it('accepts a recipe pre-tagged with the requested dietary tag', () => {
    // If the recipe declares itself vegan, we don't require ingredient-level
    // compatibility data — the recipe carries the promise.
    const map = new Map([['tofu', ing('tofu', { dietaryCompatibility: {} })]]);
    const r = baseRecipe({
      ingredients: [{ ingredientId: 'tofu' }],
      dietaryTags: ['vegan'],
    });
    const result = checkDietarySafety(r, map, prefs({ dietaryTags: ['vegan'] }));
    expect(result.safe).toBe(true);
  });

  it('rejects a recipe with an incompatible ingredient for a strict restriction', () => {
    const map = new Map([
      ['lamb', ing('lamb', { dietaryCompatibility: { vegan: 'incompatible' } })],
    ]);
    const r = baseRecipe({ ingredients: [{ ingredientId: 'lamb' }] });
    const result = checkDietarySafety(r, map, prefs({ dietaryTags: ['vegan'] }));
    expect(result.safe).toBe(false);
    expect(result.reasons).toContainEqual({ kind: 'dietary', tag: 'vegan' });
  });

  it('treats unknown dietary compatibility as unsafe under a strict restriction', () => {
    // CLAUDE.md §17: "Recipes with insufficient dietary-safety data when a
    // strict restriction requires certainty" are excluded.
    const map = new Map([['mystery', ing('mystery', { dietaryCompatibility: {} })]]);
    const r = baseRecipe({ ingredients: [{ ingredientId: 'mystery' }] });
    const result = checkDietarySafety(r, map, prefs({ dietaryTags: ['vegan'] }));
    expect(result.safe).toBe(false);
    expect(result.reasons).toContainEqual({ kind: 'missing_data', tag: 'vegan' });
  });

  it('treats an unknown ingredient reference as missing data', () => {
    const map = new Map<string, Ingredient>();
    const r = baseRecipe({ ingredients: [{ ingredientId: 'not_in_catalogue' }] });
    const result = checkDietarySafety(r, map, prefs({ dietaryTags: ['halal'] }));
    expect(result.safe).toBe(false);
    expect(result.reasons.some((x) => x.kind === 'missing_data')).toBe(true);
  });
});
