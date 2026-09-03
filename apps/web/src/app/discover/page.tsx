import type { Metadata } from 'next';
import DiscoverClient from './discover-client';

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Browse recipes across cuisines, times, and dietary tags.',
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
