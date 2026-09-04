import type {
  CookingHistoryEntry,
  Country,
  Cuisine,
  FavoriteEntry,
  Id,
  Ingredient,
  MealPlanEntry,
  PantryItem,
  Recipe,
  RecipeSummary,
  RecommendationFeedback,
  RecommendationImpression,
  Region,
  ShoppingListItem,
  UserPreferences,
  UserProfile,
} from '@emrooz/types';
import { toRecipeSummary } from '@emrooz/types';
import { normalizeAlias } from '@emrooz/core';

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

import { COUNTRIES, CUISINES, INGREDIENTS, RECIPES, REGIONS } from './seed';

interface UserState {
  profile: UserProfile;
  preferences?: UserPreferences;
  pantry: Map<Id, PantryItem>;
  favorites: Map<Id, FavoriteEntry>;
  history: Map<Id, CookingHistoryEntry>;
  planner: Map<Id, MealPlanEntry>;
  shoppingList: Map<Id, ShoppingListItem>;
  feedback: RecommendationFeedback[];
  impressions: RecommendationImpression[];
}

/**
 * In-memory adapter used by mobile and web in local demo mode. Data lives for
 * the lifetime of the process; presentation layers persist a snapshot to
 * AsyncStorage / localStorage on top of this.
 */
export class DemoEmroozData implements EmroozData {
  readonly isDemo = true;

  private readonly ingredientsById = new Map(INGREDIENTS.map((i) => [i.id, i]));
  private readonly recipesById = new Map(RECIPES.map((r) => [r.id, r]));
  private readonly recipesBySlug = new Map(RECIPES.map((r) => [r.slug, r]));
  private readonly cuisinesBySlug = new Map(CUISINES.map((c) => [c.slug, c]));
  private readonly countriesByCode = new Map(COUNTRIES.map((c) => [c.code, c]));
  private readonly regionsById = new Map(REGIONS.map((r) => [r.id, r]));
  private readonly users = new Map<Id, UserState>();

  recipes: RecipeRepo = {
    findById: async (id) => this.recipesById.get(id),
    findBySlug: async (slug) => this.recipesBySlug.get(slug),
    listPublished: async (q) => filterRecipes(RECIPES, this.ingredientsById, q),
    listSummaries: async (q) =>
      filterRecipes(RECIPES, this.ingredientsById, q).map(toRecipeSummary),
  };

  ingredients: IngredientRepo = {
    all: async () => INGREDIENTS,
    byId: async (id) => this.ingredientsById.get(id),
    search: async (query, limit = 30) => {
      const needle = normalizeAlias(query);
      if (!needle) return INGREDIENTS.slice(0, limit);
      return INGREDIENTS.filter((i) => {
        if (normalizeAlias(i.name.en).includes(needle)) return true;
        return i.aliases.en.some((a) => normalizeAlias(a).includes(needle));
      }).slice(0, limit);
    },
  };

  cuisines: CuisineRepo = {
    all: async () => CUISINES,
    bySlug: async (slug) => this.cuisinesBySlug.get(slug),
  };

  countries: CountryRepo = {
    all: async () => COUNTRIES,
    byCode: async (code) => this.countriesByCode.get(code),
  };

  regions: RegionRepo = {
    all: async () => REGIONS,
    byId: async (id) => this.regionsById.get(id),
  };

  preferences: UserPreferencesRepo = {
    get: async (userId) => this.state(userId).preferences,
    save: async (prefs) => {
      this.state(prefs.userId).preferences = prefs;
    },
  };

  profile: UserProfileRepo = {
    get: async (userId) => this.state(userId).profile,
    createGuest: async () => {
      const id = `guest_${cryptoRandom()}`;
      const now = new Date().toISOString();
      const profile: UserProfile = { id, isGuest: true, createdAt: now, updatedAt: now };
      this.users.set(id, blankUserState(profile));
      return profile;
    },
    upsert: async (p) => {
      const state = this.state(p.id);
      state.profile = p;
    },
  };

  pantry: PantryRepo = {
    list: async (userId) => [...this.state(userId).pantry.values()],
    set: async (userId, ingredientIds) => {
      const state = this.state(userId);
      state.pantry.clear();
      const now = new Date().toISOString();
      for (const ingredientId of ingredientIds) {
        state.pantry.set(ingredientId, {
          id: `pn_${cryptoRandom()}`,
          userId,
          ingredientId,
          addedAt: now,
        });
      }
    },
    add: async (item) => {
      this.state(item.userId).pantry.set(item.ingredientId, item);
    },
    remove: async (userId, ingredientId) => {
      this.state(userId).pantry.delete(ingredientId);
    },
    clear: async (userId) => {
      this.state(userId).pantry.clear();
    },
  };

