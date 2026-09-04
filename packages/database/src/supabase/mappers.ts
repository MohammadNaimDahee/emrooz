import type {
  Allergen,
  AuthenticityReviewState,
  CookingHistoryEntry,
  Country,
  Cuisine,
  DietaryTag,
  Difficulty,
  EditorialState,
  FavoriteEntry,
  FeedbackType,
  Ingredient,
  IngredientCategory,
  MealPlanEntry,
  MealType,
  Recipe,
  RecipeIngredient,
  RecipeStep,
  RecipeSummary,
  RecommendationFeedback,
  RecommendationImpression,
  Region,
  ShoppingListItem,
  Unit,
  UserPreferences,
  UserProfile,
} from '@emrooz/types';

/**
 * SQL row shapes as returned by Postgres via PostgREST. These mirror the
 * columns declared in supabase/migrations. Nested arrays are the result of
 * `select(...)` with foreign-key joins in Supabase.
 */

export interface CountryRow {
  id: string;
  code: string;
  name_en: string;
}

export interface RegionRow {
  id: string;
  country_id: string;
  name_en: string;
}

export interface CuisineRow {
  id: string;
  slug: string;
  name_en: string;
  primary_country_id: string | null;
}

export interface IngredientRow {
  id: string;
  slug: string;
  name_en: string;
  category: string;
  common_units: string[];
  allergens: string[];
  dietary_compatibility: Record<string, string>;
}

export interface RecipeIngredientRow {
  ingredient_id: string;
  position: number | null;
  quantity: number | null;
  unit: string | null;
  note_en: string | null;
  optional: boolean;
  group_en: string | null;
}

export interface RecipeStepRow {
  step_order: number;
  text_en: string;
  duration_minutes: number | null;
}

export interface MediaAssetRow {
  id: string;
  url: string | null;
  storage_path: string;
  license: string | null;
  attribution: string | null;
  storage_permission: string | null;
}

export interface RecipeRow {
  id: string;
  slug: string;
  title_en: string;
  description_en: string | null;
  origin_country_id: string | null;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
  difficulty: Difficulty;
  meal_types: string[];
  servings: number;
  dietary_tags: string[];
  allergens: string[];
  editorial_state: EditorialState;
  authenticity_review: AuthenticityReviewState;
  content_owner: string;
  ownership_type: string;
  source_provider: string | null;
  source_recipe_id: string | null;
  source_url: string | null;
  source_terms_url: string | null;
  source_terms_version: string | null;
  source_license: string | null;
  source_license_url: string | null;
  attribution_text: string | null;
  attribution_url: string | null;
  storage_permission: string;
  image_storage_permission: string | null;
  imported_at: string | null;
  last_synced_at: string | null;
  content_hash: string | null;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  recipe_cuisines?: { cuisine_id: string }[];
  recipe_regions?: { region_id: string }[];
  recipe_ingredients?: RecipeIngredientRow[];
  recipe_steps?: RecipeStepRow[];
  media_assets?: MediaAssetRow[];
}

