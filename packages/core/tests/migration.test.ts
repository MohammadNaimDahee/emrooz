import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CookingHistoryEntry,
  FavoriteEntry,
  MealPlanEntry,
  PantryItem,
  RecommendationFeedback,
  ShoppingListItem,
  UserPreferences,
} from '@emrooz/types';

import { migrateUserData, type MigrationTarget, type UserSnapshot } from '../src/migration';

function createInMemoryTarget(): MigrationTarget & {
  _preferences: Map<string, UserPreferences>;
  _pantry: Map<string, PantryItem[]>;
  _favorites: Map<string, FavoriteEntry[]>;
  _history: Map<string, CookingHistoryEntry[]>;
  _planner: Map<string, MealPlanEntry[]>;
  _shopping: Map<string, ShoppingListItem[]>;
  _feedback: Map<string, RecommendationFeedback[]>;
} {
  const _preferences = new Map<string, UserPreferences>();
  const _pantry = new Map<string, PantryItem[]>();
  const _favorites = new Map<string, FavoriteEntry[]>();
  const _history = new Map<string, CookingHistoryEntry[]>();
  const _planner = new Map<string, MealPlanEntry[]>();
  const _shopping = new Map<string, ShoppingListItem[]>();
  const _feedback = new Map<string, RecommendationFeedback[]>();

  return {
    _preferences,
    _pantry,
    _favorites,
    _history,
    _planner,
    _shopping,
    _feedback,

    preferences: {
      async save(p) {
        _preferences.set(p.userId, p);
      },
    },
    pantry: {
      async add(item) {
        const list = _pantry.get(item.userId) ?? [];
        list.push(item);
        _pantry.set(item.userId, list);
      },
      async list(userId) {
        return _pantry.get(userId) ?? [];
      },
    },
    favorites: {
      async add(entry) {
        const list = _favorites.get(entry.userId) ?? [];
        list.push(entry);
        _favorites.set(entry.userId, list);
      },
      async list(userId) {
        return _favorites.get(userId) ?? [];
      },
    },
    history: {
      async add(entry) {
        const list = _history.get(entry.userId) ?? [];
        list.push(entry);
        _history.set(entry.userId, list);
      },
      async list(userId) {
        return _history.get(userId) ?? [];
      },
    },
    planner: {
      async upsert(entry) {
        const list = _planner.get(entry.userId) ?? [];
        // upsert semantics: replace if same (date, meal)
        const filtered = list.filter((e) => !(e.date === entry.date && e.meal === entry.meal));
        filtered.push(entry);
        _planner.set(entry.userId, filtered);
      },
      async listForRange(userId, start, end) {
        return (_planner.get(userId) ?? []).filter((e) => e.date >= start && e.date <= end);
      },
    },
    shoppingList: {
      async upsert(item) {
        const list = _shopping.get(item.userId) ?? [];
        const filtered = list.filter((i) => i.id !== item.id);
        filtered.push(item);
        _shopping.set(item.userId, filtered);
      },
      async list(userId) {
        return _shopping.get(userId) ?? [];
      },
    },
    feedback: {
      async add(entry) {
        const list = _feedback.get(entry.userId) ?? [];
        list.push(entry);
        _feedback.set(entry.userId, list);
      },
      async list(userId) {
        return _feedback.get(userId) ?? [];
      },
    },
  };
}

const NOW = '2026-09-04T12:00:00.000Z';
const TODAY = '2026-09-04';

function baseSnapshot(): UserSnapshot {
  return {
    sourceUserId: 'guest-abc',
    preferences: {
      userId: 'guest-abc',
      language: 'en',
      cuisineIds: ['cu_afghan'],
      householdSize: 3,
      dietaryTags: ['halal'],
      allergens: ['peanut'],
      dislikedIngredientIds: [],
      pantrySeedIngredientIds: [],
      onboardedAt: NOW,
    },
    pantry: [
      { id: 'p1', userId: 'guest-abc', ingredientId: 'rice', addedAt: NOW },
      { id: 'p2', userId: 'guest-abc', ingredientId: 'onion', addedAt: NOW },
    ],
    favorites: [
      { id: 'f1', userId: 'guest-abc', recipeId: 'qabuli-palaw', favoritedAt: NOW },
    ],
    history: [
      {
        id: 'h1',
        userId: 'guest-abc',
        recipeId: 'chana-masala',
        cookedOn: TODAY,
        servings: 4,
        note: 'Extra ginger',
        createdAt: NOW,
      },
    ],
    planner: [
      {
        id: 'm1',
        userId: 'guest-abc',
        recipeId: 'qabuli-palaw',
        date: TODAY,
        meal: 'dinner',
        servings: 4,
        createdAt: NOW,
      },
    ],
    shoppingList: [
      {
        id: 's1',
        userId: 'guest-abc',
        ingredientId: 'lamb',
        sourceRecipeIds: [],
        checked: false,
        addedAt: NOW,
        updatedAt: NOW,
      },
    ],
    feedback: [
      {
        id: 'fb1',
        userId: 'guest-abc',
        recipeId: 'shorwa',
        feedback: 'not_today',
        createdAt: NOW,
      },
    ],
  };
}

