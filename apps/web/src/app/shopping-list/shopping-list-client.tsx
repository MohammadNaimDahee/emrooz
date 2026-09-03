'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { combineShoppingList, groupShoppingByCategory } from '@emrooz/core';
import type { ShoppingListItem, Unit } from '@emrooz/types';

import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';

const CATEGORY_LABEL: Record<string, string> = {
  produce: 'Produce',
  vegetable: 'Vegetables',
  fruit: 'Fruit',
  herb: 'Herbs',
  spice: 'Spices',
  grain: 'Grains',
  legume: 'Legumes',
  dairy: 'Dairy',
  egg: 'Eggs',
  meat: 'Meat',
  poultry: 'Poultry',
  seafood: 'Seafood',
  fat_or_oil: 'Fats & oils',
  sweetener: 'Sweeteners',
  condiment: 'Condiments',
  baking: 'Baking',
  nut_or_seed: 'Nuts & seeds',
  beverage: 'Beverages',
  other: 'Other',
};

export default function ShoppingListClient() {
  const data = getData();
  const userId = useGuestId();
  const client = useQueryClient();
  const [manualLabel, setManualLabel] = useState('');

  const listQ = useQuery({
    queryKey: ['shopping-list', userId],
    enabled: Boolean(userId),
    queryFn: () => data.shoppingList.list(userId),
  });
  const ingQ = useQuery({
    queryKey: ['ingredients-index'],
    queryFn: () => data.ingredients.all(),
  });

  const ingredientMap = useMemo(
    () => new Map((ingQ.data ?? []).map((i) => [i.id, i])),
    [ingQ.data],
  );

  const grouped = useMemo(() => {
    const combined = combineShoppingList(listQ.data ?? [], ingredientMap);
    return groupShoppingByCategory(combined);
  }, [listQ.data, ingredientMap]);

  const upsert = useMutation({
    mutationFn: (item: ShoppingListItem) => data.shoppingList.upsert(item),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shopping-list'] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => data.shoppingList.remove(userId, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shopping-list'] }),
  });
  const clear = useMutation({
    mutationFn: (completedOnly: boolean) =>
      data.shoppingList.clear(userId, { completedOnly }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shopping-list'] }),
  });

  async function toggleGroup(group: ReturnType<typeof combineShoppingList>[number], next: boolean) {
    // Toggling a combined row propagates to every underlying item.
    for (const item of group.items) {
      await upsert.mutateAsync({ ...item, checked: next, updatedAt: new Date().toISOString() });
    }
  }

  async function removeGroup(group: ReturnType<typeof combineShoppingList>[number]) {
    for (const item of group.items) {
      await remove.mutateAsync(item.id);
    }
  }

  async function addManual() {
    if (!manualLabel.trim() || !userId) return;
    await upsert.mutateAsync({
      id: `sl_${Math.random().toString(36).slice(2)}`,
      userId,
      label: manualLabel.trim(),
      sourceRecipeIds: [],
      checked: false,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setManualLabel('');
  }

  const activeCount = (listQ.data ?? []).filter((i) => !i.checked).length;
  const doneCount = (listQ.data ?? []).filter((i) => i.checked).length;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">Ready to shop</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">Shopping list</h1>
      <p className="text-ink-500 mt-2 max-w-xl">
        {activeCount === 0
          ? 'Nothing to buy right now. Add missing ingredients from any recipe or planner week.'
          : `${activeCount} to buy · ${doneCount} done`}
      </p>

      {/* Add manual item */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addManual();
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={manualLabel}
          onChange={(e) => setManualLabel(e.target.value)}
          placeholder="Add anything — milk, olive oil, dish sponge…"
          className="flex-1 rounded-pill border border-ink-100 bg-white px-4 py-3 focus-ring shadow-card"
        />
        <button
          type="submit"
          disabled={!manualLabel.trim()}
          className="rounded-pill bg-emerald-700 text-cream-50 px-5 py-3 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {/* Bulk actions */}
      {(activeCount > 0 || doneCount > 0) && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {doneCount > 0 && (
            <button
              onClick={() => clear.mutate(true)}
              className="text-ink-500 hover:text-emerald-700 focus-ring"
            >
              Clear {doneCount} completed
            </button>
          )}
          {(activeCount + doneCount) > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear the entire shopping list? This cannot be undone.')) clear.mutate(false);
              }}
              className="ml-auto text-ink-500 hover:text-rose-400 focus-ring"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Groups */}
      <div className="mt-8 space-y-8">
        {grouped.map((group) => (
          <div key={group.category}>
            <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">
              {CATEGORY_LABEL[group.category] ?? group.category}
            </h2>
            <ul className="card divide-y divide-ink-100 overflow-hidden">
              {group.items.map((it) => (
                <li
                  key={it.key}
                  className={`flex items-center gap-3 px-4 py-3 transition ${
                    it.checked ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleGroup(it, !it.checked)}
                    aria-label={it.checked ? 'Uncheck' : 'Check'}
                    className={`shrink-0 grid place-items-center w-6 h-6 rounded-full border-2 focus-ring ${
                      it.checked ? 'bg-emerald-700 border-emerald-700 text-cream-50' : 'border-ink-200'
                    }`}
                  >
                    {it.checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12l4 4L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${it.checked ? 'line-through text-ink-400' : 'text-ink-900'}`}>
                      {it.label}
                    </div>
                    {(it.quantity !== undefined || it.unit) && (
                      <div className="text-sm text-ink-500 tabular-nums">
                        {[it.quantity, it.unit].filter(Boolean).join(' ')}
                      </div>
                    )}
                    {it.sourceRecipeIds.length > 0 && (
                      <div className="text-xs text-ink-400 mt-1">
                        from {it.sourceRecipeIds.length} recipe
                        {it.sourceRecipeIds.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeGroup(it)}
                    className="p-2 text-ink-300 hover:text-rose-400 focus-ring"
                    aria-label="Remove"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 7h14M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6M7 7l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {grouped.length === 0 && (
        <div className="mt-10 card p-8 text-center">
          <h2 className="font-display text-2xl">Nothing on your list</h2>
          <p className="text-ink-500 mt-2">
            Add manually above, or open a recipe and tap <em>Add missing to shopping list</em>.
          </p>
        </div>
      )}
    </div>
  );
}

// Preserve reference to keep TS import narrowing tight.
export type { Unit };
