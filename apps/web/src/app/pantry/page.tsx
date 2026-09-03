import type { Metadata } from 'next';
import PantryClient from './pantry-client';

export const metadata: Metadata = {
  title: 'Pantry',
  robots: { index: false },
};

export default function PantryPage() {
  return <PantryClient />;
}
