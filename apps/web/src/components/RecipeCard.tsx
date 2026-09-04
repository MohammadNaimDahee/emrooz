import Link from 'next/link';
import type { RecipeSummary } from '@emrooz/types';
import { CuisineArt } from './CuisineArt';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Advanced',
};

export function RecipeCard({
  recipe,
  cuisineLabels,
  layout = 'grid',
}: {
  recipe: RecipeSummary;
  cuisineLabels?: Record<string, string>;
  layout?: 'grid' | 'row';
}) {
  const cuisine = recipe.cuisineIds[0];
  const cuisineLabel = cuisine ? cuisineLabels?.[cuisine] : undefined;

  if (layout === 'row') {
    return (
      <Link
        href={`/recipes/${recipe.slug}`}
        className="group flex items-stretch gap-4 rounded-card card overflow-hidden lift focus-ring"
      >
        <CuisineArt seed={cuisine ?? recipe.slug} className="w-32 rounded-none" size="sm" />
        <div className="flex-1 py-3 pr-4">
          <div className="text-xs uppercase tracking-widest text-ink-400">
            {cuisineLabel ?? recipe.mealTypes[0] ?? 'Recipe'}
          </div>
          <div className="font-display text-lg text-ink-900 mt-1 group-hover:text-emerald-700 transition">
            {recipe.title.en}
          </div>
          <div className="text-sm text-ink-500 mt-1">
            {recipe.totalMinutes} min · {DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group block card overflow-hidden lift focus-ring"
    >
      <CuisineArt seed={cuisine ?? recipe.slug} label={cuisineLabel} />
      <div className="p-5">
        <div className="text-xs uppercase tracking-widest text-ink-400">
          {recipe.mealTypes[0] ?? 'Recipe'}
        </div>
        <h3 className="font-display text-xl text-ink-900 mt-1 group-hover:text-emerald-700 transition leading-snug">
          {recipe.title.en}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-sm text-ink-500">
          <span className="inline-flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {recipe.totalMinutes} min
          </span>
          <span className="text-ink-200">·</span>
          <span>{DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}</span>
          {recipe.dietaryTags.slice(0, 1).map((t) => (
            <span
              key={t}
              className="ml-auto rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium"
            >
              {t.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
