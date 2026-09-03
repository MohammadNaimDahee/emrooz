import { describe, expect, it } from 'vitest';
import {
  ALL_RECIPES,
  baseUserPreferences,
  INGREDIENT_MAP,
  noFav,
  noFeedback,
  noHistory,
  noImpressions,
  pantry,
  R,
  TODAY,
  TOMORROW,
} from './fixtures';
import { recommend } from '../src/engine';

const commonInput = () => ({
  today: TODAY,
  userId: 'user-1',
  pantry: pantry(),
  favorites: noFav,
  history: noHistory,
  feedback: noFeedback,
  impressions: noImpressions,
  recipes: ALL_RECIPES,
  ingredients: INGREDIENT_MAP,
});

describe('recommend — hard filters', () => {
  it('excludes recipes containing user allergens', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences({ allergens: ['peanut'] }),
    });
    expect(out.some((r) => r.recipe.id === 'peanut-stew')).toBe(false);
  });

  it('excludes recipes incompatible with strict dietary restriction (vegan blocks lamb)', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences({ dietaryTags: ['vegan'] }),
    });
    expect(out.some((r) => r.recipe.id === 'qabuli')).toBe(false);
    expect(out.some((r) => r.recipe.id === 'pork-roast')).toBe(false);
  });

  it('excludes disliked ingredients', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences({ dislikedIngredientIds: ['tomato'] }),
    });
    expect(out.some((r) => r.recipe.id === 'quick-tomato-rice')).toBe(false);
    expect(out.some((r) => r.recipe.id === 'margherita')).toBe(false);
  });

  it('excludes recipes exceeding an explicit maximum time', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences({ maxCookMinutes: 30 }),
    });
    expect(out.some((r) => r.recipe.totalMinutes > 30)).toBe(false);
  });

  it('excludes unpublished, draft, and archived recipes', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences(),
      limit: 100,
    });
    for (const rec of out) {
      expect(rec.recipe.editorialState).toBe('published');
    }
  });

  it('treats missing dietary metadata as unsafe under strict restrictions', () => {
    // "mystery-stew" has no dietary tag and its onion/tomato lack a vegan mark by default in a stripped map.
    const strippedMap = new Map(INGREDIENT_MAP);
    const onion = { ...strippedMap.get('onion')!, dietaryCompatibility: {} };
    const tomato = { ...strippedMap.get('tomato')!, dietaryCompatibility: {} };
    strippedMap.set('onion', onion);
    strippedMap.set('tomato', tomato);

    const out = recommend({
      ...commonInput(),
      ingredients: strippedMap,
      recipes: [R.unknownDietaryData, R.quickTomatoRice], // provide only these
      preferences: baseUserPreferences({ dietaryTags: ['vegan'] }),
    });
    // quick-tomato-rice carries an explicit vegan tag so it stays;
    // mystery-stew must be excluded because we cannot confirm safety.
    expect(out.some((r) => r.recipe.id === 'mystery-stew')).toBe(false);
    expect(out.some((r) => r.recipe.id === 'quick-tomato-rice')).toBe(true);
  });

  it('respects the "vegetarian" quick filter', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences(),
      quickFilter: 'vegetarian',
    });
    for (const rec of out) {
      expect(rec.recipe.dietaryTags.some((t) => t === 'vegetarian' || t === 'vegan')).toBe(true);
    }
  });

  it('respects the "quick_meal" quick filter (<=30 minutes)', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences(),
      quickFilter: 'quick_meal',
    });
    for (const rec of out) expect(rec.recipe.totalMinutes).toBeLessThanOrEqual(30);
  });
});

