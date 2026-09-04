import type { Metadata } from 'next';
import { getTranslator } from '../../lib/i18n-server';
import HistoryClient from './history-client';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t('meta.history.title'),
    robots: { index: false },
  };
}

export default function HistoryPage() {
  return <HistoryClient />;
}
