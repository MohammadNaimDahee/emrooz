import { z } from 'zod';
import {
  SUPPORTED_LOCALES,
  INGREDIENT_CATEGORIES,
  COMMON_UNITS,
  DIETARY_TAGS,
  ALLERGENS,
  MEAL_TYPES,
  DIFFICULTY_LEVELS,
  EDITORIAL_STATES,
  AUTHENTICITY_REVIEW_STATES,
  FEEDBACK_TYPES,
} from '@emrooz/types';

export const LocaleSchema = z.enum(SUPPORTED_LOCALES);
export const LocalizedTextSchema = z
  .record(LocaleSchema, z.string())
  .and(z.object({ en: z.string().min(1) }));

export const IngredientCategorySchema = z.enum(INGREDIENT_CATEGORIES);
export const UnitSchema = z.enum(COMMON_UNITS);
export const DietaryTagSchema = z.enum(DIETARY_TAGS);
export const AllergenSchema = z.enum(ALLERGENS);
export const CompatibilitySchema = z.enum(['compatible', 'incompatible', 'unknown']);

export const MealTypeSchema = z.enum(MEAL_TYPES);
export const DifficultySchema = z.enum(DIFFICULTY_LEVELS);
export const EditorialStateSchema = z.enum(EDITORIAL_STATES);
export const AuthenticityReviewStateSchema = z.enum(AUTHENTICITY_REVIEW_STATES);
export const FeedbackTypeSchema = z.enum(FEEDBACK_TYPES);

export const IdSchema = z.string().uuid().or(z.string().min(1));
export const SlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be kebab-case');
export const IsoTimestampSchema = z.string().datetime({ offset: true });
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const IngredientSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  name: LocalizedTextSchema,
  aliases: z
    .record(LocaleSchema, z.array(z.string().min(1)))
    .and(z.object({ en: z.array(z.string().min(1)) })),
  category: IngredientCategorySchema,
  commonUnits: z.array(UnitSchema).default([]),
  allergens: z.array(AllergenSchema).default([]),
  dietaryCompatibility: z.record(DietaryTagSchema, CompatibilitySchema).default({}),
});

export const StoragePermissionSchema = z.enum([
  'permanent',
  'subscription_only',
  'temporary_cache',
  'metadata_only',
  'not_permitted',
]);

export const ProvenanceSchema = z.object({
  contentOwner: z.string().min(1),
  ownershipType: z.enum([
    'emrooz_owned',
    'licensed',
    'open_license',
    'provider_hosted',
    'external_link_only',
  ]),
  sourceProvider: z.string().optional(),
  sourceRecipeId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  sourceTermsUrl: z.string().url().optional(),
  sourceTermsVersion: z.string().optional(),
  sourceLicense: z.string().optional(),
  sourceLicenseUrl: z.string().url().optional(),
  attributionText: z.string().optional(),
  attributionUrl: z.string().url().optional(),
  storagePermission: StoragePermissionSchema,
  imageStoragePermission: StoragePermissionSchema.optional(),
  importedAt: IsoTimestampSchema.optional(),
  lastSyncedAt: IsoTimestampSchema.optional(),
  contentHash: z.string().optional(),
});

export const MediaAssetSchema = z.object({
  id: IdSchema,
  url: z.string(),
  placeholder: z.string().optional(),
  altText: LocalizedTextSchema.optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
  storagePermission: StoragePermissionSchema.optional(),
});

export const RecipeIngredientSchema = z.object({
  ingredientId: IdSchema,
  quantity: z.number().nonnegative().optional(),
  unit: UnitSchema.optional(),
  note: LocalizedTextSchema.optional(),
  optional: z.boolean().optional(),
  group: LocalizedTextSchema.optional(),
});

export const RecipeStepSchema = z.object({
  order: z.number().int().nonnegative(),
  text: LocalizedTextSchema,
  durationMinutes: z.number().int().nonnegative().optional(),
});

export const RecipeSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  title: LocalizedTextSchema,
  alternativeNames: z.record(LocaleSchema, z.array(z.string())).optional(),
  description: LocalizedTextSchema.optional(),
  originCountryId: IdSchema.optional(),
  cuisineIds: z.array(IdSchema).min(1),
  regionIds: z.array(IdSchema).default([]),
  prepMinutes: z.number().int().nonnegative(),
  cookMinutes: z.number().int().nonnegative(),
  totalMinutes: z.number().int().positive(),
  difficulty: DifficultySchema,
  mealTypes: z.array(MealTypeSchema).min(1),
  servings: z.number().int().positive(),
  ingredients: z.array(RecipeIngredientSchema).min(1),
  steps: z.array(RecipeStepSchema).min(1),
  dietaryTags: z.array(DietaryTagSchema).default([]),
  allergens: z.array(AllergenSchema).default([]),
  images: z.array(MediaAssetSchema).default([]),
  provenance: ProvenanceSchema,
  editorialState: EditorialStateSchema,
  authenticityReview: AuthenticityReviewStateSchema,
  publishedAt: IsoTimestampSchema.optional(),
  updatedAt: IsoTimestampSchema,
  createdAt: IsoTimestampSchema,
  version: z.number().int().positive(),
});

export const UserPreferencesSchema = z.object({
  userId: IdSchema,
  language: LocaleSchema,
  cuisineIds: z.array(IdSchema).default([]),
  householdSize: z.number().int().positive().max(20),
  maxCookMinutes: z.number().int().positive().optional(),
  dietaryTags: z.array(DietaryTagSchema).default([]),
  allergens: z.array(AllergenSchema).default([]),
  dislikedIngredientIds: z.array(IdSchema).default([]),
  pantrySeedIngredientIds: z.array(IdSchema).default([]),
  preferredDifficulty: DifficultySchema.optional(),
  reminder: z
    .object({
      enabled: z.boolean(),
      time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })
    .optional(),
  onboardedAt: IsoTimestampSchema.optional(),
});

export const PantryItemSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  ingredientId: IdSchema,
  quantity: z.number().nonnegative().optional(),
  unit: UnitSchema.optional(),
  addedAt: IsoTimestampSchema,
});

export const CookingHistoryEntrySchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  recipeId: IdSchema,
  cookedOn: IsoDateSchema,
  servings: z.number().int().positive(),
  note: z.string().max(2000).optional(),
  createdAt: IsoTimestampSchema,
});

export const FavoriteEntrySchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  recipeId: IdSchema,
  favoritedAt: IsoTimestampSchema,
});

export const MealPlanEntrySchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  date: IsoDateSchema,
  meal: z.enum(['breakfast', 'lunch', 'dinner']),
  recipeId: IdSchema,
  servings: z.number().int().positive(),
  createdAt: IsoTimestampSchema,
});

export const ShoppingListItemSchema = z
  .object({
    id: IdSchema,
    userId: IdSchema,
    ingredientId: IdSchema.optional(),
    label: z.string().min(1).max(200).optional(),
    quantity: z.number().nonnegative().optional(),
    unit: UnitSchema.optional(),
    sourceRecipeIds: z.array(IdSchema).default([]),
    checked: z.boolean(),
    addedAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema,
  })
  .refine((v) => v.ingredientId || v.label, {
    message: 'ingredientId or label is required',
    path: ['ingredientId'],
  });

export const RecommendationFeedbackSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  recipeId: IdSchema,
  feedback: FeedbackTypeSchema,
  createdAt: IsoTimestampSchema,
});
