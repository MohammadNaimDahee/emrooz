import Link from 'next/link';
import { getData } from '../lib/data';
import { CuisineArt } from '../components/CuisineArt';
import { RecipeCard } from '../components/RecipeCard';
import { getTranslator } from '../lib/i18n';

export const revalidate = 3600;

export default async function LandingPage() {
  const data = getData();
  const [{ t }, cuisines, recipes] = await Promise.all([
    getTranslator(),
    data.cuisines.all(),
    data.recipes.listSummaries({ limit: 12 }),
  ]);

  const cuisineLabels = Object.fromEntries(cuisines.map((c) => [c.id, c.name.en] as const));
  const featured = recipes.slice(0, 3);
  const grid = recipes.slice(3, 9);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-16 md:pt-24 pb-14 md:pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-pill bg-white/60 backdrop-blur px-3 py-1 text-xs text-ink-500 border border-ink-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              {t('landing.hero.eyebrow')}
            </div>
            <h1 className="mt-5 font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-ink-900">
              {t('landing.hero.headline.prefix')}
              <em className="not-italic text-emerald-700">{t('landing.hero.headline.emphasis')}</em>
              {t('landing.hero.headline.suffix')}
            </h1>
            <p className="mt-5 text-lg text-ink-500 max-w-lg leading-relaxed">
              {t('landing.hero.body')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-pill bg-emerald-700 text-cream-50 px-6 py-3.5 text-sm font-medium shadow-card hover:bg-emerald-600 transition focus-ring"
              >
                {t('landing.cta.openApp')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-pill border border-ink-200 bg-white/70 backdrop-blur px-6 py-3.5 text-sm font-medium hover:border-emerald-700 hover:text-emerald-700 transition focus-ring"
              >
                {t('landing.cta.browseRecipes')}
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-400">
              {t('landing.hero.footnote')}
            </p>
          </div>

          {/* Hero collage */}
          <div className="lg:col-span-6 relative">
            <div className="relative grid grid-cols-6 grid-rows-6 gap-3 h-[420px] md:h-[520px]">
              {featured[0] && (
                <Link
                  href={`/recipes/${featured[0].slug}`}
                  className="col-span-4 row-span-4 relative rounded-card overflow-hidden shadow-pop lift focus-ring group"
                >
                  <CuisineArt seed={featured[0].cuisineIds[0] ?? featured[0].slug} size="hero" className="rounded-card h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <div className="text-xs uppercase tracking-widest opacity-80">{t('today.pick')}</div>
                    <div className="font-display text-3xl mt-1 leading-tight">{featured[0].title.en}</div>
                    <div className="text-sm mt-1 opacity-90">
                      {t('landing.hero.recipeMinutes', {
                        minutes: featured[0].totalMinutes,
                        difficulty: featured[0].difficulty,
                      })}
                    </div>
                  </div>
                </Link>
              )}
              {featured[1] && (
                <Link
                  href={`/recipes/${featured[1].slug}`}
                  className="col-span-2 row-span-3 relative rounded-card overflow-hidden shadow-card lift focus-ring group"
                >
                  <CuisineArt seed={featured[1].cuisineIds[0] ?? featured[1].slug} size="lg" className="rounded-card h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="font-display text-lg leading-tight">{featured[1].title.en}</div>
                    <div className="text-xs mt-1 opacity-90">{t('today.timeMin', { count: featured[1].totalMinutes })}</div>
                  </div>
                </Link>
              )}
              {featured[2] && (
                <Link
                  href={`/recipes/${featured[2].slug}`}
                  className="col-span-2 row-span-3 relative rounded-card overflow-hidden shadow-card lift focus-ring group"
                >
                  <CuisineArt seed={featured[2].cuisineIds[0] ?? featured[2].slug} size="lg" className="rounded-card h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="font-display text-lg leading-tight">{featured[2].title.en}</div>
                    <div className="text-xs mt-1 opacity-90">{t('today.timeMin', { count: featured[2].totalMinutes })}</div>
                  </div>
                </Link>
              )}
              <div className="col-span-4 row-span-2 rounded-card bg-white/80 backdrop-blur border border-ink-100 shadow-card p-5 flex items-center gap-4">
                <div className="grid place-items-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7h16M4 12h10M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink-400">
                    {t('landing.hero.card.eyebrow')}
                  </div>
                  <div className="font-medium text-ink-900 mt-0.5">
                    {t('landing.hero.card.body')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value pillars */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="grid md:grid-cols-3 gap-4">
          <Feature
            icon="pantry"
            title={t('landing.features.pantry.title')}
            body={t('landing.features.pantry.longBody')}
          />
          <Feature
            icon="clock"
            title={t('landing.features.time.title')}
            body={t('landing.features.time.longBody')}
          />
          <Feature
            icon="shield"
            title={t('landing.features.safe.title')}
            body={t('landing.features.safe.longBody')}
          />
        </div>
      </section>

      {/* Cuisine strip */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-400">
              {t('landing.cuisines.eyebrow')}
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-ink-900 leading-tight mt-1">
              {t('landing.cuisines.title')}
            </h2>
          </div>
          <Link href="/cuisines" className="hidden md:inline text-sm text-emerald-700 hover:underline focus-ring">
            {t('landing.cuisines.viewAll')}
          </Link>
        </div>
        <p className="text-ink-500 max-w-2xl">
          {t('landing.cuisines.longBody')}
        </p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {cuisines.slice(0, 12).map((c) => (
            <Link
              key={c.id}
              href={`/cuisines/${c.slug}`}
              className="group relative overflow-hidden rounded-card h-28 focus-ring"
            >
              <CuisineArt seed={c.id} size="md" className="rounded-card absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <div className="absolute inset-0 flex items-end p-3">
                <span className="font-display text-white text-lg leading-none">{c.name.en}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured grid */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-400">
              {t('landing.popular.eyebrow')}
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-ink-900 leading-tight mt-1">
              {t('landing.popular.title')}
            </h2>
          </div>
          <Link href="/discover" className="hidden md:inline text-sm text-emerald-700 hover:underline focus-ring">
            {t('landing.popular.browseAll')}
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {grid.map((r) => (
            <RecipeCard key={r.id} recipe={r} cuisineLabels={cuisineLabels} />
          ))}
        </div>
      </section>

      {/* Afghan flagship */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-900 text-cream-50 p-8 md:p-14 shadow-pop">
          <div className="absolute inset-0 bg-grain opacity-40 pointer-events-none" aria-hidden="true" />
          <div className="relative grid md:grid-cols-5 gap-8 items-center">
            <div className="md:col-span-3">
              <div className="text-xs uppercase tracking-widest text-cream-50/70">
                {t('landing.afghan.eyebrow')}
              </div>
              <h2 className="font-display text-4xl md:text-5xl mt-2 leading-tight">
                {t('landing.afghan.longTitle')}
              </h2>
              <p className="mt-4 text-cream-50/80 max-w-xl leading-relaxed">
                {t('landing.afghan.longBody')}
              </p>
              <Link
                href="/cuisines/afghan"
                className="mt-6 inline-flex items-center gap-2 rounded-pill bg-cream-50 text-emerald-700 px-6 py-3 text-sm font-medium hover:bg-white transition focus-ring"
              >
                {t('landing.afghan.exploreCta')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              {recipes
                .filter((r) => r.cuisineIds.includes('cu_afghan'))
                .slice(0, 4)
                .map((r) => (
                  <Link
                    key={r.id}
                    href={`/recipes/${r.slug}`}
                    className="relative overflow-hidden rounded-2xl h-32 focus-ring group"
                  >
                    <CuisineArt seed={r.slug} size="md" className="absolute inset-0 h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 text-white text-sm leading-tight font-display">
                      {r.title.en}
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-14 md:py-20">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest text-ink-400">
            {t('landing.faq.eyebrow')}
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-ink-900 mt-1">
            {t('landing.faq.commonTitle')}
          </h2>
        </div>
        <div className="divide-y divide-ink-100 rounded-card card overflow-hidden">
          <Faq q={t('landing.faq.guest2.q')}>{t('landing.faq.guest2.a')}</Faq>
          <Faq q={t('landing.faq.allergies.q')}>{t('landing.faq.allergies.a')}</Faq>
          <Faq q={t('landing.faq.notAfghan.q')}>{t('landing.faq.notAfghan.a')}</Faq>
          <Faq q={t('landing.faq.offline.q')}>{t('landing.faq.offline.a')}</Faq>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-[28px] bg-white shadow-card border border-ink-100 p-8 md:p-14 text-center">
          <h2 className="font-display text-3xl md:text-5xl text-ink-900 leading-tight">
            {t('landing.cta.title')}
          </h2>
          <p className="mt-3 text-ink-500 max-w-xl mx-auto">
            {t('landing.cta.body')}
          </p>
          <Link
            href="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-pill bg-emerald-700 text-cream-50 px-7 py-4 text-base font-medium shadow-card hover:bg-emerald-600 transition focus-ring"
          >
            {t('landing.cta.openApp')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, body }: { icon: 'pantry' | 'clock' | 'shield'; title: string; body: string }) {
  return (
    <div className="card p-6 lift">
      <div className="grid place-items-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700">
        {icon === 'pantry' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 9h16M6 9v11h12V9M9 5a3 3 0 016 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
        {icon === 'clock' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
        {icon === 'shield' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <h3 className="mt-4 font-display text-2xl text-ink-900 leading-tight">{title}</h3>
      <p className="mt-2 text-ink-500 leading-relaxed">{body}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="list-none cursor-pointer px-6 py-5 flex items-center justify-between text-ink-900 focus-ring">
        <span className="font-medium">{q}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="transition-transform group-open:rotate-180 text-ink-400"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="px-6 pb-5 text-ink-500 leading-relaxed">{children}</div>
    </details>
  );
}