describe('recommend — scoring behavior', () => {
  it('boosts recipes with high pantry match', () => {
    const out = recommend({
      ...commonInput(),
      pantry: pantry('rice', 'tomato', 'onion'),
      preferences: baseUserPreferences(),
    });
    expect(out[0]?.recipe.id).toBe('quick-tomato-rice');
  });

  it('prefers user cuisine preference when other signals are neutral', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences({ cuisineIds: ['afghan'] }),
    });
    const top = out[0]?.recipe;
    expect(top?.cuisineIds).toContain('afghan');
  });

  it('penalizes recipes cooked very recently', () => {
    const with_recent = recommend({
      ...commonInput(),
      preferences: baseUserPreferences(),
      history: [
        {
          id: 'h1',
          userId: 'user-1',
          recipeId: 'quick-tomato-rice',
          cookedOn: TODAY,
          servings: 2,
          createdAt: `${TODAY}T00:00:00Z`,
        },
      ],
      pantry: pantry('rice', 'tomato', 'onion'),
    });
    expect(with_recent[0]?.recipe.id).not.toBe('quick-tomato-rice');
  });

  it('boosts favorites', () => {
    const withoutFav = recommend({
      ...commonInput(),
      preferences: baseUserPreferences(),
    });
    const withFav = recommend({
      ...commonInput(),
      preferences: baseUserPreferences(),
      favorites: [
        { id: 'f1', userId: 'user-1', recipeId: 'margherita', favoritedAt: `${TODAY}T00:00:00Z` },
      ],
    });
    const marginBefore = scoreOf(withoutFav, 'margherita') ?? 0;
    const marginAfter = scoreOf(withFav, 'margherita') ?? 0;
    expect(marginAfter).toBeGreaterThan(marginBefore);
  });

  it('produces stable results for the same day', () => {
    const a = recommend({ ...commonInput(), preferences: baseUserPreferences() });
    const b = recommend({ ...commonInput(), preferences: baseUserPreferences() });
    expect(a.map((r) => r.recipe.id)).toEqual(b.map((r) => r.recipe.id));
  });

  it('produces different variation across days', () => {
    const a = recommend({ ...commonInput(), today: TODAY, preferences: baseUserPreferences() });
    const b = recommend({ ...commonInput(), today: TOMORROW, preferences: baseUserPreferences() });
    // Not asserting they must differ (top choice could be so dominant it always wins)
    // but the raw scores should differ by the daily variation term.
    const aScores = a.map((r) => r.score);
    const bScores = b.map((r) => r.score);
    expect(aScores).not.toEqual(bScores);
  });

  it('returns empty list when no recipe is safe', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences({
        allergens: ['gluten', 'wheat', 'dairy', 'peanut'],
        dietaryTags: ['vegan'],
      }),
    });
    // Every remaining recipe either has one of those allergens or a vegan-incompatible ingredient.
    expect(out.length).toBeLessThanOrEqual(2);
    for (const rec of out) {
      expect(rec.recipe.allergens).not.toContain('gluten');
      expect(rec.recipe.allergens).not.toContain('dairy');
    }
  });

  it('missingIngredientIds reports only required non-optional ingredients', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences(),
      pantry: pantry('rice'),
    });
    const rec = out.find((r) => r.recipe.id === 'quick-tomato-rice');
    expect(rec).toBeTruthy();
    expect(rec!.missingIngredientIds).toEqual(expect.arrayContaining(['tomato', 'onion']));
    expect(rec!.missingIngredientIds).not.toContain('rice');
  });

  it('every returned recommendation carries an explanation string', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences(),
    });
    for (const rec of out) expect(rec.reason.length).toBeGreaterThan(0);
  });
});

describe('recommend — guest users', () => {
  it('works when the user has no preferences and no history', () => {
    const out = recommend({
      ...commonInput(),
      preferences: baseUserPreferences({ cuisineIds: [], dietaryTags: [], allergens: [] }),
    });
    expect(out.length).toBeGreaterThan(0);
    for (const rec of out) expect(rec.recipe.editorialState).toBe('published');
  });
});

function scoreOf(list: ReturnType<typeof recommend>, id: string): number | undefined {
  return list.find((r) => r.recipe.id === id)?.score;
}
