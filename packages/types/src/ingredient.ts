import type { Id, Slug } from './primitives';
import type { LocalizedText } from './locale';

export const INGREDIENT_CATEGORIES = [
  'produce',
  'vegetable',
  'fruit',
  'herb',
  'spice',
  'grain',
  'legume',
  'dairy',
  'egg',
  'meat',
  'poultry',
  'seafood',
  'fat_or_oil',
  'sweetener',
  'condiment',
  'baking',
  'nut_or_seed',
  'beverage',
  'other',
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const COMMON_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'piece',
  'clove',
  'slice',
  'pinch',
  'to_taste',
] as const;
export type Unit = (typeof COMMON_UNITS)[number];

export const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'halal',
  'kosher',
  'gluten_free',
  'dairy_free',
  'egg_free',
  'nut_free',
  'low_carb',
  'high_protein',
] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export const ALLERGENS = [
  'gluten',
  'wheat',
  'dairy',
  'egg',
  'peanut',
  'tree_nut',
  'soy',
  'sesame',
  'fish',
  'shellfish',
  'mustard',
  'celery',
  'sulphite',
  'lupin',
  'mollusc',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

/** Dietary compatibility state per (ingredient, dietary_tag). */
export type Compatibility = 'compatible' | 'incompatible' | 'unknown';

export interface Ingredient {
  id: Id;
  slug: Slug;
  name: LocalizedText;
  /** Non-canonical alternative spellings and synonyms, one per locale (with `en` required). */
  aliases: Partial<Record<import('./locale.js').Locale, string[]>> & { en: string[] };
  category: IngredientCategory;
  commonUnits: Unit[];
  allergens: Allergen[];
  /** Dietary compatibility. Missing tag => 'unknown'. */
  dietaryCompatibility: Partial<Record<DietaryTag, Compatibility>>;
}
