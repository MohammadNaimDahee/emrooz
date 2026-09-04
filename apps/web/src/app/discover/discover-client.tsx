'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { pantryMatch } from '@emrooz/core';
import type { MessageKey } from '@emrooz/i18n';
import type { DietaryTag, Difficulty, MealType, RecipeSummary } from '@emrooz/types';

import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';
import { useTranslator } from '../../lib/i18n-client';
import { RecipeCard } from '../../components/RecipeCard';

type SortMode = 'relevance' | 'time' | 'pantry';
type TFn = (key: MessageKey, params?: Record<string, string | number>) => string;

const TIME_BUCKETS: { key: string; max: number }[] = [
  { key: 't20', max: 20 },
  { key: 't30', max: 30 },
  { key: 't45', max: 45 },
  { key: 't60', max: 60 },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'soup', 'salad', 'side', 'dessert'];
const DIETS: DietaryTag[] = ['vegetarian', 'vegan', 'halal', 'gluten_free', 'dairy_free'];

export default function DiscoverClient() {
  const { t } = useTranslator();
  const data = getData();
  const userId = useGuestId();

  const [q, setQ] = useState('');
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [meal, setMeal] = useState<MealType | null>(null);
  const [diets, setDiets] = useState<DietaryTag[]>([]);
  const [pantryOnly, setPantryOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>('relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cuisinesQ = useQuery({
    queryKey: ['cuisines'],
    queryFn: () => data.cuisines.all(),
  });
  const recipesQ = useQuery({
    queryKey: ['recipes-all'],
    queryFn: () => data.recipes.listPublished({ limit: 500 }),
  });
  const pantryQ = useQuery({
    queryKey: ['pantry', userId],
    enabled: Boolean(userId),
    queryFn: () => data.pantry.list(userId),
  });

  const cuisineLabels = useMemo(
    () => Object.fromEntries((cuisinesQ.data ?? []).map((c) => [c.id, c.name.en] as const)),
    [cuisinesQ.data],
  );

  const pantrySet = useMemo(
    () => new Set((pantryQ.data ?? []).map((p) => p.ingredientId)),
    [pantryQ.data],
  );

  const filtered = useMemo(() => {
    const recipes = recipesQ.data ?? [];
    const needle = q.trim().toLowerCase();
    const withMeta = recipes
      .filter((r) => {
        if (maxMinutes !== null && r.totalMinutes > maxMinutes) return false;
        if (difficulty && r.difficulty !== difficulty) return false;
        if (meal && !r.mealTypes.includes(meal)) return false;
        for (const d of diets) if (!r.dietaryTags.includes(d)) return false;
        if (needle) {
          const hay = [r.title.en, r.description?.en ?? '', ...r.cuisineIds]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .map((r) => {
        const match = pantryMatch(r, pantrySet);
        return { recipe: r, matchRatio: match.ratio };
      })
      .filter((x) => (pantryOnly ? x.matchRatio >= 0.6 : true));

    withMeta.sort((a, b) => {
      if (sort === 'time') return a.recipe.totalMinutes - b.recipe.totalMinutes;
      if (sort === 'pantry') return b.matchRatio - a.matchRatio;
      // Relevance: pantry match then title (stable-ish default without a search score).
      if (needle) {
        const at = a.recipe.title.en.toLowerCase().indexOf(needle);
        const bt = b.recipe.title.en.toLowerCase().indexOf(needle);
        if (at !== bt) return at === -1 ? 1 : bt === -1 ? -1 : at - bt;
      }
      if (a.matchRatio !== b.matchRatio) return b.matchRatio - a.matchRatio;
      return a.recipe.title.en.localeCompare(b.recipe.title.en);
    });
    return withMeta.map((x) => x.recipe);
  }, [recipesQ.data, q, maxMinutes, difficulty, meal, diets, sort, pantryOnly, pantrySet]);

  const activeFilterCount =
    (maxMinutes !== null ? 1 : 0) +
    (difficulty ? 1 : 0) +
    (meal ? 1 : 0) +
    diets.length +
    (pantryOnly ? 1 : 0);

  function toggleDiet(d: DietaryTag) {
    setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }
  function clearAll() {
    setMaxMinutes(null);
    setDifficulty(null);
    setMeal(null);
    setDiets([]);
    setPantryOnly(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">{t('discover.eyebrow')}</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 leading-tight mt-1">{t('discover.title')}</h1>
      <p className="text-ink-500 mt-2 max-w-xl">
        {t('discover.subtitle')}
      </p>

      {/* Search */}
      <div className="mt-6 relative max-w-xl">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('discover.search.placeholder')}
          className="w-full rounded-pill border border-ink-100 bg-white pl-11 pr-5 py-3 text-base placeholder:text-ink-400 focus-ring shadow-card"
        />
      </div>

      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-pill border border-ink-200 bg-white px-4 py-2 text-sm hover:border-emerald-700 focus-ring"
          aria-expanded={filtersOpen}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {t('discover.filters')}
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-emerald-700 text-cream-50 text-xs px-2 py-0.5">
              {activeFilterCount}
            </span>
          )}
        </button>

        <label htmlFor="sort" className="text-sm text-ink-500 ml-2">{t('discover.sortBy')}</label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded-pill border border-ink-100 bg-white px-3 py-2 text-sm focus-ring"
        >
          <option value="relevance">{t('discover.sort.relevance')}</option>
          <option value="time">{t('discover.sort.quickest')}</option>
          <option value="pantry">{t('discover.sort.pantryMatch')}</option>
        </select>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="ml-auto text-sm text-ink-500 hover:text-emerald-700 focus-ring"
          >
            {t('discover.clearFilters')}
          </button>
        )}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="mt-4 card p-5 grid gap-4 md:grid-cols-2 animate-fade-up">
          <FilterGroup label={t('discover.filter.cookingTime')}>
            {TIME_BUCKETS.map((bucket) => (
              <Chip
                key={bucket.key}
                active={maxMinutes === bucket.max}
                onClick={() => setMaxMinutes((cur) => (cur === bucket.max ? null : bucket.max))}
              >
                {t('discover.filter.timeBucket', { minutes: bucket.max })}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label={t('discover.filter.difficulty')}>
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                active={difficulty === d}
                onClick={() => setDifficulty((cur) => (cur === d ? null : d))}
              >
                {translateDifficulty(t, d)}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label={t('discover.filter.mealType')}>
            {MEALS.map((m) => (
              <Chip key={m} active={meal === m} onClick={() => setMeal((cur) => (cur === m ? null : m))}>
                {translateMealType(t, m)}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label={t('discover.filter.dietary')}>
            {DIETS.map((d) => (
              <Chip key={d} active={diets.includes(d)} onClick={() => toggleDiet(d)}>
                {translateDietaryTag(t, d)}
              </Chip>
            ))}
          </FilterGroup>
          <div className="md:col-span-2 flex items-center gap-2 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pantryOnly}
                onChange={(e) => setPantryOnly(e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
              {t('discover.pantryOnly.checkbox')}
            </label>
          </div>
        </div>
      )}

      {/* Cuisine strip */}
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {(cuisinesQ.data ?? []).slice(0, 14).map((c) => (
          <Link
            key={c.id}
            href={`/cuisines/${c.slug}`}
            className="rounded-pill border border-ink-100 bg-white px-3 py-1.5 hover:border-emerald-700 hover:text-emerald-700 transition focus-ring"
          >
            {c.name.en}
          </Link>
        ))}
      </div>

      {/* Result count */}
      <div className="mt-6 text-sm text-ink-500">
        {filtered.length === 1
          ? t('discover.results.one', { count: filtered.length })
          : t('discover.results.many', { count: filtered.length })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-6 card p-8 text-center">
          <h2 className="font-display text-2xl">{t('discover.empty.title')}</h2>
          <p className="text-ink-500 mt-2">{t('discover.empty.tryLoose')}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r: RecipeSummary) => (
            <RecipeCard key={r.id} recipe={r} cuisineLabels={cuisineLabels} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3 py-1.5 text-sm focus-ring transition ${
        active
          ? 'bg-emerald-700 text-cream-50 border-emerald-700'
          : 'bg-white text-ink-700 border-ink-100 hover:border-emerald-700 hover:text-emerald-700'
      }`}
    >
      {children}
    </button>
  );
}

function translateDifficulty(t: TFn, d: Difficulty): string {
  return t(`recipe.difficulty.${d}` as MessageKey);
}

function translateMealType(t: TFn, m: MealType): string {
  const key = `discover.mealType.${m}` as MessageKey;
  const value = t(key);
  return value === key ? m : value;
}

function translateDietaryTag(t: TFn, d: DietaryTag): string {
  const key = `diet.${d}` as MessageKey;
  const value = t(key);
  return value === key ? d.replace('_', ' ') : value;
}
