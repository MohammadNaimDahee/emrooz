import { describe, expect, it } from 'vitest';
import type { RecipeIngredient } from '@emrooz/types';

import { scaleIngredients } from '../src/scaling';

function line(overrides: Partial<RecipeIngredient>): RecipeIngredient {
  return {
    ingredientId: overrides.ingredientId ?? 'ing',
    quantity: overrides.quantity,
    unit: overrides.unit,
    note: overrides.note,
    optional: overrides.optional,
    group: overrides.group,
  };
}

describe('scaleIngredients', () => {
  it('halves and doubles quantities', () => {
    const recipe = {
      servings: 4,
      ingredients: [line({ ingredientId: 'flour', quantity: 200, unit: 'g' })],
    };
    const halved = scaleIngredients(recipe, 2);
    expect(halved[0]?.quantity).toBe(100);
    const doubled = scaleIngredients(recipe, 8);
    expect(doubled[0]?.quantity).toBe(400);
  });

  it('rounds sanely for fractional targets', () => {
    const recipe = {
      servings: 4,
      ingredients: [line({ ingredientId: 'sugar', quantity: 100, unit: 'g' })],
    };
    // 3 servings → 75 g exact.
    expect(scaleIngredients(recipe, 3)[0]?.quantity).toBe(75);
  });

  it('leaves "to taste" quantities untouched', () => {
    const recipe = {
      servings: 4,
      ingredients: [line({ ingredientId: 'salt' })],
    };
    const scaled = scaleIngredients(recipe, 8);
    expect(scaled[0]?.quantity).toBeUndefined();
  });

  it('is a no-op when target servings is zero or negative', () => {
    const recipe = {
      servings: 4,
      ingredients: [line({ ingredientId: 'flour', quantity: 200 })],
    };
    expect(scaleIngredients(recipe, 0)[0]?.quantity).toBe(200);
    expect(scaleIngredients(recipe, -2)[0]?.quantity).toBe(200);
  });

  it('is a no-op when baseline servings is zero (avoids divide-by-zero)', () => {
    const recipe = {
      servings: 0,
      ingredients: [line({ ingredientId: 'flour', quantity: 200 })],
    };
    expect(scaleIngredients(recipe, 4)[0]?.quantity).toBe(200);
  });

  it('preserves non-quantitative fields', () => {
    const recipe = {
      servings: 2,
      ingredients: [
        line({
          ingredientId: 'onion',
          quantity: 1,
          unit: 'piece',
          note: { en: 'thinly sliced' },
          optional: true,
        }),
      ],
    };
    const scaled = scaleIngredients(recipe, 4);
    expect(scaled[0]?.unit).toBe('piece');
    expect(scaled[0]?.note?.en).toBe('thinly sliced');
    expect(scaled[0]?.optional).toBe(true);
    expect(scaled[0]?.quantity).toBe(2);
  });

  it('uses coarser rounding for large quantities', () => {
    const recipe = {
      servings: 3,
      ingredients: [line({ ingredientId: 'water', quantity: 300, unit: 'ml' })],
    };
    // 100 servings → 10000ml, but rounded to a whole number because value >= 100.
    const scaled = scaleIngredients(recipe, 100);
    expect(Number.isInteger(scaled[0]!.quantity!)).toBe(true);
  });
});
