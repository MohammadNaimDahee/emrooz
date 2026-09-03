/**
 * Weighting for the recommendation score, per CLAUDE.md §17.
 * These are documented and explainable so the reason string can call out the
 * dominant contributor. Weights sum to 1.
 */
export const WEIGHTS = {
  pantryMatch: 0.4,
  cuisinePreference: 0.25,
  historyDiversity: 0.2,
  timeFit: 0.15,
} as const;

/** Small adjustments layered on top of the base weighted sum. */
export const ADJUSTMENTS = {
  favoritesBoost: 0.05,
  notTodayPenalty: 0.15,
  doNotLikePenalty: 0.35,
  tooDifficultPenalty: 0.1,
  takesTooLongPenalty: 0.1,
  householdFitBoost: 0.03,
  difficultyFitBoost: 0.05,
  mealTypeFitBoost: 0.05,
  recentExposurePenalty: 0.08,
  recentCookedPenalty: 0.12,
  dailyVariationRange: 0.06,
} as const;
