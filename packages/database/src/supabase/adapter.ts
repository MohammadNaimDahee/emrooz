import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CountryRepo,
  CuisineRepo,
  EmroozData,
  FavoritesRepo,
  FeedbackRepo,
  HistoryRepo,
  ImpressionsRepo,
  IngredientRepo,
  PantryRepo,
  PlannerRepo,
  RecipeQuery,
  RecipeRepo,
  RegionRepo,
  ShoppingListRepo,
  UserPreferencesRepo,
  UserProfileRepo,
} from '../contracts';

import {
  RECIPE_SELECT,
  rowToCountry,
  rowToCuisine,
  rowToFavorite,
  rowToFeedback,
  rowToHistory,
  rowToImpression,
  rowToIngredient,
  rowToMealPlan,
  rowToPantry,
  rowToProfile,
  rowToRecipe,
  rowToRecipeSummary,
  rowToRegion,
  rowToShoppingItem,
  rowToUserPreferences,
  shoppingItemToRow,
  userPreferencesToRow,
  type RecipeRow,
} from './mappers';

/**
 * Live implementation of the EmroozData contract, backed by a Supabase project.
 *
 * The adapter is deliberately thin: it maps SQL rows to domain types and
 * defers all business logic to `@emrooz/core` / `@emrooz/recommendations`,
 * so callers behave identically against DemoEmroozData and SupabaseEmroozData.
 *
 * Row Level Security policies (see supabase/migrations/) enforce all
 * per-user access. This client never assumes trust.
 */
export class SupabaseEmroozData implements EmroozData {
  readonly isDemo = false;

  constructor(private readonly supabase: SupabaseClient) {}

  recipes: RecipeRepo = {
    findById: async (id) => {
      const { data } = await this.supabase
        .from('recipes')
        .select(RECIPE_SELECT)
        .eq('editorial_state', 'published')
        .eq('id', id)
        .maybeSingle<RecipeRow>();
      return data ? rowToRecipe(data) : undefined;
    },
    findBySlug: async (slug) => {
      const { data } = await this.supabase
        .from('recipes')
        .select(RECIPE_SELECT)
        .eq('editorial_state', 'published')
        .eq('slug', slug)
        .maybeSingle<RecipeRow>();
      return data ? rowToRecipe(data) : undefined;
    },
    listPublished: async (q) => {
      const rows = await this.queryRecipes(q);
      return rows.map(rowToRecipe);
    },
    listSummaries: async (q) => {
      const rows = await this.queryRecipes(q);
      return rows.map(rowToRecipeSummary);
    },
  };

  ingredients: IngredientRepo = {
    all: async () => {
      const { data } = await this.supabase.from('ingredients').select('*').order('slug');
      return (data ?? []).map(rowToIngredient);
    },
    byId: async (id) => {
      const { data } = await this.supabase.from('ingredients').select('*').eq('id', id).maybeSingle();
      return data ? rowToIngredient(data) : undefined;
    },
    search: async (query, limit = 30) => {
      const needle = query.trim();
      const q = this.supabase.from('ingredients').select('*').limit(limit).order('slug');
      const request = needle
        ? q.or(`name_en.ilike.%${needle}%,slug.ilike.%${needle}%`)
        : q;
      const { data } = await request;
      return (data ?? []).map(rowToIngredient);
    },
  };

  cuisines: CuisineRepo = {
    all: async () => {
      const { data } = await this.supabase.from('cuisines').select('*').order('name_en');
      return (data ?? []).map(rowToCuisine);
    },
    bySlug: async (slug) => {
      const { data } = await this.supabase.from('cuisines').select('*').eq('slug', slug).maybeSingle();
      return data ? rowToCuisine(data) : undefined;
    },
  };

  countries: CountryRepo = {
    all: async () => {
      const { data } = await this.supabase.from('countries').select('*').order('name_en');
      return (data ?? []).map(rowToCountry);
    },
    byCode: async (code) => {
      const { data } = await this.supabase.from('countries').select('*').eq('code', code).maybeSingle();
      return data ? rowToCountry(data) : undefined;
    },
  };

