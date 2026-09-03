'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { restoreRecipeVersion } from './actions';

interface VersionRow {
  id: string;
  version: number;
  change_reason: string | null;
  editor_id: string | null;
  created_at: string;
  snapshot: unknown;
}

/**
 * Version history for a recipe. Each row expands to show the stored snapshot
 * JSON so a reviewer can diff against the current state before restoring.
 * (A pretty side-by-side diff view is a follow-up; the JSON view is enough
 * to answer "what changed" without leaving the page.)
 */
export function VersionsPanel({ versions }: { versions: VersionRow[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function restore(id: string) {
    if (!confirm('Restore this version? The current state will be saved as a new version first.')) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await restoreRecipeVersion(id);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  }

  if (versions.length === 0) {
    return (
      <section className="rounded-2xl bg-white border border-ink-100 shadow-card p-5 mt-6">
        <h2 className="font-display text-xl text-ink-900">Version history</h2>
        <p className="text-sm text-ink-500 mt-2">
          No history yet. Every edit and restore creates a new snapshot here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white border border-ink-100 shadow-card p-5 mt-6">
      <h2 className="font-display text-xl text-ink-900 mb-4">Version history</h2>
      {error && (
        <p role="alert" className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}
      <ul className="divide-y divide-ink-100 text-sm">
        {versions.map((v) => (
          <li key={v.id} className="py-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-medium text-ink-900 tabular-nums">v{v.version}</span>
              <span className="text-xs text-ink-500 tabular-nums">
                {new Date(v.created_at).toLocaleString()}
              </span>
              <span className="text-xs text-ink-400 capitalize">
                {v.change_reason ?? '—'}
              </span>
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                  className="text-xs text-emerald-700 hover:underline focus-ring"
                >
                  {expanded === v.id ? 'Hide snapshot' : 'View snapshot'}
                </button>
                <button
                  onClick={() => restore(v.id)}
                  disabled={pending}
                  className="rounded-pill border border-ink-200 text-ink-700 hover:border-emerald-700 hover:text-emerald-700 focus-ring px-3 py-1 text-xs disabled:opacity-50"
                >
                  Restore
                </button>
              </div>
            </div>
            {expanded === v.id && (
              <pre className="mt-3 rounded-xl bg-ink-50 border border-ink-100 p-3 text-xs overflow-auto max-h-96">
                <code>{JSON.stringify(v.snapshot, null, 2)}</code>
              </pre>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
