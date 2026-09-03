import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '../../../lib/data';
import { CuisineArt } from '../../../components/CuisineArt';
import { RecipeCard } from '../../../components/RecipeCard';

interface Params { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getData().cuisines.bySlug(slug);
  if (!c) return { title: 'Cuisine not found' };
  return {
    title: `${c.name.en} recipes`,
    description: `Emrooz recipes from ${c.name.en} cuisine.`,
  };
}

export default async function CuisinePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const data = getData();
  const cuisine = await data.cuisines.bySlug(slug);
  if (!cuisine) notFound();
  const [recipes, cuisines] = await Promise.all([
    data.recipes.listSummaries({ cuisineId: cuisine.id, limit: 60 }),
    data.cuisines.all(),
  ]);
  const cuisineLabels = Object.fromEntries(cuisines.map((c) => [c.id, c.name.en] as const));

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative">
        <CuisineArt seed={cuisine.id} size="hero" className="w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/50 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-6xl w-full px-4 pb-10 md:pb-14">
            <div className="text-xs uppercase tracking-widest text-white/90 drop-shadow">
              Cuisine
            </div>
            <h1 className="font-display text-5xl md:text-6xl text-white drop-shadow mt-1 leading-tight">
              {cuisine.name.en}
            </h1>
            <p className="mt-2 text-white/90 max-w-xl drop-shadow">
              {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} in the collection.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 mt-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} cuisineLabels={cuisineLabels} />
          ))}
        </div>
        {recipes.length === 0 && (
          <div className="card p-8 text-center">
            <h2 className="font-display text-2xl">Coming soon</h2>
            <p className="text-ink-500 mt-2">
              We're still curating this collection.{' '}
              <Link href="/cuisines" className="text-emerald-700 underline focus-ring">
                Browse other cuisines
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
