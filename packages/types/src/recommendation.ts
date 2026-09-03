import type { Id } from './primitives';
import type { RecipeSummary } from './recipe';

/**
 * Explainable score breakdown returned by the recommendation engine.
 * Each component is normalized to [0, 1] and multiplied by the weight
 * documented in `docs/recommendation-engine.md`.
 */
export interface ScoreBreakdown {
  pantryMatch: number;
  cuisinePreference: number;
  historyDiversity: number;
  timeFit: number;
  favoritesBoost: number;
  feedbackAdjustment: number;
  householdFit: number;
  difficultyFit: number;
  mealTypeFit: number;
  exposurePenalty: number;
  dailyVariation: number;
}

export interface Recommendation {
  recipe: RecipeSummary;
  score: number;
  breakdown: ScoreBreakdown;
  /** Human-readable explanation, e.g. "Uses 6 of 8 ingredients you already have". */
  reason: string;
  missingIngredientIds: Id[];
  /** True if the recipe passed all hard safety filters (allergies, dietary). */
  safetyOk: true;
}

export interface RecommendationRequestContext {
  /** ISO date, used together with the userId to seed daily variation. */
  today: string;
  userId: Id;
  quickFilter?:
    | 'time_20'
    | 'time_30'
    | 'time_45'
    | 'time_60_plus'
    | 'quick_meal'
    | 'vegetarian'
    | 'use_what_i_have'
    | 'family_friendly'
    | 'surprise_me'
    | { kind: 'cuisine'; cuisineId: Id };
  limit?: number;
}