  regions: RegionRepo = {
    all: async () => {
      const { data } = await this.supabase.from('regions').select('*').order('name_en');
      return (data ?? []).map(rowToRegion);
    },
    byId: async (id) => {
      const { data } = await this.supabase.from('regions').select('*').eq('id', id).maybeSingle();
      return data ? rowToRegion(data) : undefined;
    },
  };

  preferences: UserPreferencesRepo = {
    get: async (userId) => {
      const { data } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return data ? rowToUserPreferences(data) : undefined;
    },
    save: async (prefs) => {
      // Upsert avoids "user has no preferences yet" round-trip.
      await this.supabase.from('user_preferences').upsert(userPreferencesToRow(prefs));
    },
  };

  profile: UserProfileRepo = {
    get: async (userId) => {
      const { data } = await this.supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      return data ? rowToProfile(data) : undefined;
    },
    createGuest: async () => {
      // Guest accounts are provisioned by anonymous auth (see @emrooz/database/supabase/session).
      // The app calls createGuest() only in demo mode; in Supabase mode the profile row is
      // created via a database trigger on auth.users insert, or by upsert on first login.
      throw new Error('SupabaseEmroozData.profile.createGuest is not used — sign in anonymously instead.');
    },
    upsert: async (p) => {
      await this.supabase.from('profiles').upsert({
        id: p.id,
        email: p.email ?? null,
        display_name: p.displayName ?? null,
        updated_at: new Date().toISOString(),
      });
    },
  };

  pantry: PantryRepo = {
    list: async (userId) => {
      const { data } = await this.supabase.from('pantry_items').select('*').eq('user_id', userId);
      return (data ?? []).map(rowToPantry);
    },
    set: async (userId, ingredientIds) => {
      // Idempotent replace: clear then insert. RLS guarantees the delete is user-scoped.
      await this.supabase.from('pantry_items').delete().eq('user_id', userId);
      if (ingredientIds.length > 0) {
        await this.supabase.from('pantry_items').insert(
          ingredientIds.map((ingredient_id) => ({ user_id: userId, ingredient_id })),
        );
      }
    },
    add: async (item) => {
      await this.supabase.from('pantry_items').upsert(
        {
          user_id: item.userId,
          ingredient_id: item.ingredientId,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          added_at: item.addedAt,
        },
        { onConflict: 'user_id,ingredient_id' },
      );
    },
    remove: async (userId, ingredientId) => {
      await this.supabase
        .from('pantry_items')
        .delete()
        .eq('user_id', userId)
        .eq('ingredient_id', ingredientId);
    },
    clear: async (userId) => {
      await this.supabase.from('pantry_items').delete().eq('user_id', userId);
    },
  };

