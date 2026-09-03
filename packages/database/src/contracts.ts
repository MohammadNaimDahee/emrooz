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

export interface RecipeQuery {
  cuisineId?: Id;
  regionId?: Id;
  search?: string;
  maxTotalMinutes?: number;
  dietaryTagsAll?: string[];
  mealType?: string;
  limit?: number;
  offset?: number;
}

export interface RecipeRepo {
  findById(id: Id): Promise<Recipe | undefined>;
  findBySlug(slug: string): Promise<Recipe | undefined>;
  listPublished(query?: RecipeQuery): Promise<Recipe[]>;
  listSummaries(query?: RecipeQuery): Promise<RecipeSummary[]>;
}

export interface IngredientRepo {
  all(): Promise<Ingredient[]>;
  byId(id: Id): Promise<Ingredient | undefined>;
  search(query: string, limit?: number): Promise<Ingredient[]>;
}

export interface CuisineRepo {
  all(): Promise<Cuisine[]>;
  bySlug(slug: string): Promise<Cuisine | undefined>;
}

export interface CountryRepo {
  all(): Promise<Country[]>;
  byCode(code: string): Promise<Country | undefined>;
}

export interface RegionRepo {
  all(): Promise<Region[]>;
  byId(id: Id): Promise<Region | undefined>;
}

export interface UserPreferencesRepo {
  get(userId: Id): Promise<UserPreferences | undefined>;
  save(prefs: UserPreferences): Promise<void>;
}

export interface UserProfileRepo {
  get(userId: Id): Promise<UserProfile | undefined>;
  createGuest(): Promise<UserProfile>;
  upsert(profile: UserProfile): Promise<void>;
}

export interface PantryRepo {
  list(userId: Id): Promise<PantryItem[]>;
  set(userId: Id, ingredientIds: Id[]): Promise<void>;
  add(item: PantryItem): Promise<void>;
  remove(userId: Id, ingredientId: Id): Promise<void>;
  clear(userId: Id): Promise<void>;
}

export interface FavoritesRepo {
  list(userId: Id): Promise<FavoriteEntry[]>;
  add(entry: FavoriteEntry): Promise<void>;
  remove(userId: Id, recipeId: Id): Promise<void>;
  isFavorite(userId: Id, recipeId: Id): Promise<boolean>;
}

export interface HistoryRepo {
  list(userId: Id): Promise<CookingHistoryEntry[]>;
  add(entry: CookingHistoryEntry): Promise<void>;
  remove(userId: Id, entryId: Id): Promise<void>;
}

export interface PlannerRepo {
  listForRange(userId: Id, startDate: string, endDate: string): Promise<MealPlanEntry[]>;
  upsert(entry: MealPlanEntry): Promise<void>;
  remove(userId: Id, entryId: Id): Promise<void>;
}

export interface ShoppingListRepo {
  list(userId: Id): Promise<ShoppingListItem[]>;
  upsert(item: ShoppingListItem): Promise<void>;
  remove(userId: Id, itemId: Id): Promise<void>;
  clear(userId: Id, opts?: { completedOnly?: boolean }): Promise<void>;
}

export interface FeedbackRepo {
  list(userId: Id): Promise<RecommendationFeedback[]>;
  add(entry: RecommendationFeedback): Promise<void>;
}

export interface ImpressionsRepo {
  list(userId: Id): Promise<RecommendationImpression[]>;
  record(entry: RecommendationImpression): Promise<void>;
}

export interface EmroozData {
  recipes: RecipeRepo;
  ingredients: IngredientRepo;
  cuisines: CuisineRepo;
  countries: CountryRepo;
  regions: RegionRepo;
  preferences: UserPreferencesRepo;
  profile: UserProfileRepo;
  pantry: PantryRepo;
  favorites: FavoritesRepo;
  history: HistoryRepo;
  planner: PlannerRepo;
  shoppingList: ShoppingListRepo;
  feedback: FeedbackRepo;
  impressions: ImpressionsRepo;
  /** True if the adapter is running against local seed data (no Supabase). */
  readonly isDemo: boolean;
}
