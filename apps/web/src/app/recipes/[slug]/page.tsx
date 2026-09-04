import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '../../../lib/data';
import { getTranslator } from '../../../lib/i18n-server';
import { RecipeActions } from './actions-client';
import { CuisineArt } from '../../../components/CuisineArt';
import { scaleIngredients } from '@emrooz/core';

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getTranslator();
  const recipe = await getData().recipes.findBySlug(slug);
  if (!recipe) return { title: t('meta.recipe.notFound') };
  return {
    title: recipe.title.en,
    description: recipe.description?.en ?? t('meta.recipe.descFallback', { title: recipe.title.en }),
    openGraph: {
      title: recipe.title.en,
      description: recipe.description?.en,
      type: 'article',
    },
  };
}

export default async function RecipePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const { t } = await getTranslator();
  const data = getData();
  const recipe = await data.recipes.findBySlug(slug);
  if (!recipe) notFound();

  const [ingredientsList, cuisines] = await Promise.all([
    data.ingredients.all(),
    data.cuisines.all(),
  ]);
  const ingredientMap = new Map(ingredientsList.map((i) => [i.id, i]));
  const cuisineMap = new Map(cuisines.map((c) => [c.id, c]));
  const scaled = scaleIngredients(recipe, recipe.servings);
  const cuisineNames = recipe.cuisineIds
    .map((id) => cuisineMap.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title.en,
    description: recipe.description?.en,
    recipeCategory: recipe.mealTypes,
    recipeCuisine: cuisineNames.map((c) => c.name.en),
    recipeYield: `${recipe.servings} servings`,
    prepTime: `PT${recipe.prepMinutes}M`,
    cookTime: `PT${recipe.cookMinutes}M`,
    totalTime: `PT${recipe.totalMinutes}M`,
    keywords: recipe.dietaryTags.join(', '),
    recipeIngredient: scaled.map((ri) => {
      const ing = ingredientMap.get(ri.ingredientId);
      return [ri.quantity, ri.unit, ing?.name.en ?? ri.ingredientId].filter(Boolean).join(' ');
    }),
    recipeInstructions: recipe.steps.map((s) => ({ '@type': 'HowToStep', text: s.text.en })),
  };

  return (
    <article className="pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative">
        <CuisineArt
          seed={recipe.cuisineIds[0] ?? recipe.slug}
          size="hero"
          className="w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/40 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-3xl w-full px-4 pb-8 md:pb-12">
            <div className="flex flex-wrap gap-2 text-xs">
              {cuisineNames.slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  href={`/cuisines/${c.slug}`}
                  className="rounded-pill bg-white/90 backdrop-blur px-3 py-1 text-emerald-700 border border-white/60 hover:bg-white focus-ring"
                >
                  {c.name.en}
                </Link>
              ))}
              {recipe.mealTypes.slice(0, 1).map((m) => (
                <span key={m} className="rounded-pill bg-ink-900/70 backdrop-blur px-3 py-1 text-white">
                  {m}
                </span>
              ))}
            </div>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.05] mt-3 text-ink-900">
              {recipe.title.en}
            </h1>
            {recipe.description?.en && (
              <p className="mt-3 text-ink-700 max-w-2xl leading-relaxed">{recipe.description.en}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 -mt-2">
        {/* Meta strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
          <Meta
            icon="clock"
            label={t('recipe.prepTime')}
            value={t('recipeMeta.minutesShort', { minutes: recipe.prepMinutes })}
          />
          <Meta
            icon="flame"
            label={t('recipe.cookTime')}
            value={t('recipeMeta.minutesShort', { minutes: recipe.cookMinutes })}
          />
          <Meta
            icon="sum"
            label={t('recipe.totalTime')}
            value={t('recipeMeta.minutesShort', { minutes: recipe.totalMinutes })}
          />
          <Meta
            icon="chef"
            label={t('recipe.difficulty')}
            value={
              t(`recipe.difficulty.${recipe.difficulty}` as
                | 'recipe.difficulty.easy'
                | 'recipe.difficulty.medium'
                | 'recipe.difficulty.hard')
            }
          />
        </div>

        <RecipeActions
          recipeId={recipe.id}
          slug={recipe.slug}
          title={recipe.title.en}
          baselineServings={recipe.servings}
          ingredients={recipe.ingredients}
          ingredientNames={Object.fromEntries(
            [...ingredientMap.entries()].map(([id, ing]) => [id, ing.name.en]),
          )}
        />

        <section className="mt-8 card p-6 md:p-8">
          <h2 className="font-display text-2xl text-ink-900">{t('recipe.method')}</h2>
          <ol className="mt-4 space-y-4">
            {recipe.steps.map((s) => (
              <li key={s.order} className="flex gap-4">
                <div className="grid place-items-center w-9 h-9 rounded-full bg-emerald-700 text-cream-50 font-display text-lg shrink-0">
                  {s.order + 1}
                </div>
                <p className="text-ink-700 leading-relaxed pt-1">{s.text.en}</p>
              </li>
            ))}
          </ol>
        </section>

        {recipe.dietaryTags.length > 0 && (
          <section className="mt-6 flex flex-wrap gap-2 print:hidden">
            {recipe.dietaryTags.map((tag) => {
              const key = `diet.${tag}` as const;
              const label = t(key as 'diet.vegetarian');
              return (
                <span key={tag} className="rounded-pill bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs font-medium">
                  {label === key ? tag.replace('_', ' ') : label}
                </span>
              );
            })}
            {recipe.allergens.map((a) => {
              const key = `allergen.${a}` as const;
              const label = t(key as 'allergen.peanut');
              const display = label === key ? a.replace('_', ' ') : label;
              return (
                <span key={a} className="rounded-pill bg-saffron-500/10 text-saffron-700 border border-saffron-500/20 px-3 py-1 text-xs font-medium">
                  {t('recipe.contains', { allergen: display })}
                </span>
              );
            })}
          </section>
        )}

        {recipe.provenance.attributionText && (
          <p className="text-xs text-ink-400 mt-8">
            {t('recipe.attribution', { source: recipe.provenance.attributionText })}
          </p>
        )}
      </div>
    </article>
  );
}

function Meta({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: 'clock' | 'flame' | 'sum' | 'chef';
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="grid place-items-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700">
        {icon === 'clock' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
        {icon === 'flame' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3s5 4 5 9a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        )}
        {icon === 'sum' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 4h12l-6 8 6 8H6l6-8-6-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        )}
        {icon === 'chef' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 14v5h12v-5M6 14a4 4 0 010-8c0-2 2-3 4-3s2 1 2 1 2-1 4 0 2 3 2 4a4 4 0 010 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-400">{label}</div>
        <div className={`font-medium text-ink-900 ${capitalize ? 'capitalize' : ''}`}>{value}</div>
      </div>
    </div>
  );
}
