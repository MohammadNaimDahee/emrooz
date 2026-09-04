import type { Metadata } from 'next';
import { getTranslator } from '../../lib/i18n-server';
import PlannerClient from './planner-client';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t('meta.planner.title'),
    robots: { index: false },
  };
}

export default function PlannerPage() {
  return <PlannerClient />;
}