  favorites: FavoritesRepo = {
    list: async (userId) => [...this.state(userId).favorites.values()],
    add: async (entry) => {
      this.state(entry.userId).favorites.set(entry.recipeId, entry);
    },
    remove: async (userId, recipeId) => {
      this.state(userId).favorites.delete(recipeId);
    },
    isFavorite: async (userId, recipeId) => this.state(userId).favorites.has(recipeId),
  };

  history: HistoryRepo = {
    list: async (userId) => [...this.state(userId).history.values()],
    add: async (entry) => {
      this.state(entry.userId).history.set(entry.id, entry);
    },
    remove: async (userId, entryId) => {
      this.state(userId).history.delete(entryId);
    },
  };

  planner: PlannerRepo = {
    listForRange: async (userId, start, end) =>
      [...this.state(userId).planner.values()].filter((e) => e.date >= start && e.date <= end),
    upsert: async (entry) => {
      this.state(entry.userId).planner.set(entry.id, entry);
    },
    remove: async (userId, entryId) => {
      this.state(userId).planner.delete(entryId);
    },
  };

  shoppingList: ShoppingListRepo = {
    list: async (userId) => [...this.state(userId).shoppingList.values()],
    upsert: async (item) => {
      this.state(item.userId).shoppingList.set(item.id, item);
    },
    remove: async (userId, itemId) => {
      this.state(userId).shoppingList.delete(itemId);
    },
    clear: async (userId, opts) => {
      const s = this.state(userId).shoppingList;
      if (opts?.completedOnly) {
        for (const [id, item] of s) if (item.checked) s.delete(id);
      } else {
        s.clear();
      }
    },
  };

  feedback: FeedbackRepo = {
    list: async (userId) => [...this.state(userId).feedback],
    add: async (entry) => {
      this.state(entry.userId).feedback.push(entry);
    },
  };

  impressions: ImpressionsRepo = {
    list: async (userId) => [...this.state(userId).impressions],
    record: async (entry) => {
      this.state(entry.userId).impressions.push(entry);
    },
  };

  private state(userId: Id): UserState {
    let state = this.users.get(userId);
    if (!state) {
      const now = new Date().toISOString();
      const profile: UserProfile = {
        id: userId,
        isGuest: true,
        createdAt: now,
        updatedAt: now,
      };
      state = blankUserState(profile);
      this.users.set(userId, state);
    }
    return state;
  }
}

function blankUserState(profile: UserProfile): UserState {
  return {
    profile,
    pantry: new Map(),
    favorites: new Map(),
    history: new Map(),
    planner: new Map(),
    shoppingList: new Map(),
    feedback: [],
    impressions: [],
  };
}

function filterRecipes(
  all: readonly Recipe[],
  _ingredients: Map<Id, Ingredient>,
  q?: RecipeQuery,
): Recipe[] {
  const list = all.filter((r) => r.editorialState === 'published');
  const filtered = list.filter((r) => {
    if (q?.cuisineId && !r.cuisineIds.includes(q.cuisineId)) return false;
    if (q?.regionId && !r.regionIds.includes(q.regionId)) return false;
    if (q?.maxTotalMinutes !== undefined && r.totalMinutes > q.maxTotalMinutes) return false;
    if (q?.dietaryTagsAll?.length) {
      for (const t of q.dietaryTagsAll)
        if (!r.dietaryTags.includes(t as (typeof r.dietaryTags)[number])) return false;
    }
    if (q?.mealType && !r.mealTypes.includes(q.mealType as (typeof r.mealTypes)[number]))
      return false;
    if (q?.search) {
      const needle = normalizeAlias(q.search);
      const haystacks = [r.title.en, r.description?.en ?? '', ...r.cuisineIds];
      if (!haystacks.some((h) => normalizeAlias(h).includes(needle))) return false;
    }
    return true;
  });
  const offset = q?.offset ?? 0;
  const limit = q?.limit ?? filtered.length;
  return filtered.slice(offset, offset + limit);
}

function cryptoRandom(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export { INGREDIENTS, RECIPES, CUISINES, COUNTRIES, REGIONS };

/** Convenience factory. */
export function createDemoData(): EmroozData {
  return new DemoEmroozData();
}

/**
 * Returns whether the current environment appears to be demo mode.
 * Callers can override with `EMROOZ_DEMO_MODE=on|off`.
 */
export function inferDemoMode(env: Record<string, string | undefined>): boolean {
  const explicit = env.EMROOZ_DEMO_MODE;
  if (explicit === 'on') return true;
  if (explicit === 'off') return false;
  // Look for either the new publishable_key or the legacy anon_key so
  // hosted projects that haven't rotated keys still count as configured.
  const hasKey =
    Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return !env.NEXT_PUBLIC_SUPABASE_URL || !hasKey;
}
