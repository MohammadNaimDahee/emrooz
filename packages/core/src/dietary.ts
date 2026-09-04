import type { Allergen, DietaryTag, Ingredient, Recipe, UserPreferences } from '@emrooz/types';

export interface DietarySafetyResult {
  safe: boolean;
  reasons: DietarySafetyReason[];
}

export type DietarySafetyReason =
  | { kind: 'allergen'; allergen: Allergen }
  | { kind: 'dietary'; tag: DietaryTag }
  | { kind: 'disliked'; ingredientId: string }
  | { kind: 'missing_data'; tag: DietaryTag };

/**
 * Evaluates whether a recipe is safe for a user given their allergies, strict dietary
 * restrictions, and disliked ingredients.
 *
 * Allergy and strict dietary rules are hard filters. When a strict dietary restriction
 * is requested but the recipe or its ingredients lack the compatibility data required
 * to confirm safety, the recipe is treated as unsafe. Emrooz never guesses on safety.
 */
export function checkDietarySafety(
  recipe: Pick<Recipe, 'ingredients' | 'allergens' | 'dietaryTags'>,
  ingredientLookup: Map<string, Ingredient>,
  prefs: Pick<UserPreferences, 'allergens' | 'dietaryTags' | 'dislikedIngredientIds'>,
): DietarySafetyResult {
  const reasons: DietarySafetyReason[] = [];

  // Allergens declared by the recipe or contributed by any ingredient.
  const contributed = new Set<Allergen>(recipe.allergens);
  for (const ri of recipe.ingredients) {
    const ing = ingredientLookup.get(ri.ingredientId);
    if (!ing) continue;
    for (const a of ing.allergens) contributed.add(a);
  }
  for (const allergen of prefs.allergens) {
    if (contributed.has(allergen)) reasons.push({ kind: 'allergen', allergen });
  }

  // Strict dietary restrictions — safety must be positively verifiable.
  for (const tag of prefs.dietaryTags) {
    if (recipe.dietaryTags.includes(tag)) continue;
    // Not tagged at recipe level — inspect the ingredients.
    let allCompatible = true;
    let hasIncompatible = false;
    let hasUnknown = false;
    for (const ri of recipe.ingredients) {
      const ing = ingredientLookup.get(ri.ingredientId);
      if (!ing) {
        hasUnknown = true;
        allCompatible = false;
        continue;
      }
      const c = ing.dietaryCompatibility[tag] ?? 'unknown';
      if (c === 'incompatible') {
        hasIncompatible = true;
        allCompatible = false;
      } else if (c === 'unknown') {
        hasUnknown = true;
        allCompatible = false;
      }
    }
    if (hasIncompatible) reasons.push({ kind: 'dietary', tag });
    else if (hasUnknown) reasons.push({ kind: 'missing_data', tag });
    else if (!allCompatible) reasons.push({ kind: 'missing_data', tag });
  }

  // Disliked ingredients — treated as hard exclusions when the user selected them
  // as such in preferences. We treat every entry in dislikedIngredientIds as strict.
  const disliked = new Set(prefs.dislikedIngredientIds);
  for (const ri of recipe.ingredients) {
    if (disliked.has(ri.ingredientId)) {
      reasons.push({ kind: 'disliked', ingredientId: ri.ingredientId });
    }
  }

  return { safe: reasons.length === 0, reasons };
}
