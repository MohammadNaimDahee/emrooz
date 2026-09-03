import type { Recipe } from '@emrooz/types';

export interface PantryMatch {
  /** Ingredient ids that the user already has. */
  matched: string[];
  /** Ingredient ids that the recipe requires but the user does not have. */
  missing: string[];
  /** Percentage 0..1 of required (non-optional) ingredients the user has. */
  ratio: number;
}

export function pantryMatch(
  recipe: Pick<Recipe, 'ingredients'>,
  pantry: ReadonlySet<string>,
): PantryMatch {
  const matched: string[] = [];
  const missing: string[] = [];
  let required = 0;
  for (const ing of recipe.ingredients) {
    if (ing.optional) continue;
    required += 1;
    if (pantry.has(ing.ingredientId)) matched.push(ing.ingredientId);
    else missing.push(ing.ingredientId);
  }
  return {
    matched,
    missing,
    ratio: required === 0 ? 1 : matched.length / required,
  };
}
