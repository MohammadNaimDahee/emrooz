import type {
  CookingHistoryEntry,
  FavoriteEntry,
  MealPlanEntry,
  PantryItem,
  RecommendationFeedback,
  ShoppingListItem,
  UserPreferences,
} from '@emrooz/types';

/**
 * Repository surface that migrateUserData writes into. Kept as a minimal
 * structural type so the helper works against DemoEmroozData, SupabaseEmroozData,
 * or any future adapter without pulling the whole EmroozData surface in.
 */
export interface MigrationTarget {
  preferences: { save(prefs: UserPreferences): Promise<void> };
  pantry: {
    add(item: PantryItem): Promise<void>;
    list(userId: string): Promise<PantryItem[]>;
  };
  favorites: {
    add(entry: FavoriteEntry): Promise<void>;
    list(userId: string): Promise<FavoriteEntry[]>;
  };
  history: {
    add(entry: CookingHistoryEntry): Promise<void>;
    list(userId: string): Promise<CookingHistoryEntry[]>;
  };
  planner: {
    upsert(entry: MealPlanEntry): Promise<void>;
    listForRange(userId: string, start: string, end: string): Promise<MealPlanEntry[]>;
  };
  shoppingList: {
    upsert(item: ShoppingListItem): Promise<void>;
    list(userId: string): Promise<ShoppingListItem[]>;
  };
  feedback: {
    add(entry: RecommendationFeedback): Promise<void>;
    list(userId: string): Promise<RecommendationFeedback[]>;
  };
}

/**
 * Everything we know how to migrate. `sourceUserId` is only used when
 * `preserveIds` is false and we need to rewrite ids deterministically.
 */
export interface UserSnapshot {
  sourceUserId: string;
  preferences?: UserPreferences;
  pantry?: PantryItem[];
  favorites?: FavoriteEntry[];
  history?: CookingHistoryEntry[];
  planner?: MealPlanEntry[];
  shoppingList?: ShoppingListItem[];
  feedback?: RecommendationFeedback[];
}

export interface MigrationResult {
  preferencesSaved: boolean;
  pantryAdded: number;
  favoritesAdded: number;
  historyAdded: number;
  plannerAdded: number;
  shoppingAdded: number;
  feedbackAdded: number;
  skipped: {
    pantry: number;
    favorites: number;
    history: number;
    planner: number;
    shopping: number;
    feedback: number;
  };
}

/**
 * Copy a user snapshot into `target` under `targetUserId`. Idempotent by design —
 * running twice with the same input produces the same end state.
 *
 * Idempotency strategy:
 *  - We diff the source against what already lives in the destination and skip
 *    entries that are already present (matched by ingredient/recipe/date key,
 *    not by row id, because ids may have been remapped between adapters).
 *  - Preferences are upserted unconditionally — the source is the truth for
 *    the migration moment. Callers wanting to preserve destination-side edits
 *    should decide before calling migrateUserData.
 */
export async function migrateUserData(
  snapshot: UserSnapshot,
  targetUserId: string,
  target: MigrationTarget,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    preferencesSaved: false,
    pantryAdded: 0,
    favoritesAdded: 0,
    historyAdded: 0,
    plannerAdded: 0,
    shoppingAdded: 0,
    feedbackAdded: 0,
    skipped: { pantry: 0, favorites: 0, history: 0, planner: 0, shopping: 0, feedback: 0 },
  };

  if (snapshot.preferences) {
    await target.preferences.save({ ...snapshot.preferences, userId: targetUserId });
    result.preferencesSaved = true;
  }

  if (snapshot.pantry?.length) {
    const existing = new Set((await target.pantry.list(targetUserId)).map((p) => p.ingredientId));
    for (const item of snapshot.pantry) {
      if (existing.has(item.ingredientId)) {
        result.skipped.pantry += 1;
        continue;
      }
      await target.pantry.add({ ...item, userId: targetUserId });
      result.pantryAdded += 1;
    }
  }

  if (snapshot.favorites?.length) {
    const existing = new Set((await target.favorites.list(targetUserId)).map((f) => f.recipeId));
    for (const entry of snapshot.favorites) {
      if (existing.has(entry.recipeId)) {
        result.skipped.favorites += 1;
        continue;
      }
      await target.favorites.add({ ...entry, userId: targetUserId });
      result.favoritesAdded += 1;
    }
  }

  if (snapshot.history?.length) {
    // History is deduped on (recipeId, cookedOn) — a user rarely records the
    // same recipe twice on the same day.
    const existing = new Set(
      (await target.history.list(targetUserId)).map((h) => `${h.recipeId}::${h.cookedOn}`),
    );
    for (const entry of snapshot.history) {
      const key = `${entry.recipeId}::${entry.cookedOn}`;
      if (existing.has(key)) {
        result.skipped.history += 1;
        continue;
      }
      await target.history.add({ ...entry, userId: targetUserId });
      result.historyAdded += 1;
    }
  }

  if (snapshot.planner?.length) {
    const start = min(snapshot.planner.map((e) => e.date));
    const end = max(snapshot.planner.map((e) => e.date));
    const existing = new Set(
      (await target.planner.listForRange(targetUserId, start, end)).map(
        (e) => `${e.date}::${e.meal}`,
      ),
    );
    for (const entry of snapshot.planner) {
      const key = `${entry.date}::${entry.meal}`;
      if (existing.has(key)) {
        result.skipped.planner += 1;
        continue;
      }
      await target.planner.upsert({ ...entry, userId: targetUserId });
      result.plannerAdded += 1;
    }
  }

  if (snapshot.shoppingList?.length) {
    // Shopping list: dedupe on (ingredientId||label). Existing checked state
    // wins, so we never re-check something the user has already ticked off.
    const existing = new Set((await target.shoppingList.list(targetUserId)).map(shoppingKey));
    for (const item of snapshot.shoppingList) {
      const key = shoppingKey(item);
      if (existing.has(key)) {
        result.skipped.shopping += 1;
        continue;
      }
      await target.shoppingList.upsert({ ...item, userId: targetUserId });
      result.shoppingAdded += 1;
    }
  }

  if (snapshot.feedback?.length) {
    // Feedback is deduped on (recipeId, feedback). Repeats of the same negative
    // signal don't add extra weight to the engine — one is enough.
    const existing = new Set(
      (await target.feedback.list(targetUserId)).map((f) => `${f.recipeId}::${f.feedback}`),
    );
    for (const entry of snapshot.feedback) {
      const key = `${entry.recipeId}::${entry.feedback}`;
      if (existing.has(key)) {
        result.skipped.feedback += 1;
        continue;
      }
      await target.feedback.add({ ...entry, userId: targetUserId });
      result.feedbackAdded += 1;
    }
  }

  return result;
}

function shoppingKey(i: ShoppingListItem): string {
  return `${i.ingredientId ?? ''}::${(i.label ?? '').toLowerCase()}::${i.unit ?? ''}`;
}

function min(dates: string[]): string {
  return dates.reduce((a, b) => (a < b ? a : b));
}
function max(dates: string[]): string {
  return dates.reduce((a, b) => (a > b ? a : b));
}
