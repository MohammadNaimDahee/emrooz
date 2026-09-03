import type { Metadata } from 'next';
import HistoryClient from './history-client';

export const metadata: Metadata = {
  title: 'History',
  robots: { index: false },
};

export default function HistoryPage() {
  return <HistoryClient />;
}
