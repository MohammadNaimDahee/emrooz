import type { Recipe, RecipeIngredient } from '@emrooz/types';

/**
 * Scale a recipe's ingredient quantities from its baseline `servings`
 * to a target number of servings. Ingredients with no numeric quantity
 * (i.e. "to taste") are returned unchanged.
 */
export function scaleIngredients(
  recipe: Pick<Recipe, 'servings' | 'ingredients'>,
  targetServings: number,
): RecipeIngredient[] {
  if (targetServings <= 0 || recipe.servings <= 0) return recipe.ingredients;
  const factor = targetServings / recipe.servings;
  return recipe.ingredients.map((ing) =>
    typeof ing.quantity === 'number' ? { ...ing, quantity: roundNice(ing.quantity * factor) } : ing,
  );
}

function roundNice(v: number): number {
  if (v >= 100) return Math.round(v);
  if (v >= 10) return Math.round(v * 10) / 10;
  if (v >= 1) return Math.round(v * 100) / 100;
  return Math.round(v * 1000) / 1000;
}