export interface UserPreferencesRow {
  user_id: string;
  language: string;
  household_size: number;
  max_cook_minutes: number | null;
  preferred_difficulty: Difficulty | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  cuisine_ids: string[];
  dietary_tags: string[];
  allergens: string[];
  disliked_ingredient_ids: string[];
  pantry_seed_ingredient_ids: string[];
  onboarded_at: string | null;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface PantryItemRow {
  id: string;
  user_id: string;
  ingredient_id: string;
  quantity: number | null;
  unit: string | null;
  added_at: string;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  recipe_id: string;
  favorited_at: string;
}

export interface CookingHistoryRow {
  id: string;
  user_id: string;
  recipe_id: string;
  cooked_on: string;
  servings: number;
  note: string | null;
  created_at: string;
}

export interface MealPlanRow {
  id: string;
  user_id: string;
  recipe_id: string;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner';
  servings: number;
  created_at: string;
}

export interface ShoppingListRow {
  id: string;
  user_id: string;
  ingredient_id: string | null;
  label: string | null;
  quantity: number | null;
  unit: string | null;
  source_recipe_ids: string[];
  checked: boolean;
  added_at: string;
  updated_at: string;
}

export interface FeedbackRow {
  id: string;
  user_id: string;
  recipe_id: string;
  feedback: FeedbackType;
  created_at: string;
}

export interface ImpressionRow {
  id: string;
  user_id: string;
  recipe_id: string;
  shown_at: string;
  context: 'today' | 'discover' | 'planner_suggest' | 'pantry_match';
}

// ────────────────────────────────────────────────────────────────
// Row → domain mappers
// ────────────────────────────────────────────────────────────────

export function rowToCountry(r: CountryRow): Country {
  return { id: r.id, code: r.code, name: { en: r.name_en } };
}
export function rowToRegion(r: RegionRow): Region {
  return { id: r.id, countryId: r.country_id, name: { en: r.name_en } };
}
export function rowToCuisine(r: CuisineRow): Cuisine {
  return {
    id: r.id,
    slug: r.slug,
    name: { en: r.name_en },
    primaryCountryId: r.primary_country_id ?? undefined,
  };
}

export function rowToIngredient(r: IngredientRow): Ingredient {
  return {
    id: r.id,
    slug: r.slug,
    name: { en: r.name_en },
    aliases: { en: [] }, // aliases loaded separately via ingredient_aliases
    category: r.category as IngredientCategory,
    commonUnits: (r.common_units ?? []) as Unit[],
    allergens: (r.allergens ?? []) as Allergen[],
    dietaryCompatibility: r.dietary_compatibility as Ingredient['dietaryCompatibility'],
  };
}

function rowToRecipeIngredient(r: RecipeIngredientRow): RecipeIngredient {
  return {
    ingredientId: r.ingredient_id,
    quantity: r.quantity ?? undefined,
    unit: (r.unit ?? undefined) as Unit | undefined,
    note: r.note_en ? { en: r.note_en } : undefined,
    optional: r.optional || undefined,
    group: r.group_en ? { en: r.group_en } : undefined,
  };
}

function rowToRecipeStep(r: RecipeStepRow): RecipeStep {
  return {
    order: r.step_order,
    text: { en: r.text_en },
    durationMinutes: r.duration_minutes ?? undefined,
  };
}

export function rowToRecipe(r: RecipeRow): Recipe {
  const ingredients = (r.recipe_ingredients ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(rowToRecipeIngredient);
  const steps = (r.recipe_steps ?? [])
    .slice()
    .sort((a, b) => a.step_order - b.step_order)
    .map(rowToRecipeStep);
  return {
    id: r.id,
    slug: r.slug,
    title: { en: r.title_en },
    description: r.description_en ? { en: r.description_en } : undefined,
    originCountryId: r.origin_country_id ?? undefined,
    cuisineIds: (r.recipe_cuisines ?? []).map((c) => c.cuisine_id),
    regionIds: (r.recipe_regions ?? []).map((c) => c.region_id),
    prepMinutes: r.prep_minutes,
    cookMinutes: r.cook_minutes,
    totalMinutes: r.total_minutes,
    difficulty: r.difficulty,
    mealTypes: r.meal_types as MealType[],
    servings: r.servings,
    ingredients,
    steps,
    dietaryTags: r.dietary_tags as DietaryTag[],
    allergens: r.allergens as Allergen[],
    images: (r.media_assets ?? []).map((m) => ({
      id: m.id,
      url: m.url ?? m.storage_path,
      license: m.license ?? undefined,
      attribution: m.attribution ?? undefined,
      storagePermission: (m.storage_permission ??
        undefined) as Recipe['images'][number]['storagePermission'],
    })),
    provenance: {
      contentOwner: r.content_owner,
      ownershipType: r.ownership_type as Recipe['provenance']['ownershipType'],
      sourceProvider: r.source_provider ?? undefined,
      sourceRecipeId: r.source_recipe_id ?? undefined,
      sourceUrl: r.source_url ?? undefined,
      sourceTermsUrl: r.source_terms_url ?? undefined,
      sourceTermsVersion: r.source_terms_version ?? undefined,
      sourceLicense: r.source_license ?? undefined,
      sourceLicenseUrl: r.source_license_url ?? undefined,
      attributionText: r.attribution_text ?? undefined,
      attributionUrl: r.attribution_url ?? undefined,
      storagePermission: r.storage_permission as Recipe['provenance']['storagePermission'],
      imageStoragePermission: (r.image_storage_permission ??
        undefined) as Recipe['provenance']['imageStoragePermission'],
      importedAt: r.imported_at ?? undefined,
      lastSyncedAt: r.last_synced_at ?? undefined,
      contentHash: r.content_hash ?? undefined,
    },
    editorialState: r.editorial_state,
    authenticityReview: r.authenticity_review,
    publishedAt: r.published_at ?? undefined,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
    version: r.version,
  };
}

export function rowToRecipeSummary(r: RecipeRow): RecipeSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: { en: r.title_en },
    cuisineIds: (r.recipe_cuisines ?? []).map((c) => c.cuisine_id),
    regionIds: (r.recipe_regions ?? []).map((c) => c.region_id),
    totalMinutes: r.total_minutes,
    difficulty: r.difficulty,
    mealTypes: r.meal_types as MealType[],
    dietaryTags: r.dietary_tags as DietaryTag[],
    allergens: r.allergens as Allergen[],
    images: (r.media_assets ?? []).map((m) => ({
      id: m.id,
      url: m.url ?? m.storage_path,
      storagePermission: (m.storage_permission ??
        undefined) as RecipeSummary['images'][number]['storagePermission'],
    })),
  };
}

