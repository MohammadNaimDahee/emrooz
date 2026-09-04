'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { MessageKey } from '@emrooz/i18n';

import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';
import { useTranslator } from '../../lib/i18n-client';

type TFn = (key: MessageKey, params?: Record<string, string | number>) => string;

function translateCategory(t: TFn, category: string): string {
  const key = `pantry.category.${category}` as MessageKey;
  const value = t(key);
  // If the key doesn't exist, `t` returns the key itself; fall back to the raw label.
  return value === key ? category.replace('_', ' ') : value;
}

export default function PantryClient() {
  const { t } = useTranslator();
  const data = getData();
  const userId = useGuestId();
  const client = useQueryClient();
  const [q, setQ] = useState('');

  const suggestions = useQuery({
    queryKey: ['ingredient-search', q],
    queryFn: () => data.ingredients.search(q, 200),
  });
  const current = useQuery({
    queryKey: ['pantry', userId],
    enabled: Boolean(userId),
    queryFn: () => data.pantry.list(userId),
  });

  const pantryIds = useMemo(
    () => new Set((current.data ?? []).map((p) => p.ingredientId)),
    [current.data],
  );

  async function toggle(id: string) {
    if (!userId) return;
    if (pantryIds.has(id)) {
      await data.pantry.remove(userId, id);
    } else {
      await data.pantry.add({
        id: `pn_${Math.random().toString(36).slice(2)}`,
        userId,
        ingredientId: id,
        addedAt: new Date().toISOString(),
      });
    }
    await client.invalidateQueries({ queryKey: ['pantry'] });
    await client.invalidateQueries({ queryKey: ['today'] });
  }

  const suggestionsData = suggestions.data;
  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof suggestionsData>>();
    for (const ing of suggestionsData ?? []) {
      const list = map.get(ing.category) ?? [];
      list.push(ing);
      map.set(ing.category, list);
    }
    return [...map.entries()];
  }, [suggestionsData]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">{t('pantry.eyebrow')}</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">{t('pantry.title')}</h1>
      <p className="text-ink-500 mt-2 max-w-xl">{t('pantry.subtitle.long')}</p>

      <div className="mt-6 relative">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('pantry.searchPlaceholder.long')}
          className="w-full rounded-pill border border-ink-100 bg-white pl-11 pr-5 py-3 text-base placeholder:text-ink-400 focus-ring shadow-card"
        />
      </div>

      {pantryIds.size > 0 && (
        <div className="mt-4 text-sm text-ink-500">
          {pantryIds.size === 1
            ? t('pantry.count.one', { count: pantryIds.size })
            : t('pantry.count.many', { count: pantryIds.size })}
        </div>
      )}

      <div className="mt-8 space-y-6">
        {grouped.map(([category, items]) => (
          <div key={category}>
            <h2 className="text-xs uppercase tracking-widest text-ink-400 mb-3">
              {translateCategory(t, category)}
            </h2>
            <div className="flex flex-wrap gap-2">
              {(items ?? []).map((i) => {
                const active = pantryIds.has(i.id);
                return (
                  <button
                    key={i.id}
                    onClick={() => toggle(i.id)}
                    aria-pressed={active}
                    className={`rounded-pill border px-3.5 py-2 text-sm transition focus-ring ${
                      active
                        ? 'bg-emerald-700 text-cream-50 border-emerald-700 shadow-card'
                        : 'bg-white text-ink-700 border-ink-100 hover:border-emerald-700 hover:text-emerald-700'
                    }`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {i.name.en}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
