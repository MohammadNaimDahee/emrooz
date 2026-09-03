import { getServerSupabase } from '../../../lib/supabase-server';
import { getTheMealDbProvider, listProviders } from '../../../lib/providers';

export const dynamic = 'force-dynamic';

interface TermsReviewRow {
  id: string;
  provider_id: string;
  reviewer: string;
  reviewed_at: string;
  terms_url: string;
  terms_version: string | null;
  allows_storage: boolean;
  allows_modification: boolean;
  allows_commercial_use: boolean;
  requires_attribution: boolean;
  notes: string | null;
}

interface ProviderRow {
  id: string;
  key: string;
  display_name: string;
  enabled: boolean;
  updated_at: string;
}

async function loadPersistedProviders() {
  const supabase = await getServerSupabase();
  if (!supabase) return { providers: [], reviews: [] as TermsReviewRow[] };
  const [{ data: providers }, { data: reviews }] = await Promise.all([
    supabase.from('providers').select('*').order('display_name'),
    supabase
      .from('provider_terms_reviews')
      .select('*')
      .order('reviewed_at', { ascending: false }),
  ]);
  return {
    providers: (providers as ProviderRow[] | null) ?? [],
    reviews: (reviews as TermsReviewRow[] | null) ?? [],
  };
}

async function safeHealth() {
  const provider = getTheMealDbProvider();
  if (!provider.hasCredentials()) {
    return { reachable: false, lastError: 'THEMEALDB_API_KEY missing' };
  }
  try {
    return await provider.health();
  } catch (err) {
    return { reachable: false, lastError: String(err) };
  }
}

export default async function AdminProvidersPage() {
  const [envProviders, persisted, providerHealth] = await Promise.all([
    Promise.resolve(listProviders()),
    loadPersistedProviders(),
    safeHealth(),
  ]);

  const persistedByKey = new Map(persisted.providers.map((p) => [p.key, p]));

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-400">Infrastructure</div>
        <h1 className="font-display text-4xl text-ink-900 mt-1">Providers</h1>
        <p className="text-sm text-ink-500 mt-1 max-w-2xl">
          External recipe sources. Enable a provider before importing. Persisted rows in{' '}
          <code>providers</code> control which sources the admin UI exposes; the corresponding{' '}
          <code>THEMEALDB_API_KEY</code> (or equivalent) has to be set as a server-only env var —
          those are never displayed here.
        </p>
      </div>

      <section className="rounded-2xl bg-white border border-ink-100 shadow-card divide-y divide-ink-100">
        {envProviders.map((provider) => {
          const dbRow = persistedByKey.get(provider.key);
          const enabled = dbRow?.enabled ?? true;
          return (
            <div key={provider.key} className="p-5 flex flex-wrap gap-6 items-start">
              <div className="flex-1 min-w-[16rem]">
                <div className="flex flex-wrap items-baseline gap-2">
                  <div className="font-display text-xl text-ink-900">{provider.displayName}</div>
                  <span className="text-xs text-ink-400 font-mono">/{provider.key}</span>
                  <span
                    className={`text-xs rounded-pill px-2 py-0.5 ${
                      enabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-ink-50 text-ink-500 border border-ink-100'
                    }`}
                  >
                    {enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>

                <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-ink-400">Credentials</dt>
                    <dd className={provider.hasCredentials ? 'text-emerald-700' : 'text-saffron-700'}>
                      {provider.hasCredentials ? 'Configured' : 'Missing — set env var'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-ink-400">Storage mode</dt>
                    <dd className="capitalize">{provider.storageMode.replace('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-ink-400">Rate limit</dt>
                    <dd className="tabular-nums">
                      {provider.rateLimit.requestsPerMinute ?? '∞'} / min ·{' '}
                      {provider.rateLimit.requestsPerDay ?? '∞'} / day
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-ink-400">Health</dt>
                    <dd className={providerHealth.reachable ? 'text-emerald-700' : 'text-rose-400'}>
                      {providerHealth.reachable ? 'Reachable' : providerHealth.lastError ?? 'Unreachable'}
                    </dd>
                  </div>
                </dl>

                <TermsReviewList
                  reviews={persisted.reviews.filter((r) => dbRow && r.provider_id === dbRow.id)}
                  hasProviderRow={Boolean(dbRow)}
                />
              </div>

              <div className="flex flex-col gap-2 min-w-[10rem]">
                <a
                  href={`/api/providers/${provider.key}/health`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-pill border border-ink-200 text-ink-700 hover:border-emerald-700 hover:text-emerald-700 focus-ring px-4 py-2 text-sm text-center"
                >
                  Health probe →
                </a>
                <a
                  href="/admin/imports"
                  className="rounded-pill bg-emerald-700 text-cream-50 hover:bg-emerald-600 focus-ring px-4 py-2 text-sm text-center font-medium shadow-card"
                >
                  Import via {provider.displayName}
                </a>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function TermsReviewList({
  reviews,
  hasProviderRow,
}: {
  reviews: TermsReviewRow[];
  hasProviderRow: boolean;
}) {
  return (
    <div className="mt-4 rounded-xl bg-ink-50/60 border border-ink-100 p-3">
      <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Terms review</div>
      {!hasProviderRow ? (
        <p className="text-sm text-ink-500">
          No <code>providers</code> row yet. Insert one via Supabase Studio to unlock import review
          history and terms tracking.
        </p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-saffron-700">
          No terms review recorded. Imports should be disabled until a review is on file.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {reviews.slice(0, 3).map((r) => (
            <li key={r.id}>
              <div className="flex flex-wrap gap-2 items-baseline">
                <span className="text-ink-700 font-medium">
                  {new Date(r.reviewed_at).toLocaleDateString()}
                </span>
                <span className="text-xs text-ink-500">by {r.reviewer}</span>
                {r.terms_version && (
                  <span className="text-xs text-ink-400">v{r.terms_version}</span>
                )}
              </div>
              <div className="text-xs text-ink-500 flex flex-wrap gap-2 mt-0.5">
                <span>{r.allows_storage ? 'stores ✓' : 'stores ✗'}</span>
                <span>{r.allows_modification ? 'modifies ✓' : 'modifies ✗'}</span>
                <span>{r.allows_commercial_use ? 'commercial ✓' : 'commercial ✗'}</span>
                <span>{r.requires_attribution ? 'attribution required' : 'no attribution'}</span>
                <a
                  href={r.terms_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:underline focus-ring"
                >
                  Terms →
                </a>
              </div>
              {r.notes && <p className="mt-1 text-xs text-ink-500 italic">{r.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
