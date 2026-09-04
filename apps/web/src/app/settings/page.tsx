import type { Metadata } from 'next';
import { getTranslator } from '../../lib/i18n-server';
import SettingsClient from './settings-client';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('meta.settings.title'), robots: { index: false } };
}

export default function SettingsPage() {
  return <SettingsClient />;
}
