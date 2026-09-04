import type { Metadata } from 'next';
import { getTranslator } from '../../lib/i18n-server';
import PantryClient from './pantry-client';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t('meta.pantry.title'),
    robots: { index: false },
  };
}

export default function PantryPage() {
  return <PantryClient />;
}
