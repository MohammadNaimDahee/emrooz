import type { Id, IsoTimestamp, Minutes, Slug, Url } from './primitives';
import type { LocalizedText, Locale } from './locale';
import type { Allergen, DietaryTag, Unit } from './ingredient';
import type { AuthenticityReviewState, EditorialState } from './editorial';

export const MEAL_TYPES = [
  'breakfast',
  'brunch',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'drink',
  'side',
  'appetizer',
  'soup',
  'salad',
] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export interface Country {
  id: Id;
  code: string; // ISO 3166-1 alpha-2
  name: LocalizedText;
}

export interface Region {
  id: Id;
  countryId: Id;
  name: LocalizedText;
}

export interface Cuisine {
  id: Id;
  slug: Slug;
  name: LocalizedText;
  /** Optional primary country association (not exclusive). */
  primaryCountryId?: Id;
}

export interface RecipeIngredient {
  ingredientId: Id;
  /** Quantity for the recipe's baseline `servings`. May be undefined for "to taste". */
  quantity?: number;
  unit?: Unit;
  /** Human-readable override, e.g. "1 medium onion, thinly sliced". Localized. */
  note?: LocalizedText;
  optional?: boolean;
  /** Group items into "For the sauce", "For the garnish", etc. */
  group?: LocalizedText;
}

export interface RecipeStep {
  order: number;
  text: LocalizedText;
  /** Optional per-step timing / temperature metadata used later for smart timers. */
  durationMinutes?: Minutes;
}

/**
 * Content ownership and licensing. Emrooz is the runtime source of truth;
 * providers are import sources. See CLAUDE.md §31 and §32.
 */
export interface Provenance {
  contentOwner: string;
  ownershipType:
    'emrooz_owned' | 'licensed' | 'open_license' | 'provider_hosted' | 'external_link_only';
  sourceProvider?: string;
  sourceRecipeId?: string;
  sourceUrl?: Url;
  sourceTermsUrl?: Url;
  sourceTermsVersion?: string;
  sourceLicense?: string;
  sourceLicenseUrl?: Url;
  attributionText?: string;
  attributionUrl?: Url;
  storagePermission:
    'permanent' | 'subscription_only' | 'temporary_cache' | 'metadata_only' | 'not_permitted';
  imageStoragePermission?:
    'permanent' | 'subscription_only' | 'temporary_cache' | 'metadata_only' | 'not_permitted';
  importedAt?: IsoTimestamp;
  lastSyncedAt?: IsoTimestamp;
  contentHash?: string;
}

export interface MediaAsset {
  id: Id;
  url: Url;
  /** Deterministic Emrooz-owned placeholder path when the remote image cannot be stored. */
  placeholder?: string;
  altText?: LocalizedText;
  license?: string;
  attribution?: string;
  storagePermission: Provenance['imageStoragePermission'];
}

export interface Recipe {
  id: Id;
  slug: Slug;
  /** Localized title. English required as the canonical key. */
  title: LocalizedText;
  /** Alternative names, e.g. "Kabuli Pulao" / "Qabuli Palaw" per language. */
  alternativeNames?: Partial<Record<Locale, string[]>>;
  description?: LocalizedText;
  /** Primary country of origin, if any. */
  originCountryId?: Id;
  cuisineIds: Id[];
  regionIds: Id[];
  prepMinutes: Minutes;
  cookMinutes: Minutes;
  totalMinutes: Minutes;
  difficulty: Difficulty;
  mealTypes: MealType[];
  /** Baseline number of servings the ingredient quantities are calibrated to. */
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  dietaryTags: DietaryTag[];
  /**
   * Ingredient-derived allergens. May include allergens declared by an ingredient
   * even if only "may contain".
   */
  allergens: Allergen[];
  images: MediaAsset[];
  provenance: Provenance;
  editorialState: EditorialState;
  authenticityReview: AuthenticityReviewState;
  publishedAt?: IsoTimestamp;
  updatedAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  version: number;
}

export interface RecipeSummary {
  id: Id;
  slug: Slug;
  title: LocalizedText;
  cuisineIds: Id[];
  regionIds: Id[];
  totalMinutes: Minutes;
  difficulty: Difficulty;
  mealTypes: MealType[];
  dietaryTags: DietaryTag[];
  allergens: Allergen[];
  images: MediaAsset[];
}

export function toRecipeSummary(r: Recipe): RecipeSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    cuisineIds: r.cuisineIds,
    regionIds: r.regionIds,
    totalMinutes: r.totalMinutes,
    difficulty: r.difficulty,
    mealTypes: r.mealTypes,
    dietaryTags: r.dietaryTags,
    allergens: r.allergens,
    images: r.images,
  };
}