export function rowToUserPreferences(r: UserPreferencesRow): UserPreferences {
  return {
    userId: r.user_id,
    language: r.language as UserPreferences['language'],
    cuisineIds: r.cuisine_ids ?? [],
    householdSize: r.household_size,
    maxCookMinutes: r.max_cook_minutes ?? undefined,
    dietaryTags: (r.dietary_tags ?? []) as DietaryTag[],
    allergens: (r.allergens ?? []) as Allergen[],
    dislikedIngredientIds: r.disliked_ingredient_ids ?? [],
    pantrySeedIngredientIds: r.pantry_seed_ingredient_ids ?? [],
    preferredDifficulty: r.preferred_difficulty ?? undefined,
    reminder: r.reminder_time
      ? { enabled: r.reminder_enabled, time: r.reminder_time }
      : { enabled: r.reminder_enabled, time: '17:00' },
    onboardedAt: r.onboarded_at ?? undefined,
  };
}

export function userPreferencesToRow(p: UserPreferences): UserPreferencesRow {
  return {
    user_id: p.userId,
    language: p.language,
    household_size: p.householdSize,
    max_cook_minutes: p.maxCookMinutes ?? null,
    preferred_difficulty: p.preferredDifficulty ?? null,
    reminder_enabled: p.reminder?.enabled ?? false,
    reminder_time: p.reminder?.time ?? null,
    cuisine_ids: p.cuisineIds,
    dietary_tags: p.dietaryTags,
    allergens: p.allergens,
    disliked_ingredient_ids: p.dislikedIngredientIds,
    pantry_seed_ingredient_ids: p.pantrySeedIngredientIds,
    onboarded_at: p.onboardedAt ?? null,
  };
}

export function rowToProfile(r: ProfileRow): UserProfile {
  return {
    id: r.id,
    email: r.email ?? undefined,
    isGuest: !r.email,
    displayName: r.display_name ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToPantry(r: PantryItemRow) {
  return {
    id: r.id,
    userId: r.user_id,
    ingredientId: r.ingredient_id,
    quantity: r.quantity ?? undefined,
    unit: (r.unit ?? undefined) as Unit | undefined,
    addedAt: r.added_at,
  };
}

export function rowToFavorite(r: FavoriteRow): FavoriteEntry {
  return { id: r.id, userId: r.user_id, recipeId: r.recipe_id, favoritedAt: r.favorited_at };
}

export function rowToHistory(r: CookingHistoryRow): CookingHistoryEntry {
  return {
    id: r.id,
    userId: r.user_id,
    recipeId: r.recipe_id,
    cookedOn: r.cooked_on,
    servings: r.servings,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  };
}

export function rowToMealPlan(r: MealPlanRow): MealPlanEntry {
  return {
    id: r.id,
    userId: r.user_id,
    recipeId: r.recipe_id,
    date: r.date,
    meal: r.meal,
    servings: r.servings,
    createdAt: r.created_at,
  };
}

export function rowToShoppingItem(r: ShoppingListRow): ShoppingListItem {
  return {
    id: r.id,
    userId: r.user_id,
    ingredientId: r.ingredient_id ?? undefined,
    label: r.label ?? undefined,
    quantity: r.quantity ?? undefined,
    unit: (r.unit ?? undefined) as Unit | undefined,
    sourceRecipeIds: r.source_recipe_ids ?? [],
    checked: r.checked,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
  };
}

export function shoppingItemToRow(i: ShoppingListItem): ShoppingListRow {
  return {
    id: i.id,
    user_id: i.userId,
    ingredient_id: i.ingredientId ?? null,
    label: i.label ?? null,
    quantity: i.quantity ?? null,
    unit: i.unit ?? null,
    source_recipe_ids: i.sourceRecipeIds,
    checked: i.checked,
    added_at: i.addedAt,
    updated_at: i.updatedAt,
  };
}

export function rowToFeedback(r: FeedbackRow): RecommendationFeedback {
  return {
    id: r.id,
    userId: r.user_id,
    recipeId: r.recipe_id,
    feedback: r.feedback,
    createdAt: r.created_at,
  };
}

export function rowToImpression(r: ImpressionRow): RecommendationImpression {
  return {
    id: r.id,
    userId: r.user_id,
    recipeId: r.recipe_id,
    shownAt: r.shown_at,
    context: r.context,
  };
}

/** Full nested select used everywhere a Recipe is fetched. */
export const RECIPE_SELECT = `
  *,
  recipe_cuisines(cuisine_id),
  recipe_regions(region_id),
  recipe_ingredients(*),
  recipe_steps(*),
  media_assets(*)
` as const;
