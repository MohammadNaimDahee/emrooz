import type { Metadata } from 'next';
import ShoppingListClient from './shopping-list-client';

export const metadata: Metadata = {
  title: 'Shopping list',
  robots: { index: false },
};

export default function ShoppingListPage() {
  return <ShoppingListClient />;
}
