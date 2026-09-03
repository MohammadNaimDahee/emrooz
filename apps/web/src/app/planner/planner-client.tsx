'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { addDays, missingIngredientsFor, startOfWeek, toIsoDate } from '@emrooz/core';
import type { MealPlanEntry, Recipe, RecipeSummary } from '@emrooz/types';

import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';
import { CuisineArt } from '../../components/CuisineArt';

const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
type Meal = (typeof MEALS)[number];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlannerClient() {
  const data = getData();
  const userId = useGuestId();
  const client = useQueryClient();

  const [weekStart, setWeekStart] = useState<string>(() => startOfWeek(toIsoDate()));
  const [picker, setPicker] = useState<{ date: string; meal: Meal } | null>(null);
  const [addedToList, setAddedToList] = useState<number | null>(null);

  const weekEnd = addDays(weekStart, 6);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const entriesQ = useQuery({
    queryKey: ['planner', userId, weekStart, weekEnd],
    enabled: Boolean(userId),
    queryFn: () => data.planner.listForRange(userId, weekStart, weekEnd),
  });
  const recipesQ = useQuery({
    queryKey: ['recipes-all'],
    queryFn: () => data.recipes.listPublished({ limit: 500 }),
  });
  const summariesQ = useQuery({
    queryKey: ['recipes-summaries-all'],
    queryFn: () => data.recipes.listSummaries({ limit: 500 }),
  });
  const pantryQ = useQuery({
    queryKey: ['pantry', userId],
    enabled: Boolean(userId),
    queryFn: () => data.pantry.list(userId),
  });

  const recipesById = useMemo(
    () => new Map((recipesQ.data ?? []).map((r) => [r.id, r] as const)),
    [recipesQ.data],
  );

  const entriesBySlot = useMemo(() => {
    const map = new Map<string, MealPlanEntry>();
    for (const e of entriesQ.data ?? []) {
      map.set(`${e.date}::${e.meal}`, e);
    }
    return map;
  }, [entriesQ.data]);

  const assign = useMutation({
    mutationFn: async (v: { date: string; meal: Meal; recipeId: string }) => {
      const existing = entriesBySlot.get(`${v.date}::${v.meal}`);
      if (existing) await data.planner.remove(userId, existing.id);
      await data.planner.upsert({
        id: `mp_${Math.random().toString(36).slice(2)}`,
        userId,
        date: v.date,
        meal: v.meal,
        recipeId: v.recipeId,
        servings: 2,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['planner'] }),
  });

  const clearSlot = useMutation({
    mutationFn: async (entryId: string) => {
      await data.planner.remove(userId, entryId);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['planner'] }),
  });

  const addWeekToShoppingList = useMutation({
    mutationFn: async () => {
      const weekRecipes = (entriesQ.data ?? [])
        .map((e) => recipesById.get(e.recipeId))
        .filter((r): r is Recipe => Boolean(r));
      const pantrySet = new Set((pantryQ.data ?? []).map((p) => p.ingredientId));
      const missing = missingIngredientsFor(weekRecipes, pantrySet);
      const existing = await data.shoppingList.list(userId);
      const existingByIngredient = new Map(
        existing.filter((i) => i.ingredientId).map((i) => [i.ingredientId!, i]),
      );
      const now = new Date().toISOString();
      for (const ingredientId of missing) {
        const already = existingByIngredient.get(ingredientId);
        if (already) continue; // already on the list — don't double up
        await data.shoppingList.upsert({
          id: `sl_${Math.random().toString(36).slice(2)}`,
          userId,
          ingredientId,
          sourceRecipeIds: [],
          checked: false,
          addedAt: now,
          updatedAt: now,
        });
      }
      return missing.length;
    },
    onSuccess: (added) => {
      client.invalidateQueries({ queryKey: ['shopping-list'] });
      setAddedToList(added);
      setTimeout(() => setAddedToList(null), 3000);
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-400">Plan the week</div>
          <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">Planner</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 hover:border-emerald-700 focus-ring"
            aria-label="Previous week"
          >
            ← Prev
          </button>
          <div className="text-sm text-ink-500 tabular-nums">
            {weekStart} → {weekEnd}
          </div>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 hover:border-emerald-700 focus-ring"
            aria-label="Next week"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => addWeekToShoppingList.mutate()}
          disabled={!entriesQ.data?.length}
          className="inline-flex items-center gap-2 rounded-pill bg-emerald-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card disabled:opacity-40"
        >
          Add week's missing to shopping list
        </button>
        <Link
          href="/shopping-list"
          className="text-sm text-emerald-700 hover:underline focus-ring"
        >
          View shopping list →
        </Link>
        {addedToList !== null && (
          <div role="status" className="text-sm text-emerald-700">
            Added {addedToList} {addedToList === 1 ? 'item' : 'items'} to your list.
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="mt-8 overflow-x-auto">
        <div className="min-w-[820px] grid grid-cols-8 gap-3">
          <div />
          {days.map((d, i) => (
            <div key={d} className="text-center">
              <div className="text-xs text-ink-400 uppercase tracking-widest">{DAY_LABELS[i]}</div>
              <div className="text-sm font-medium text-ink-700 tabular-nums mt-0.5">{d.slice(5)}</div>
            </div>
          ))}
          {MEALS.map((meal) => (
            <MealRow
              key={meal}
              meal={meal}
              days={days}
              entriesBySlot={entriesBySlot}
              recipes={summariesQ.data ?? []}
              recipesById={recipesById}
              onOpenPicker={(date) => setPicker({ date, meal })}
              onClear={(entryId) => clearSlot.mutate(entryId)}
            />
          ))}
        </div>
      </div>

      {/* Picker modal */}
      {picker && (
        <RecipePicker
          date={picker.date}
          meal={picker.meal}
          recipes={summariesQ.data ?? []}
          onCancel={() => setPicker(null)}
          onPick={(recipeId) => {
            assign.mutate({ date: picker.date, meal: picker.meal, recipeId });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function MealRow({
  meal,
  days,
  entriesBySlot,
  recipesById,
  recipes: _recipes,
  onOpenPicker,
  onClear,
}: {
  meal: Meal;
  days: string[];
  entriesBySlot: Map<string, MealPlanEntry>;
  recipesById: Map<string, Recipe>;
  recipes: RecipeSummary[];
  onOpenPicker: (date: string) => void;
  onClear: (entryId: string) => void;
}) {
  return (
    <>
      <div className="self-center text-sm font-medium text-ink-700 capitalize">{meal}</div>
      {days.map((d) => {
        const entry = entriesBySlot.get(`${d}::${meal}`);
        const recipe = entry ? recipesById.get(entry.recipeId) : undefined;
        if (!entry || !recipe) {
          return (
            <button
              key={d}
              onClick={() => onOpenPicker(d)}
              className="h-24 rounded-2xl border border-dashed border-ink-100 bg-white grid place-items-center text-ink-300 hover:border-emerald-700 hover:text-emerald-700 focus-ring transition"
              aria-label={`Add ${meal} on ${d}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          );
        }
        return (
          <div key={d} className="relative h-24 rounded-2xl overflow-hidden card group">
            <CuisineArt seed={recipe.cuisineIds[0] ?? recipe.slug} size="sm" className="h-full rounded-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 p-2 flex flex-col justify-end">
              <div className="text-[10px] uppercase tracking-widest text-white/70">{meal}</div>
              <div className="text-white text-xs leading-tight font-medium line-clamp-2">
                {recipe.title.en}
              </div>
            </div>
            <div className="absolute inset-x-0 top-0 flex gap-1 p-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => onOpenPicker(d)}
                className="ml-auto grid place-items-center w-6 h-6 rounded-full bg-white/90 text-ink-700 hover:text-emerald-700 focus-ring"
                aria-label="Replace"
                title="Replace"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 8h11a5 5 0 010 10h-2M8 4L4 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => onClear(entry.id)}
                className="grid place-items-center w-6 h-6 rounded-full bg-white/90 text-ink-700 hover:text-rose-400 focus-ring"
                aria-label="Remove"
                title="Remove"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function RecipePicker({
  date,
  meal,
  recipes,
  onCancel,
  onPick,
}: {
  date: string;
  meal: Meal;
  recipes: RecipeSummary[];
  onCancel: () => void;
  onPick: (recipeId: string) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (needle && !r.title.en.toLowerCase().includes(needle)) return false;
      if (r.mealTypes.includes(meal)) return true;
      // Fallback: if none match, allow any dinner-y recipe.
      return true;
    });
  }, [recipes, q, meal]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="card w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 pt-5 pb-3 border-b border-ink-100">
          <div className="flex justify-between items-baseline">
            <h2 className="font-display text-2xl text-ink-900 capitalize">Pick a recipe · {meal}</h2>
            <div className="text-sm text-ink-500 tabular-nums">{date}</div>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="mt-3 w-full rounded-pill border border-ink-100 bg-white px-4 py-2 focus-ring"
            autoFocus
          />
        </div>
        <div className="overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-ink-500 text-center py-8">Nothing matches.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filtered.slice(0, 60).map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => onPick(r.id)}
                    className="w-full flex items-center gap-3 text-left rounded-xl p-2 hover:bg-emerald-50 focus-ring transition"
                  >
                    <CuisineArt
                      seed={r.cuisineIds[0] ?? r.slug}
                      size="sm"
                      className="w-16 rounded-lg h-16"
                    />
                    <div>
                      <div className="font-medium text-ink-900 line-clamp-1">{r.title.en}</div>
                      <div className="text-xs text-ink-500">{r.totalMinutes} min · {r.difficulty}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-3 border-t border-ink-100 flex justify-end">
          <button onClick={onCancel} className="text-sm text-ink-500 px-3 py-2 hover:text-emerald-700 focus-ring rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
