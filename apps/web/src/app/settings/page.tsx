import type { Metadata } from 'next';
import SettingsClient from './settings-client';

export const metadata: Metadata = { title: 'Settings', robots: { index: false } };

export default function SettingsPage() {
  return <SettingsClient />;
}