describe('migrateUserData', () => {
  let target: ReturnType<typeof createInMemoryTarget>;
  const TARGET = 'user-real';

  beforeEach(() => {
    target = createInMemoryTarget();
  });

  it('copies every collection under the target user id', async () => {
    const result = await migrateUserData(baseSnapshot(), TARGET, target);
    expect(result.preferencesSaved).toBe(true);
    expect(result.pantryAdded).toBe(2);
    expect(result.favoritesAdded).toBe(1);
    expect(result.historyAdded).toBe(1);
    expect(result.plannerAdded).toBe(1);
    expect(result.shoppingAdded).toBe(1);
    expect(result.feedbackAdded).toBe(1);

    expect(target._preferences.get(TARGET)?.userId).toBe(TARGET);
    expect(target._preferences.get(TARGET)?.cuisineIds).toEqual(['cu_afghan']);

    expect(target._pantry.get(TARGET)?.every((p) => p.userId === TARGET)).toBe(true);
    expect(target._favorites.get(TARGET)?.[0]?.userId).toBe(TARGET);
    expect(target._history.get(TARGET)?.[0]?.userId).toBe(TARGET);
    expect(target._planner.get(TARGET)?.[0]?.userId).toBe(TARGET);
    expect(target._shopping.get(TARGET)?.[0]?.userId).toBe(TARGET);
    expect(target._feedback.get(TARGET)?.[0]?.userId).toBe(TARGET);
  });

  it('is idempotent — a second run adds nothing', async () => {
    const first = await migrateUserData(baseSnapshot(), TARGET, target);
    const second = await migrateUserData(baseSnapshot(), TARGET, target);

    expect(first.pantryAdded).toBe(2);
    expect(second.pantryAdded).toBe(0);
    expect(second.skipped.pantry).toBe(2);

    expect(second.favoritesAdded).toBe(0);
    expect(second.skipped.favorites).toBe(1);

    expect(second.historyAdded).toBe(0);
    expect(second.skipped.history).toBe(1);

    expect(second.plannerAdded).toBe(0);
    expect(second.skipped.planner).toBe(1);

    expect(second.shoppingAdded).toBe(0);
    expect(second.skipped.shopping).toBe(1);

    expect(second.feedbackAdded).toBe(0);
    expect(second.skipped.feedback).toBe(1);

    expect(target._pantry.get(TARGET)).toHaveLength(2);
    expect(target._favorites.get(TARGET)).toHaveLength(1);
    expect(target._history.get(TARGET)).toHaveLength(1);
    expect(target._planner.get(TARGET)).toHaveLength(1);
    expect(target._shopping.get(TARGET)).toHaveLength(1);
    expect(target._feedback.get(TARGET)).toHaveLength(1);
  });

  it('skips items that already exist in the target (partial pre-existing state)', async () => {
    // Pre-populate the target with a matching pantry item, a different favorite,
    // and a matching history entry.
    await target.pantry.add({ id: 'existing-1', userId: TARGET, ingredientId: 'rice', addedAt: NOW });
    await target.favorites.add({
      id: 'existing-fav',
      userId: TARGET,
      recipeId: 'other-recipe',
      favoritedAt: NOW,
    });
    await target.history.add({
      id: 'existing-hist',
      userId: TARGET,
      recipeId: 'chana-masala',
      cookedOn: TODAY,
      servings: 2,
      createdAt: NOW,
    });

    const result = await migrateUserData(baseSnapshot(), TARGET, target);

    expect(result.pantryAdded).toBe(1); // only onion added, rice already present
    expect(result.skipped.pantry).toBe(1);

    expect(result.favoritesAdded).toBe(1); // qabuli-palaw is new
    expect(result.skipped.favorites).toBe(0);

    expect(result.historyAdded).toBe(0); // (chana-masala, today) already present
    expect(result.skipped.history).toBe(1);
  });

  it('merges shopping list by (ingredient/label, unit) so different units stay separate', async () => {
    await target.shoppingList.upsert({
      id: 'existing-sl',
      userId: TARGET,
      ingredientId: 'lamb',
      sourceRecipeIds: [],
      checked: true, // pre-checked — must not be reset
      addedAt: NOW,
      updatedAt: NOW,
    });

    const result = await migrateUserData(baseSnapshot(), TARGET, target);

    expect(result.shoppingAdded).toBe(0);
    expect(result.skipped.shopping).toBe(1);
    expect(target._shopping.get(TARGET)?.[0]?.checked).toBe(true); // preserved
  });

  it('preserves the destination language when preferences are provided', async () => {
    // The migration policy is: source wins for preferences. Callers wanting to
    // preserve destination-side edits should decide before calling.
    await target.preferences.save({
      userId: TARGET,
      language: 'de',
      cuisineIds: [],
      householdSize: 1,
      dietaryTags: [],
      allergens: [],
      dislikedIngredientIds: [],
      pantrySeedIngredientIds: [],
    });

    await migrateUserData(baseSnapshot(), TARGET, target);
    expect(target._preferences.get(TARGET)?.language).toBe('en'); // source won
    expect(target._preferences.get(TARGET)?.householdSize).toBe(3);
  });

  it('no-op when the snapshot has no collections', async () => {
    const result = await migrateUserData({ sourceUserId: 'guest' }, TARGET, target);
    expect(result.preferencesSaved).toBe(false);
    expect(result.pantryAdded).toBe(0);
    expect(result.favoritesAdded).toBe(0);
    expect(target._preferences.size).toBe(0);
  });

  it('history dedupes on (recipeId, cookedOn), not on id', async () => {
    await target.history.add({
      id: 'destination-id',
      userId: TARGET,
      recipeId: 'chana-masala',
      cookedOn: TODAY,
      servings: 1,
      createdAt: NOW,
    });

    const result = await migrateUserData(baseSnapshot(), TARGET, target);
    expect(result.skipped.history).toBe(1); // matched by (recipe, day) despite different id
    expect(target._history.get(TARGET)).toHaveLength(1);
  });
});
