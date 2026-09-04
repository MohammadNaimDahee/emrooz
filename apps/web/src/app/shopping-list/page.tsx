import type { Metadata } from 'next';
import { getTranslator } from '../../lib/i18n-server';
import ShoppingListClient from './shopping-list-client';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t('meta.shoppingList.title'),
    robots: { index: false },
  };
}

export default function ShoppingListPage() {
  return <ShoppingListClient />;
}
