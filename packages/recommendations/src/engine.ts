import {
  checkDietarySafety,
  dailySeed,
  daysBetween,
  mulberry32,
  pantryMatch,
} from '@emrooz/core';
import type {
  CookingHistoryEntry,
  FavoriteEntry,
  Ingredient,
  Recipe,
  RecommendationFeedback,
  RecommendationImpression,
  ScoreBreakdown,
  UserPreferences,
} from '@emrooz/types';
import { toRecipeSummary } from '@emrooz/types';

import { ADJUSTMENTS, WEIGHTS } from './weights';
import { explain } from './explain';

export interface EngineInputs {
  today: string;
  userId: string;
  preferences: UserPreferences;
  pantry: ReadonlySet<string>;
  favorites: readonly FavoriteEntry[];
  history: readonly CookingHistoryEntry[];
  feedback: readonly RecommendationFeedback[];
  impressions: readonly RecommendationImpression[];
  recipes: readonly Recipe[];
  ingredients: Map<string, Ingredient>;
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
    | { kind: 'cuisine'; cuisineId: string };
  limit?: number;
}

export interface RankedRecipe {
  recipe: Recipe;
  score: number;
  breakdown: ScoreBreakdown;
  reason: string;
  missingIngredientIds: string[];
}

/**
 * Compute today's recommendations.
 *
 * The output is stable for the same (userId, today) tuple. Callers get an
 * explainable score breakdown and a short human-friendly reason string.
 *
 * Hard filters are applied unconditionally and are never relaxed to produce more
 * results (see CLAUDE.md §17 "Never relax allergy or dietary-safety rules").
 */
