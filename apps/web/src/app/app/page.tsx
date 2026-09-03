import type { Metadata } from 'next';
import TodayClient from './today-client';

export const metadata: Metadata = {
  title: 'Today',
  description: 'Your daily cooking recommendations.',
  robots: { index: false },
};

export default function AppPage() {
  return <TodayClient />;
}