  favorites: FavoritesRepo = {
    list: async (userId) => {
      const { data } = await this.supabase.from('favorites').select('*').eq('user_id', userId);
      return (data ?? []).map(rowToFavorite);
    },
    add: async (entry) => {
      await this.supabase.from('favorites').upsert(
        {
          user_id: entry.userId,
          recipe_id: entry.recipeId,
          favorited_at: entry.favoritedAt,
        },
        { onConflict: 'user_id,recipe_id' },
      );
    },
    remove: async (userId, recipeId) => {
      await this.supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId);
    },
    isFavorite: async (userId, recipeId) => {
      const { data } = await this.supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)
        .maybeSingle();
      return Boolean(data);
    },
  };

  history: HistoryRepo = {
    list: async (userId) => {
      const { data } = await this.supabase
        .from('cooking_history')
        .select('*')
        .eq('user_id', userId)
        .order('cooked_on', { ascending: false });
      return (data ?? []).map(rowToHistory);
    },
    add: async (entry) => {
      await this.supabase.from('cooking_history').insert({
        id: entry.id,
        user_id: entry.userId,
        recipe_id: entry.recipeId,
        cooked_on: entry.cookedOn,
        servings: entry.servings,
        note: entry.note ?? null,
      });
    },
    remove: async (userId, entryId) => {
      await this.supabase.from('cooking_history').delete().eq('user_id', userId).eq('id', entryId);
    },
  };

  planner: PlannerRepo = {
    listForRange: async (userId, startDate, endDate) => {
      const { data } = await this.supabase
        .from('meal_plan_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);
      return (data ?? []).map(rowToMealPlan);
    },
    upsert: async (entry) => {
      await this.supabase.from('meal_plan_entries').upsert(
        {
          id: entry.id,
          user_id: entry.userId,
          recipe_id: entry.recipeId,
          date: entry.date,
          meal: entry.meal,
          servings: entry.servings,
        },
        { onConflict: 'user_id,date,meal' },
      );
    },
    remove: async (userId, entryId) => {
      await this.supabase.from('meal_plan_entries').delete().eq('user_id', userId).eq('id', entryId);
    },
  };

  shoppingList: ShoppingListRepo = {
    list: async (userId) => {
      const { data } = await this.supabase
        .from('shopping_list_items')
        .select('*')
        .eq('user_id', userId);
      return (data ?? []).map(rowToShoppingItem);
    },
    upsert: async (item) => {
      await this.supabase.from('shopping_list_items').upsert(shoppingItemToRow(item));
    },
    remove: async (userId, itemId) => {
      await this.supabase.from('shopping_list_items').delete().eq('user_id', userId).eq('id', itemId);
    },
    clear: async (userId, opts) => {
      const q = this.supabase.from('shopping_list_items').delete().eq('user_id', userId);
      if (opts?.completedOnly) q.eq('checked', true);
      await q;
    },
  };

  feedback: FeedbackRepo = {
    list: async (userId) => {
      const { data } = await this.supabase
        .from('recommendation_feedback')
        .select('*')
        .eq('user_id', userId);
      return (data ?? []).map(rowToFeedback);
    },
    add: async (entry) => {
      await this.supabase.from('recommendation_feedback').insert({
        id: entry.id,
        user_id: entry.userId,
        recipe_id: entry.recipeId,
        feedback: entry.feedback,
      });
    },
  };

  impressions: ImpressionsRepo = {
    list: async (userId) => {
      const { data } = await this.supabase
        .from('recommendation_impressions')
        .select('*')
        .eq('user_id', userId)
        .order('shown_at', { ascending: false })
        .limit(500);
      return (data ?? []).map(rowToImpression);
    },
    record: async (entry) => {
      await this.supabase.from('recommendation_impressions').insert({
        id: entry.id,
        user_id: entry.userId,
        recipe_id: entry.recipeId,
        shown_at: entry.shownAt,
        context: entry.context,
      });
    },
  };

  private async queryRecipes(query: RecipeQuery | undefined): Promise<RecipeRow[]> {
    let q = this.supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .eq('editorial_state', 'published');

    if (query?.cuisineId) {
      // Filter through the join table via server-side inner select. The `!inner`
      // relation forces PostgREST to join and drop unmatched rows.
      q = this.supabase
        .from('recipes')
        .select(`${RECIPE_SELECT}, recipe_cuisines!inner(cuisine_id)`)
        .eq('editorial_state', 'published')
        .eq('recipe_cuisines.cuisine_id', query.cuisineId);
    }
    if (query?.regionId) {
      q = q as never; // typing note: same pattern as cuisineId if needed later
      // Region filter can be added similarly if the UI surfaces it.
    }
    if (query?.maxTotalMinutes !== undefined) q = q.lte('total_minutes', query.maxTotalMinutes);
    if (query?.mealType) q = q.contains('meal_types', [query.mealType]);
    if (query?.dietaryTagsAll?.length) q = q.contains('dietary_tags', query.dietaryTagsAll);
    if (query?.search) q = q.ilike('title_en', `%${query.search}%`);

    const limit = query?.limit ?? 100;
    const offset = query?.offset ?? 0;
    q = q.range(offset, offset + limit - 1);

    const { data } = await q.returns<RecipeRow[]>();
    return data ?? [];
  }
}

export function createSupabaseData(client: SupabaseClient): SupabaseEmroozData {
  return new SupabaseEmroozData(client);
}
