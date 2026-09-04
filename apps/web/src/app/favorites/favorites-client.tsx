'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';
import { useTranslator } from '../../lib/i18n-client';
import { RecipeCard } from '../../components/RecipeCard';

export default function FavoritesClient() {
  const { t } = useTranslator();
  const data = getData();
  const userId = useGuestId();

  const q = useQuery({
    queryKey: ['favorites', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const favs = await data.favorites.list(userId);
      const recipes = await Promise.all(favs.map((f) => data.recipes.findById(f.recipeId)));
      const cuisines = await data.cuisines.all();
      return {
        recipes: recipes.filter((r): r is NonNullable<typeof r> => Boolean(r)),
        cuisineLabels: Object.fromEntries(cuisines.map((c) => [c.id, c.name.en] as const)),
      };
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">{t('favorites.eyebrow')}</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">{t('favorites.title')}</h1>

      {q.data?.recipes.length === 0 && (
        <div className="mt-10 card p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-400/10 text-rose-400 grid place-items-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 20s-7-4.35-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.65-9 9-9 9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mt-4 font-display text-2xl text-ink-900">{t('favorites.empty.title')}</h2>
          <p className="text-ink-500 mt-2">{t('favorites.emptyBody.long')}</p>
          <Link href="/discover" className="mt-4 inline-flex items-center gap-2 rounded-pill bg-emerald-700 text-cream-50 px-5 py-3 text-sm font-medium hover:bg-emerald-600 focus-ring">
            {t('favorites.discoverCta')}
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.recipes.map((r) => (
          <RecipeCard key={r.id} recipe={r} cuisineLabels={q.data.cuisineLabels} />
        ))}
      </div>
    </div>
  );
}
