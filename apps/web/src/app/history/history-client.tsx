'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toIsoDate } from '@emrooz/core';
import type { Recipe } from '@emrooz/types';

import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';
import { CuisineArt } from '../../components/CuisineArt';

const MEALS = ['breakfast', 'lunch', 'dinner'] as const;

export default function HistoryClient() {
  const data = getData();
  const userId = useGuestId();
  const client = useQueryClient();

  const q = useQuery({
    queryKey: ['history', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const entries = await data.history.list(userId);
      const withRecipe = await Promise.all(
        entries
          .sort((a, b) => (a.cookedOn < b.cookedOn ? 1 : -1))
          .map(async (e) => ({ entry: e, recipe: await data.recipes.findById(e.recipeId) })),
      );
      return withRecipe.filter((x): x is { entry: (typeof withRecipe)[number]['entry']; recipe: Recipe } => Boolean(x.recipe));
    },
  });

  const cookAgain = useMutation({
    mutationFn: async (recipeId: string) => {
      await data.history.add({
        id: `hi_${Math.random().toString(36).slice(2)}`,
        userId,
        recipeId,
        cookedOn: toIsoDate(),
        servings: 2,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['history'] }),
  });

  const removeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      await data.history.remove(userId, entryId);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['history'] }),
  });

  const addToPlanner = useMutation({
    mutationFn: async (v: { recipeId: string; date: string; meal: (typeof MEALS)[number] }) => {
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

  const [plannerOpen, setPlannerOpen] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">You've cooked</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">History</h1>

      {q.data?.length === 0 && (
        <div className="mt-10 card p-8 text-center">
          <h2 className="font-display text-2xl">Nothing cooked yet</h2>
          <p className="text-ink-500 mt-2">Once you tap "I cooked this" on a recipe, it lands here.</p>
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {q.data?.map(({ entry, recipe }) => (
          <li key={entry.id} className="card overflow-hidden">
            <div className="flex items-stretch gap-4">
              <CuisineArt
                seed={recipe.cuisineIds[0] ?? recipe.slug}
                size="sm"
                className="w-28 rounded-none shrink-0"
              />
              <div className="flex-1 py-3 pr-4">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/recipes/${recipe.slug}`} className="font-display text-lg text-emerald-700 focus-ring">
                    {recipe.title.en}
                  </Link>
                  <div className="text-xs text-ink-400 whitespace-nowrap">{entry.cookedOn}</div>
                </div>
                <div className="text-sm text-ink-500 mt-1">
                  {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
                </div>
                {entry.note && (
                  <p className="mt-2 text-sm text-ink-700 italic bg-cream-200/50 rounded-lg px-3 py-2">
                    "{entry.note}"
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <button
                    onClick={() => cookAgain.mutate(recipe.id)}
                    className="inline-flex items-center gap-1 rounded-pill border border-ink-200 px-3 py-1.5 hover:border-emerald-700 hover:text-emerald-700 focus-ring transition"
                  >
                    <ChefIcon /> Cook again
                  </button>
                  <button
                    onClick={() => setPlannerOpen(plannerOpen === entry.id ? null : entry.id)}
                    className="inline-flex items-center gap-1 rounded-pill border border-ink-200 px-3 py-1.5 hover:border-emerald-700 hover:text-emerald-700 focus-ring transition"
                    aria-expanded={plannerOpen === entry.id}
                  >
                    <CalendarIcon /> Add to planner
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Remove this history entry?')) removeEntry.mutate(entry.id);
                    }}
                    className="ml-auto text-xs text-ink-400 hover:text-rose-400 focus-ring"
                  >
                    Remove
                  </button>
                </div>
                {plannerOpen === entry.id && (
                  <PlannerPicker
                    onCancel={() => setPlannerOpen(null)}
                    onSubmit={(date, meal) => {
                      addToPlanner.mutate({ recipeId: recipe.id, date, meal });
                      setPlannerOpen(null);
                    }}
                  />
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlannerPicker({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (date: string, meal: (typeof MEALS)[number]) => void;
}) {
  const [date, setDate] = useState(toIsoDate());
  const [meal, setMeal] = useState<(typeof MEALS)[number]>('dinner');
  return (
    <div className="mt-3 rounded-xl border border-ink-100 bg-white p-3 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="pd" className="block text-xs text-ink-400 uppercase tracking-widest">Date</label>
        <input
          id="pd"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-1.5 focus-ring"
        />
      </div>
      <div>
        <label htmlFor="pm" className="block text-xs text-ink-400 uppercase tracking-widest">Meal</label>
        <select
          id="pm"
          value={meal}
          onChange={(e) => setMeal(e.target.value as (typeof MEALS)[number])}
          className="rounded-lg border border-ink-100 px-3 py-1.5 focus-ring capitalize"
        >
          {MEALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="ml-auto flex gap-2">
        <button
          onClick={onCancel}
          className="text-sm text-ink-500 px-3 py-1.5 hover:text-emerald-700 focus-ring rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(date, meal)}
          className="rounded-pill bg-emerald-700 text-cream-50 px-4 py-1.5 text-sm font-medium hover:bg-emerald-600 focus-ring"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ChefIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 14v6h10v-6M7 14a4 4 0 010-8c0-1.5 1.5-3 3.5-3 1.5 0 2 1 2 1s.5-1 2-1c2 0 3.5 1.5 3.5 3a4 4 0 010 8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
