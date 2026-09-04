'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { combineShoppingList, groupShoppingByCategory } from '@emrooz/core';
import type { MessageKey } from '@emrooz/i18n';
import type { ShoppingListItem, Unit } from '@emrooz/types';

import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';
import { useTranslator } from '../../lib/i18n-client';

type TFn = (key: MessageKey, params?: Record<string, string | number>) => string;

function translateShoppingCategory(t: TFn, category: string): string {
  const key = `shoppingList.category.${category}` as MessageKey;
  const value = t(key);
  return value === key ? category : value;
}

export default function ShoppingListClient() {
  const { t } = useTranslator();
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
      <div className="text-xs uppercase tracking-widest text-ink-400">{t('shoppingList.headerEyebrow')}</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">{t('shoppingList.title')}</h1>
      <p className="text-ink-500 mt-2 max-w-xl">
        {activeCount === 0
          ? t('shoppingList.subtitle.empty')
          : t('shoppingList.subtitle.active', { active: activeCount, done: doneCount })}
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
          placeholder={t('shoppingList.add.placeholder.long')}
          className="flex-1 rounded-pill border border-ink-100 bg-white px-4 py-3 focus-ring shadow-card"
        />
        <button
          type="submit"
          disabled={!manualLabel.trim()}
          className="rounded-pill bg-emerald-700 text-cream-50 px-5 py-3 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card disabled:opacity-50"
        >
          {t('shoppingList.add.button')}
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
              {t('shoppingList.clearCountCompleted', { count: doneCount })}
            </button>
          )}
          {(activeCount + doneCount) > 0 && (
            <button
              onClick={() => {
                if (confirm(t('shoppingList.clearAllPrompt'))) clear.mutate(false);
              }}
              className="ml-auto text-ink-500 hover:text-rose-400 focus-ring"
            >
              {t('shoppingList.clearAllShort')}
            </button>
          )}
        </div>
      )}

      {/* Groups */}
      <div className="mt-8 space-y-8">
        {grouped.map((group) => (
          <div key={group.category}>
            <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">
              {translateShoppingCategory(t, group.category)}
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
                    aria-label={it.checked ? t('shoppingList.item.uncheck') : t('shoppingList.item.check')}
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
                        {it.sourceRecipeIds.length === 1
                          ? t('shoppingList.itemFromRecipes.one')
                          : t('shoppingList.itemFromRecipes.many', { count: it.sourceRecipeIds.length })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeGroup(it)}
                    className="p-2 text-ink-300 hover:text-rose-400 focus-ring"
                    aria-label={t('shoppingList.item.removeAria')}
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
          <h2 className="font-display text-2xl">{t('shoppingList.empty.title')}</h2>
          <p className="text-ink-500 mt-2">
            {t('shoppingList.empty.bodyPrefix')}
            <em>{t('shoppingList.empty.bodyCta')}</em>
            {t('shoppingList.empty.bodySuffix')}
          </p>
        </div>
      )}
    </div>
  );
}

// Preserve reference to keep TS import narrowing tight.
export type { Unit };
