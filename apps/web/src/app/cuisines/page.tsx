import type { Metadata } from 'next';
import Link from 'next/link';
import { getData } from '../../lib/data';
import { getTranslator } from '../../lib/i18n-server';
import { CuisineArt } from '../../components/CuisineArt';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t('meta.cuisines.title'),
    description: t('meta.cuisines.description'),
  };
}

export default async function CuisineIndex() {
  const { t } = await getTranslator();
  const cuisines = await getData().cuisines.all();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">{t('cuisines.eyebrow')}</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">{t('nav.cuisines')}</h1>
      <p className="text-ink-500 mt-2 max-w-xl">
        {t('cuisines.subtitle')}
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {cuisines.map((c) => (
          <li key={c.id}>
            <Link
              href={`/cuisines/${c.slug}`}
              className="group relative block h-40 rounded-card overflow-hidden focus-ring lift"
            >
              <CuisineArt seed={c.id} size="lg" className="absolute inset-0 rounded-card h-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-xs uppercase tracking-widest opacity-70">{t('cuisines.card.eyebrow')}</div>
                <div className="font-display text-2xl mt-0.5 leading-tight">{c.name.en}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
