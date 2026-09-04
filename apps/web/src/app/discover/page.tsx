import type { Metadata } from 'next';
import { getTranslator } from '../../lib/i18n-server';
import DiscoverClient from './discover-client';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t('meta.discover.title'),
    description: t('meta.discover.description'),
  };
}

export default function DiscoverPage() {
  return <DiscoverClient />;
}
