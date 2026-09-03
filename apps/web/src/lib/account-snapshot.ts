import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shape of the account export payload. Kept stable so users can rely on
 * it for re-import into a self-hosted copy or a future data-portability tool.
 * When adding new user-scoped tables, add them to the query set below AND
 * to the type here.
 */
export interface AccountSnapshot {
  emroozExport: {
    version: 1;
    generatedAt: string;
    userId: string;
  };
  profile: unknown;
  preferences: unknown;
  pantryItems: unknown[];
  favorites: unknown[];
  cookingHistory: unknown[];
  recommendationFeedback: unknown[];
  recommendationImpressions: unknown[];
  mealPlanEntries: unknown[];
  shoppingListItems: unknown[];
}

/**
 * Read every user-scoped row for `userId` through `supabase`. Relies on
 * Row Level Security to enforce ownership — the passed-in client should be
 * bound to that user's session.
 */
export async function buildAccountSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccountSnapshot> {
  const results = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('pantry_items').select('*').eq('user_id', userId),
    supabase.from('favorites').select('*').eq('user_id', userId),
    supabase.from('cooking_history').select('*').eq('user_id', userId),
    supabase.from('recommendation_feedback').select('*').eq('user_id', userId),
    supabase.from('recommendation_impressions').select('*').eq('user_id', userId),
    supabase.from('meal_plan_entries').select('*').eq('user_id', userId),
    supabase.from('shopping_list_items').select('*').eq('user_id', userId),
  ]);

  return {
    emroozExport: {
      version: 1,
      generatedAt: new Date().toISOString(),
      userId,
    },
    profile: results[0]?.data ?? null,
    preferences: results[1]?.data ?? null,
    pantryItems: results[2]?.data ?? [],
    favorites: results[3]?.data ?? [],
    cookingHistory: results[4]?.data ?? [],
    recommendationFeedback: results[5]?.data ?? [],
    recommendationImpressions: results[6]?.data ?? [],
    mealPlanEntries: results[7]?.data ?? [],
    shoppingListItems: results[8]?.data ?? [],
  };
}

/**
 * User-scoped tables Emrooz owns. Kept as a const list so both the export
 * and the delete flows read from the same source of truth — dropping a table
 * from one path without the other would be a compliance bug.
 */
export const USER_SCOPED_TABLES = [
  'pantry_items',
  'favorites',
  'cooking_history',
  'recommendation_feedback',
  'recommendation_impressions',
  'meal_plan_entries',
  'shopping_list_items',
  'user_preferences',
] as const;