export function recommend(input: EngineInputs): RankedRecipe[] {
  const limit = input.limit ?? 3;
  const rng = mulberry32(dailySeed(input.userId, input.today));

  const quickFilter = input.quickFilter;
  const maxCookTime = resolveMaxCookTime(input.preferences.maxCookMinutes, quickFilter);
  const requireVegetarian = quickFilter === 'vegetarian';
  const requireCuisineId =
    typeof quickFilter === 'object' && quickFilter.kind === 'cuisine' ? quickFilter.cuisineId : undefined;

  const feedbackByRecipe = new Map<string, RecommendationFeedback[]>();
  for (const fb of input.feedback) {
    const list = feedbackByRecipe.get(fb.recipeId) ?? [];
    list.push(fb);
    feedbackByRecipe.set(fb.recipeId, list);
  }

  const favoriteSet = new Set(input.favorites.map((f) => f.recipeId));

  const daysSinceCooked = new Map<string, number>();
  for (const h of input.history) {
    const days = daysBetween(h.cookedOn, input.today);
    const prev = daysSinceCooked.get(h.recipeId);
    if (prev === undefined || days < prev) daysSinceCooked.set(h.recipeId, days);
  }

  const cuisineCounts = new Map<string, number>();
  for (const h of input.history) {
    const days = daysBetween(h.cookedOn, input.today);
    if (days > 30) continue;
    const recipe = input.recipes.find((r) => r.id === h.recipeId);
    if (!recipe) continue;
    for (const cid of recipe.cuisineIds) {
      cuisineCounts.set(cid, (cuisineCounts.get(cid) ?? 0) + 1);
    }
  }

  const exposureCount = new Map<string, number>();
  const twoWeeksAgo = new Date(input.today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  for (const imp of input.impressions) {
    exposureCount.set(imp.recipeId, (exposureCount.get(imp.recipeId) ?? 0) + 1);
  }

  const candidates: RankedRecipe[] = [];

  for (const recipe of input.recipes) {
    if (recipe.editorialState !== 'published') continue;
    if (maxCookTime !== undefined && recipe.totalMinutes > maxCookTime) continue;
    if (requireVegetarian && !recipe.dietaryTags.includes('vegetarian') && !recipe.dietaryTags.includes('vegan'))
      continue;
    if (requireCuisineId && !recipe.cuisineIds.includes(requireCuisineId)) continue;

    const safety = checkDietarySafety(recipe, input.ingredients, input.preferences);
    if (!safety.safe) continue;

    const match = pantryMatch(recipe, input.pantry);

    // "Use what I have" requires very high pantry match.
    if (quickFilter === 'use_what_i_have' && match.ratio < 0.6) continue;

    const breakdown = scoreRecipe({
      recipe,
      match,
      preferences: input.preferences,
      today: input.today,
      isFavorite: favoriteSet.has(recipe.id),
      feedback: feedbackByRecipe.get(recipe.id) ?? [],
      daysSinceCooked: daysSinceCooked.get(recipe.id),
      cuisineHistoryCounts: cuisineCounts,
      exposures: exposureCount.get(recipe.id) ?? 0,
      rng,
    });

    const score = combineScore(breakdown);
    candidates.push({
      recipe,
      score,
      breakdown,
      reason: explain(recipe, breakdown, match),
      missingIngredientIds: match.missing,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const chosen = quickFilter === 'surprise_me' ? shuffleTopN(candidates, rng, limit * 3, limit) : candidates.slice(0, limit);
  return chosen;
}

function resolveMaxCookTime(
  prefMax: number | undefined,
  quickFilter: EngineInputs['quickFilter'],
): number | undefined {
  const map: Partial<Record<string, number>> = {
    time_20: 20,
    time_30: 30,
    time_45: 45,
    quick_meal: 30,
  };
  const filterMax = typeof quickFilter === 'string' ? map[quickFilter] : undefined;
  if (prefMax === undefined) return filterMax;
  if (filterMax === undefined) return prefMax;
  return Math.min(prefMax, filterMax);
}

interface ScoringInputs {
  recipe: Recipe;
  match: ReturnType<typeof pantryMatch>;
  preferences: UserPreferences;
  today: string;
  isFavorite: boolean;
  feedback: RecommendationFeedback[];
  daysSinceCooked: number | undefined;
  cuisineHistoryCounts: Map<string, number>;
  exposures: number;
  rng: () => number;
}

function scoreRecipe(s: ScoringInputs): ScoreBreakdown {
  const pantry = s.match.ratio;

  const cuisineMatches = s.preferences.cuisineIds.some((c) => s.recipe.cuisineIds.includes(c));
  const cuisinePreference = s.preferences.cuisineIds.length === 0 ? 0.6 : cuisineMatches ? 1 : 0.2;

  const cookedRecentlyDays = s.daysSinceCooked;
  const historyDiversity =
    cookedRecentlyDays === undefined
      ? 1
      : cookedRecentlyDays >= 30
        ? 0.9
        : cookedRecentlyDays >= 14
          ? 0.6
          : cookedRecentlyDays >= 7
            ? 0.3
            : 0;

  const timeFit = timeFitScore(s.recipe.totalMinutes, s.preferences.maxCookMinutes);

  const favoritesBoost = s.isFavorite ? ADJUSTMENTS.favoritesBoost : 0;

  let feedbackAdjustment = 0;
  for (const fb of s.feedback) {
    if (fb.feedback === 'not_today') feedbackAdjustment -= ADJUSTMENTS.notTodayPenalty;
    else if (fb.feedback === 'do_not_like') feedbackAdjustment -= ADJUSTMENTS.doNotLikePenalty;
    else if (fb.feedback === 'too_difficult') feedbackAdjustment -= ADJUSTMENTS.tooDifficultPenalty;
    else if (fb.feedback === 'takes_too_long') feedbackAdjustment -= ADJUSTMENTS.takesTooLongPenalty;
  }

  const householdFit =
    s.preferences.householdSize > 1 && s.recipe.servings >= s.preferences.householdSize
      ? ADJUSTMENTS.householdFitBoost
      : 0;

  const difficultyFit =
    s.preferences.preferredDifficulty && s.preferences.preferredDifficulty === s.recipe.difficulty
      ? ADJUSTMENTS.difficultyFitBoost
      : 0;

  // Meal-type fit favors dinner recipes in the evening, breakfast in the morning, etc.
  const hour = new Date().getHours();
  const preferredMeal = hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 22 ? 'dinner' : 'snack';
  const mealTypeFit = s.recipe.mealTypes.includes(preferredMeal) ? ADJUSTMENTS.mealTypeFitBoost : 0;

  const exposurePenalty = Math.min(s.exposures, 3) * (ADJUSTMENTS.recentExposurePenalty / 3);

  const dailyVariation = (s.rng() - 0.5) * ADJUSTMENTS.dailyVariationRange;

  return {
    pantryMatch: pantry,
    cuisinePreference,
    historyDiversity,
    timeFit,
    favoritesBoost,
    feedbackAdjustment,
    householdFit,
    difficultyFit,
    mealTypeFit,
    exposurePenalty: -exposurePenalty,
    dailyVariation,
  };
}

function timeFitScore(totalMinutes: number, maxCookMinutes: number | undefined): number {
  if (maxCookMinutes === undefined) return 0.7;
  if (totalMinutes <= maxCookMinutes * 0.5) return 1;
  if (totalMinutes <= maxCookMinutes * 0.75) return 0.85;
  if (totalMinutes <= maxCookMinutes) return 0.7;
  return 0; // exceeds max — hard-filtered upstream, safety net
}

function combineScore(b: ScoreBreakdown): number {
  const base =
    WEIGHTS.pantryMatch * b.pantryMatch +
    WEIGHTS.cuisinePreference * b.cuisinePreference +
    WEIGHTS.historyDiversity * b.historyDiversity +
    WEIGHTS.timeFit * b.timeFit;
  return (
    base +
    b.favoritesBoost +
    b.feedbackAdjustment +
    b.householdFit +
    b.difficultyFit +
    b.mealTypeFit +
    b.exposurePenalty +
    b.dailyVariation
  );
}

function shuffleTopN<T>(sorted: T[], rng: () => number, poolSize: number, take: number): T[] {
  const pool = sorted.slice(0, poolSize);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = pool[i]!;
    const b = pool[j]!;
    pool[i] = b;
    pool[j] = a;
  }
  return pool.slice(0, take);
}

/** Convenience wrapper that returns the same shape the app UI actually uses. */
export function recommendSummaries(input: EngineInputs) {
  return recommend(input).map((r) => ({
    ...r,
    summary: toRecipeSummary(r.recipe),
  }));
}
