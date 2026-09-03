import type { Metadata } from 'next';
import { ImportsClient } from './client';

export const metadata: Metadata = { title: 'Imports', robots: { index: false } };

export default function AdminImportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-400">Ingest</div>
        <h1 className="font-display text-4xl text-ink-900 mt-1">Imports</h1>
        <p className="text-sm text-ink-500 mt-1 max-w-2xl">
          Run a dry-run against TheMealDB. The pipeline fetches candidates, normalises ingredients
          against the local catalogue, dedupes, and stages results for review. Nothing is written
          to the database yet — persisted imports arrive with the next admin release.
        </p>
      </div>
      <ImportsClient />
    </div>
  );
}
