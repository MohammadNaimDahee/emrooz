import { beforeEach, describe, expect, it } from 'vitest';
import type { UserPreferences } from '@emrooz/types';

import { createDemoData, inferDemoMode, type EmroozData } from '../src';

const USER = 'user-a';
const OTHER = 'user-b';
const NOW = '2026-09-04T12:00:00.000Z';

function samplePrefs(userId: string, over: Partial<UserPreferences> = {}): UserPreferences {
  return {
    userId,
    language: 'en',
    cuisineIds: ['cu_afghan'],
    householdSize: 2,
    dietaryTags: [],
    allergens: [],
    dislikedIngredientIds: [],
    pantrySeedIngredientIds: [],
    ...over,
  };
}

describe('createDemoData / DemoEmroozData', () => {
  let data: EmroozData;

  beforeEach(() => {
    data = createDemoData();
  });

  it('reports itself as demo mode', () => {
    expect(data.isDemo).toBe(true);
  });

  it('serves the bundled seed via listPublished', async () => {
    const list = await data.recipes.listPublished({ limit: 100 });
    expect(list.length).toBeGreaterThan(10);
    for (const r of list) {
      expect(r.editorialState).toBe('published');
    }
  });

  it('filters recipes by cuisine and by search', async () => {
    const cuisines = await data.cuisines.all();
    const afghan = cuisines.find((c) => c.slug === 'afghan');
    expect(afghan).toBeDefined();
    const byCuisine = await data.recipes.listPublished({ cuisineId: afghan!.id });
    expect(byCuisine.length).toBeGreaterThan(0);
    for (const r of byCuisine) expect(r.cuisineIds).toContain(afghan!.id);

    const bySearch = await data.recipes.listPublished({ search: 'pizza' });
    expect(bySearch.every((r) => /pizza/i.test(r.title.en) || /pizza/i.test(r.description?.en ?? ''))).toBe(true);
  });

  it('finds recipes by slug and by id', async () => {
    const list = await data.recipes.listPublished({ limit: 5 });
    const target = list[0]!;
    expect(await data.recipes.findBySlug(target.slug)).toEqual(target);
    expect(await data.recipes.findById(target.id)).toEqual(target);
  });

  it('normalises ingredient search across aliases', async () => {
    // "Aubergine" is an alias of Eggplant in the seed.
    const results = await data.ingredients.search('aubergine');
    expect(results.some((i) => i.name.en === 'Eggplant')).toBe(true);
  });

  it('keeps pantry state per-user', async () => {
    await data.pantry.add({
      id: 'p1',
      userId: USER,
      ingredientId: 'rice',
      addedAt: NOW,
    });
    await data.pantry.add({
      id: 'p2',
      userId: OTHER,
      ingredientId: 'onion',
      addedAt: NOW,
    });
    const forUser = await data.pantry.list(USER);
    const forOther = await data.pantry.list(OTHER);
    expect(forUser.map((p) => p.ingredientId)).toEqual(['rice']);
    expect(forOther.map((p) => p.ingredientId)).toEqual(['onion']);
  });

  it('replaces the pantry via set()', async () => {
    await data.pantry.add({
      id: 'p1',
      userId: USER,
      ingredientId: 'rice',
      addedAt: NOW,
    });
    await data.pantry.set(USER, ['tomato', 'garlic']);
    const list = await data.pantry.list(USER);
    expect(list.map((p) => p.ingredientId).sort()).toEqual(['garlic', 'tomato']);
  });

  it('remove and clear pantry', async () => {
    await data.pantry.set(USER, ['a', 'b', 'c']);
    await data.pantry.remove(USER, 'b');
    let list = await data.pantry.list(USER);
    expect(list.map((p) => p.ingredientId).sort()).toEqual(['a', 'c']);
    await data.pantry.clear(USER);
    list = await data.pantry.list(USER);
    expect(list).toEqual([]);
  });

  it('favorites: add, isFavorite, remove', async () => {
    await data.favorites.add({
      id: 'f1',
      userId: USER,
      recipeId: 'r1',
      favoritedAt: NOW,
    });
    expect(await data.favorites.isFavorite(USER, 'r1')).toBe(true);
    expect(await data.favorites.isFavorite(USER, 'other')).toBe(false);
    await data.favorites.remove(USER, 'r1');
    expect(await data.favorites.isFavorite(USER, 'r1')).toBe(false);
  });

  it('history: add and remove', async () => {
    await data.history.add({
      id: 'h1',
      userId: USER,
      recipeId: 'r1',
      cookedOn: '2026-09-04',
      servings: 2,
      createdAt: NOW,
    });
    let list = await data.history.list(USER);
    expect(list).toHaveLength(1);
    await data.history.remove(USER, 'h1');
    list = await data.history.list(USER);
    expect(list).toEqual([]);
  });

  it('planner filters by date range', async () => {
    for (const [id, date] of [
      ['m1', '2026-08-30'],
      ['m2', '2026-09-04'],
      ['m3', '2026-09-10'],
    ] as const) {
      await data.planner.upsert({
        id,
        userId: USER,
        recipeId: 'r1',
        date,
        meal: 'dinner',
        servings: 2,
        createdAt: NOW,
      });
    }
    const week = await data.planner.listForRange(USER, '2026-09-01', '2026-09-07');
    expect(week.map((e) => e.id)).toEqual(['m2']);
  });

  it('shopping list: upsert, remove, clear, clear completed only', async () => {
    await data.shoppingList.upsert({
      id: 's1',
      userId: USER,
      ingredientId: 'rice',
      sourceRecipeIds: [],
      checked: false,
      addedAt: NOW,
      updatedAt: NOW,
    });
    await data.shoppingList.upsert({
      id: 's2',
      userId: USER,
      ingredientId: 'lamb',
      sourceRecipeIds: [],
      checked: true,
      addedAt: NOW,
      updatedAt: NOW,
    });
    let list = await data.shoppingList.list(USER);
    expect(list).toHaveLength(2);

    await data.shoppingList.clear(USER, { completedOnly: true });
    list = await data.shoppingList.list(USER);
    expect(list.map((i) => i.id)).toEqual(['s1']);

    await data.shoppingList.remove(USER, 's1');
    list = await data.shoppingList.list(USER);
    expect(list).toEqual([]);
  });

  it('preferences round-trip', async () => {
    const prefs = samplePrefs(USER, { householdSize: 5 });
    await data.preferences.save(prefs);
    const stored = await data.preferences.get(USER);
    expect(stored?.householdSize).toBe(5);
    expect(stored?.cuisineIds).toEqual(['cu_afghan']);
  });

  it('feedback + impressions accumulate per-user', async () => {
    await data.feedback.add({
      id: 'fb1',
      userId: USER,
      recipeId: 'r1',
      feedback: 'not_today',
      createdAt: NOW,
    });
    await data.impressions.record({
      id: 'imp1',
      userId: USER,
      recipeId: 'r1',
      shownAt: NOW,
      context: 'today',
    });
    expect(await data.feedback.list(USER)).toHaveLength(1);
    expect(await data.impressions.list(USER)).toHaveLength(1);
  });

  it('profile: createGuest issues a unique id per call', async () => {
    const p1 = await data.profile.createGuest();
    const p2 = await data.profile.createGuest();
    expect(p1.isGuest).toBe(true);
    expect(p2.isGuest).toBe(true);
    expect(p1.id).not.toBe(p2.id);
  });
});

describe('inferDemoMode', () => {
  it('is true when the explicit override is on', () => {
    expect(inferDemoMode({ EMROOZ_DEMO_MODE: 'on' })).toBe(true);
  });
  it('is false when the explicit override is off', () => {
    expect(
      inferDemoMode({
        EMROOZ_DEMO_MODE: 'off',
        NEXT_PUBLIC_SUPABASE_URL: 'x',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'y',
      }),
    ).toBe(false);
  });
  it('is true when Supabase env vars are missing', () => {
    expect(inferDemoMode({})).toBe(true);
  });
  it('is false when Supabase env vars are present and no override', () => {
    expect(
      inferDemoMode({
        NEXT_PUBLIC_SUPABASE_URL: 'https://x',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
      }),
    ).toBe(false);
  });
});
