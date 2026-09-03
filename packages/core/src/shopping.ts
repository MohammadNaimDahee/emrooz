import type {
  Ingredient,
  IngredientCategory,
  Recipe,
  ShoppingListItem,
  Unit,
} from '@emrooz/types';

/** Result of combining/normalizing a shopping list into a display list. */
export interface CombinedShoppingItem {
  /** Stable identity for the combined bucket — the ingredient id if resolvable, otherwise the label. */
  key: string;
  ingredientId?: string;
  label: string;
  quantity?: number;
  unit?: Unit;
  checked: boolean;
  sourceRecipeIds: string[];
  /** Underlying items that were merged into this bucket. */
  items: ShoppingListItem[];
  category: IngredientCategory | 'other';
}

/**
 * Merge shopping list items that reference the same ingredient with a
 * compatible unit. Sums quantities where possible; unmergable duplicates
 * (different units) stay as separate rows.
 *
 * "Checked" state on the combined row is true only when every underlying
 * item is checked, so a single unchecked contributor keeps the group active.
 */
export function combineShoppingList(
  items: readonly ShoppingListItem[],
  ingredients: Map<string, Ingredient>,
): CombinedShoppingItem[] {
  const buckets = new Map<string, CombinedShoppingItem>();

  for (const item of items) {
    const ing = item.ingredientId ? ingredients.get(item.ingredientId) : undefined;
    const label = ing?.name.en ?? item.label ?? item.ingredientId ?? 'item';
    const category: CombinedShoppingItem['category'] = ing?.category ?? 'other';
    // Group by (ingredient, unit) so `2 tsp salt` + `1 tsp salt` merge, but
    // `100 g sugar` + `1 cup sugar` stay separate — we don't know the density.
    const bucketKey = item.ingredientId ? `${item.ingredientId}::${item.unit ?? ''}` : `label::${label.toLowerCase()}::${item.unit ?? ''}`;

    const existing = buckets.get(bucketKey);
    if (existing) {
      if (typeof item.quantity === 'number') {
        existing.quantity = (existing.quantity ?? 0) + item.quantity;
      }
      existing.checked = existing.checked && item.checked;
      for (const rid of item.sourceRecipeIds) {
        if (!existing.sourceRecipeIds.includes(rid)) existing.sourceRecipeIds.push(rid);
      }
      existing.items.push(item);
    } else {
      buckets.set(bucketKey, {
        key: bucketKey,
        ingredientId: item.ingredientId,
        label,
        quantity: item.quantity,
        unit: item.unit,
        checked: item.checked,
        sourceRecipeIds: [...item.sourceRecipeIds],
        items: [item],
        category,
      });
    }
  }

  return [...buckets.values()].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.label.localeCompare(b.label);
  });
}

/** Group combined items by their category, preserving sort order. */
export function groupShoppingByCategory(combined: CombinedShoppingItem[]): Array<{
  category: CombinedShoppingItem['category'];
  items: CombinedShoppingItem[];
}> {
  const map = new Map<string, CombinedShoppingItem[]>();
  for (const c of combined) {
    const list = map.get(c.category) ?? [];
    list.push(c);
    map.set(c.category, list);
  }
  return [...map.entries()].map(([category, items]) => ({
    category: category as CombinedShoppingItem['category'],
    items,
  }));
}

/**
 * Given a set of recipes and the user's pantry, produce the list of ingredient
 * ids the user is missing across all recipes combined. De-duplicated by ingredient id.
 * Used when adding a recipe (or a whole week) to the shopping list.
 */
export function missingIngredientsFor(
  recipes: readonly Pick<Recipe, 'ingredients'>[],
  pantry: ReadonlySet<string>,
): string[] {
  const missing = new Set<string>();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      if (ing.optional) continue;
      if (!pantry.has(ing.ingredientId)) missing.add(ing.ingredientId);
    }
  }
  return [...missing];
}
