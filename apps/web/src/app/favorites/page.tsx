import type { Metadata } from 'next';
import { getTranslator } from '../../lib/i18n-server';
import FavoritesClient from './favorites-client';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t('meta.favorites.title'),
    robots: { index: false },
  };
}

export default function FavoritesPage() {
  return <FavoritesClient />;
}
