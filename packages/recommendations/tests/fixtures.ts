import type {
  Ingredient,
  Recipe,
  UserPreferences,
  CookingHistoryEntry,
  FavoriteEntry,
  RecommendationFeedback,
  RecommendationImpression,
} from '@emrooz/types';

const now = '2026-09-03T09:00:00.000Z';
const today = '2026-09-03';

function ing(id: string, name: string, opts: Partial<Ingredient> = {}): Ingredient {
  return {
    id,
    slug: id,
    name: { en: name },
    aliases: { en: [] },
    category: 'other',
    commonUnits: [],
    allergens: [],
    dietaryCompatibility: {},
    ...opts,
  };
}

export const INGREDIENTS: Ingredient[] = [
  ing('rice', 'Rice', {
    dietaryCompatibility: { vegan: 'compatible', vegetarian: 'compatible', halal: 'compatible' },
  }),
  ing('lamb', 'Lamb', {
    allergens: [],
    dietaryCompatibility: {
      vegetarian: 'incompatible',
      vegan: 'incompatible',
      halal: 'compatible',
    },
  }),
  ing('pork', 'Pork', {
    allergens: [],
    dietaryCompatibility: {
      vegetarian: 'incompatible',
      vegan: 'incompatible',
      halal: 'incompatible',
      kosher: 'incompatible',
    },
  }),
  ing('milk', 'Milk', {
    allergens: ['dairy'],
    dietaryCompatibility: { vegan: 'incompatible', vegetarian: 'compatible' },
  }),
  ing('peanut', 'Peanut', {
    allergens: ['peanut', 'tree_nut'],
    dietaryCompatibility: { vegan: 'compatible', vegetarian: 'compatible' },
  }),
  ing('onion', 'Onion', {
    dietaryCompatibility: { vegan: 'compatible', vegetarian: 'compatible', halal: 'compatible' },
  }),
  ing('tomato', 'Tomato', {
    dietaryCompatibility: { vegan: 'compatible', vegetarian: 'compatible', halal: 'compatible' },
  }),
  ing('spinach', 'Spinach', {
    dietaryCompatibility: { vegan: 'compatible', vegetarian: 'compatible', halal: 'compatible' },
  }),
  ing('cheese_mozz', 'Mozzarella', {
    allergens: ['dairy'],
    dietaryCompatibility: { vegetarian: 'compatible', vegan: 'incompatible' },
  }),
  ing('flour', 'Flour', {
    allergens: ['gluten', 'wheat'],
    dietaryCompatibility: { vegan: 'compatible', vegetarian: 'compatible', halal: 'compatible' },
  }),
];

export const INGREDIENT_MAP = new Map(INGREDIENTS.map((i) => [i.id, i]));

function recipe(id: string, opts: Partial<Recipe> & Pick<Recipe, 'title' | 'ingredients'>): Recipe {
  return {
    id,
    slug: id,
    cuisineIds: ['italian'],
    regionIds: [],
    prepMinutes: 10,
    cookMinutes: 20,
    totalMinutes: 30,
    difficulty: 'easy',
    mealTypes: ['dinner'],
    servings: 2,
    dietaryTags: [],
    allergens: [],
    images: [],
    provenance: {
      contentOwner: 'Emrooz',
      ownershipType: 'emrooz_owned',
      storagePermission: 'permanent',
    },
    editorialState: 'published',
    authenticityReview: 'unreviewed',
    updatedAt: now,
    createdAt: now,
    version: 1,
    steps: [{ order: 0, text: { en: 'Cook.' } }],
    ...opts,
  };
}

export const R = {
  qabuli: recipe('qabuli', {
    title: { en: 'Qabuli Palaw' },
    cuisineIds: ['afghan'],
    totalMinutes: 90,
    prepMinutes: 30,
    cookMinutes: 60,
    difficulty: 'medium',
    servings: 4,
    ingredients: [{ ingredientId: 'rice' }, { ingredientId: 'lamb' }, { ingredientId: 'onion' }],
    dietaryTags: ['halal'],
  }),
  bolaniKadu: recipe('bolani-kadu', {
    title: { en: 'Bolani Kadu' },
    cuisineIds: ['afghan'],
    totalMinutes: 45,
    ingredients: [{ ingredientId: 'flour' }, { ingredientId: 'onion' }],
    dietaryTags: ['vegetarian', 'vegan'],
  }),
  margherita: recipe('margherita', {
    title: { en: 'Pizza Margherita' },
    cuisineIds: ['italian'],
    totalMinutes: 45,
    ingredients: [
      { ingredientId: 'flour' },
      { ingredientId: 'tomato' },
      { ingredientId: 'cheese_mozz' },
    ],
    dietaryTags: ['vegetarian'],
    allergens: ['gluten', 'wheat', 'dairy'],
  }),
  quickTomatoRice: recipe('quick-tomato-rice', {
    title: { en: 'Quick Tomato Rice' },
    cuisineIds: ['other'],
    totalMinutes: 20,
    ingredients: [{ ingredientId: 'rice' }, { ingredientId: 'tomato' }, { ingredientId: 'onion' }],
    dietaryTags: ['vegetarian', 'vegan', 'halal'],
  }),
  peanutStew: recipe('peanut-stew', {
    title: { en: 'Peanut Stew' },
    cuisineIds: ['west_african'],
    totalMinutes: 60,
    ingredients: [
      { ingredientId: 'peanut' },
      { ingredientId: 'onion' },
      { ingredientId: 'tomato' },
    ],
    allergens: ['peanut'],
    dietaryTags: ['vegan', 'vegetarian', 'halal'],
  }),
  porkRoast: recipe('pork-roast', {
    title: { en: 'Pork Roast' },
    cuisineIds: ['german'],
    totalMinutes: 120,
    ingredients: [{ ingredientId: 'pork' }, { ingredientId: 'onion' }],
    dietaryTags: [],
  }),
  unpublishedDraft: recipe('unpublished-draft', {
    title: { en: 'Draft Recipe' },
    editorialState: 'draft',
    ingredients: [{ ingredientId: 'rice' }],
  }),
  archivedRecipe: recipe('archived-recipe', {
    title: { en: 'Archived Recipe' },
    editorialState: 'archived',
    ingredients: [{ ingredientId: 'rice' }],
  }),
  unknownDietaryData: recipe('mystery-stew', {
    title: { en: 'Mystery Stew' },
    ingredients: [{ ingredientId: 'onion' }, { ingredientId: 'tomato' }],
    dietaryTags: [], // no explicit vegan tag; ingredients lack dietary metadata below
  }),
} as const;

export const ALL_RECIPES: Recipe[] = [
  R.qabuli,
  R.bolaniKadu,
  R.margherita,
  R.quickTomatoRice,
  R.peanutStew,
  R.porkRoast,
  R.unpublishedDraft,
  R.archivedRecipe,
];

export function baseUserPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    userId: 'user-1',
    language: 'en',
    cuisineIds: [],
    householdSize: 2,
    dietaryTags: [],
    allergens: [],
    dislikedIngredientIds: [],
    pantrySeedIngredientIds: [],
    ...overrides,
  };
}

export const TODAY = today;
export const TOMORROW = '2026-09-04';

export function pantry(...ids: string[]): Set<string> {
  return new Set(ids);
}

export const noFav: FavoriteEntry[] = [];
export const noHistory: CookingHistoryEntry[] = [];
export const noFeedback: RecommendationFeedback[] = [];
export const noImpressions: RecommendationImpression[] = [];
