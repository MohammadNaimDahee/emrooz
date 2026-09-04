'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { promoteCandidate } from './actions';

interface StagedCandidate {
  stage: 'fetched' | 'normalized' | 'validated' | 'duplicate' | 'ready';
  fingerprint: string;
  candidate: {
    providerRecipeId: string;
    title: string;
    cuisineHints: string[];
    ingredientLines: { raw: string; ingredient: string; quantity?: number; unit?: string }[];
    steps: string[];
    provenance?: {
      sourceProvider?: string;
      sourceUrl?: string;
      attributionText?: string;
    };
  };
  normalized?: {
    resolvedIngredientIds: Array<string | null>;
    unmatchedIngredientNames: string[];
  };
  problems: string[];
  duplicateOf?: string;
}

interface ImportResult {
  provider: string;
  fetched: number;
  ready: number;
  duplicate: number;
  needsAttention: number;
  candidates: StagedCandidate[];
}

/**
 * Client for the /api/providers/themealdb/import route.
 *
 * Runs dry-runs (persist is deferred to the next admin release) and displays
 * the pipeline output the same way a reviewer will eventually see it, so the
 * UI investment carries forward when persistence lands.
 */
export function ImportsClient() {
  const router = useRouter();
  const [area, setArea] = useState('Afghan');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [promoting, startPromote] = useTransition();
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  function promote(c: StagedCandidate) {
    setPromoteError(null);
    setPromotingId(c.candidate.providerRecipeId);
    startPromote(() => {
      void (async () => {
        try {
          const res = await promoteCandidate({
            providerRecipeId: c.candidate.providerRecipeId,
            title: c.candidate.title,
            provider: result?.provider ?? 'themealdb',
            attributionText: c.candidate.provenance?.attributionText,
            sourceUrl: c.candidate.provenance?.sourceUrl,
            cuisineHints: c.candidate.cuisineHints,
            ingredientLines: c.candidate.ingredientLines,
            resolvedIngredientIds: c.normalized?.resolvedIngredientIds ?? [],
            steps: c.candidate.steps,
          });
          router.push(`/admin/recipes/${res.id}`);
        } catch (err) {
          setPromoteError(err instanceof Error ? err.message : String(err));
          setPromotingId(null);
        }
      })();
    });
  }

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/providers/themealdb/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          area: area.trim() || undefined,
          query: query.trim() || undefined,
          dryRun: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as ImportResult;
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-ink-100 shadow-card p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-ink-400">TheMealDB area</span>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Afghan, Italian, Japanese…"
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-ink-400">Search query</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="or search by name"
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
            />
          </label>
          <button
            onClick={run}
            disabled={pending || (!area.trim() && !query.trim())}
            className="rounded-pill bg-emerald-700 text-cream-50 px-5 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring disabled:opacity-50 shadow-card"
          >
            {pending ? 'Running…' : 'Run dry-run'}
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-3 text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}
      </div>

      {promoteError && (
        <p
          role="alert"
          className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2"
        >
          {promoteError}
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Kpi label="Fetched" value={result.fetched} tone="ink" />
            <Kpi label="Ready" value={result.ready} tone="emerald" />
            <Kpi label="Duplicates" value={result.duplicate} tone="ink" />
            <Kpi label="Needs attention" value={result.needsAttention} tone="saffron" />
          </div>

          <div className="rounded-2xl bg-white border border-ink-100 shadow-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-ink-400 bg-ink-50/60">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Fingerprint</th>
                  <th className="px-4 py-3">Normalised</th>
                  <th className="px-4 py-3">Issues</th>
                  <th className="px-4 py-3 sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.candidates.map((c) => (
                  <tr key={c.candidate.providerRecipeId} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900">{c.candidate.title}</div>
                      <div className="text-xs text-ink-400">
                        id {c.candidate.providerRecipeId}
                        {c.candidate.cuisineHints.length > 0 && (
                          <> · {c.candidate.cuisineHints.join(', ')}</>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StageChip stage={c.stage} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500 font-mono">
                      {c.fingerprint}
                      {c.duplicateOf && <span className="ml-1 text-saffron-700">(dup)</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.normalized ? (
                        <>
                          <div>
                            {c.normalized.resolvedIngredientIds.filter(Boolean).length} /{' '}
                            {c.normalized.resolvedIngredientIds.length} ingredients matched
                          </div>
                          {c.normalized.unmatchedIngredientNames.length > 0 && (
                            <div className="text-saffron-700 mt-1">
                              unmatched:{' '}
                              {c.normalized.unmatchedIngredientNames.slice(0, 3).join(', ')}
                              {c.normalized.unmatchedIngredientNames.length > 3 && '…'}
                            </div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.problems.length === 0 ? (
                        <span className="text-emerald-700">clean</span>
                      ) : (
                        <ul className="text-saffron-700 space-y-0.5">
                          {c.problems.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={
                          promoting ||
                          c.stage === 'duplicate' ||
                          (c.normalized?.resolvedIngredientIds.filter(Boolean).length ?? 0) === 0
                        }
                        onClick={() => promote(c)}
                        className="rounded-pill bg-emerald-700 text-cream-50 px-3 py-1 text-xs font-medium hover:bg-emerald-600 focus-ring disabled:opacity-40"
                        title={
                          c.stage === 'duplicate'
                            ? 'Duplicate — already in the database'
                            : (c.normalized?.resolvedIngredientIds.filter(Boolean).length ?? 0) ===
                                0
                              ? 'Cannot promote — no ingredients matched the catalogue'
                              : 'Create a draft recipe from this candidate'
                        }
                      >
                        {promotingId === c.candidate.providerRecipeId ? 'Promoting…' : 'Promote'}
                      </button>
                    </td>
                  </tr>
                ))}
                {result.candidates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                      No candidates returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'saffron' | 'ink';
}) {
  const cls = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    saffron: 'bg-saffron-500/10 border-saffron-500/20 text-saffron-700',
    ink: 'bg-white border-ink-100 text-ink-700',
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-xs uppercase tracking-widest opacity-70">{label}</div>
      <div className="font-display text-3xl tabular-nums mt-1">{value}</div>
    </div>
  );
}

function StageChip({ stage }: { stage: StagedCandidate['stage'] }) {
  const tone: Record<StagedCandidate['stage'], string> = {
    fetched: 'bg-ink-50 text-ink-700 border-ink-100',
    normalized: 'bg-ink-50 text-ink-700 border-ink-100',
    validated: 'bg-ink-50 text-ink-700 border-ink-100',
    duplicate: 'bg-saffron-500/10 text-saffron-700 border-saffron-500/20',
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };
  return (
    <span
      className={`inline-block rounded-pill border px-2 py-0.5 text-xs font-medium capitalize ${tone[stage]}`}
    >
      {stage}
    </span>
  );
}
