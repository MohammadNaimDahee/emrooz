import type { Metadata } from 'next';
import FavoritesClient from './favorites-client';

export const metadata: Metadata = {
  title: 'Favorites',
  robots: { index: false },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
