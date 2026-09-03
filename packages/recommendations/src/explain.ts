import type { Recipe, ScoreBreakdown } from '@emrooz/types';
import type { PantryMatch } from '@emrooz/core';

/**
 * Produce a short English explanation string. The recommendation engine is
 * expected to produce localized reasons at the presentation layer; this string
 * is a fallback and a debugging aid.
 */
export function explain(recipe: Recipe, b: ScoreBreakdown, match: PantryMatch): string {
  const required = match.matched.length + match.missing.length;
  if (b.pantryMatch >= 0.75) {
    return `Uses ${match.matched.length} of ${required} ingredients you already have.`;
  }
  if (b.cuisinePreference >= 0.9) {
    return `Matches a cuisine you love.`;
  }
  if (b.historyDiversity < 0.3) {
    return `A new twist from something you enjoyed recently.`;
  }
  if (recipe.totalMinutes <= 30) {
    return `Ready in ${recipe.totalMinutes} minutes.`;
  }
  return `A good fit for tonight.`;
}
