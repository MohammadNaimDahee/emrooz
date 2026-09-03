import Link from 'next/link';

import { getServerSupabase } from '../../lib/supabase-server';
import { listProviders } from '../../lib/providers';
import { getTheMealDbProvider } from '../../lib/providers';

export const dynamic = 'force-dynamic';

interface StateCount {
  state: string;
  count: number;
}

async function loadDashboard() {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const [{ data: profileCount }, states, { data: importBatches }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.rpc('emrooz_recipe_state_counts').select().then(
      // rpc doesn't exist yet — fall back to a direct group-by via raw select
      () => undefined,
      () => undefined,
    ) as Promise<undefined>,
    supabase
      .from('import_batches')
      .select('id, status, started_at, finished_at')
      .order('started_at', { ascending: false })
      .limit(5),
  ]);
  void profileCount;
  void states;

  // Direct group-by fallback: fetch every editorial_state column value and
  // group in JS. Small table, small cost.
  const { data: recipes } = await supabase.from('recipes').select('editorial_state');
  const counts = new Map<string, number>();
  for (const r of recipes ?? []) {
    counts.set(r.editorial_state, (counts.get(r.editorial_state) ?? 0) + 1);
  }

  return {
    stateCounts: [...counts.entries()].map(([state, count]) => ({ state, count })) as StateCount[],
    importBatches: importBatches ?? [],
  };
}

async function health() {
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

export default async function AdminOverview() {
  const [data, providerHealth] = await Promise.all([loadDashboard(), health()]);
  const providers = listProviders();

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-400">Editorial</div>
        <h1 className="font-display text-4xl text-ink-900 mt-1">Overview</h1>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-400 mb-3">Recipes by state</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {(data?.stateCounts ?? []).length === 0 && (
            <StateCard label="No recipes yet" state="empty" count={0} />
          )}
          {data?.stateCounts.map((s) => (
            <StateCard key={s.state} label={s.state} state={s.state} count={s.count} />
          ))}
        </div>
        <Link
          href="/admin/recipes"
          className="mt-4 inline-flex items-center gap-2 rounded-pill bg-emerald-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
        >
          Manage recipes
        </Link>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-400 mb-3">Providers</h2>
        <div className="rounded-2xl bg-white border border-ink-100 shadow-card divide-y divide-ink-100">
          {providers.map((p) => (
            <div key={p.key} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[10rem]">
                <div className="font-medium text-ink-900">{p.displayName}</div>
                <div className="text-xs text-ink-500">
                  {p.hasCredentials ? 'Credentials present' : 'No credentials configured'}
                  {' · '}
                  storage: {p.storageMode}
                </div>
              </div>
              <div className={`text-xs rounded-pill px-2 py-1 ${providerHealth.reachable ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-saffron-500/10 text-saffron-700 border border-saffron-500/20'}`}>
                {providerHealth.reachable ? 'Healthy' : providerHealth.lastError ?? 'Unreachable'}
              </div>
              <Link
                href="/admin/providers"
                className="text-sm text-emerald-700 hover:underline focus-ring"
              >
                Manage →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-400 mb-3">Recent imports</h2>
        <div className="rounded-2xl bg-white border border-ink-100 shadow-card">
          {(data?.importBatches ?? []).length === 0 ? (
            <div className="p-6 text-sm text-ink-500">
              No import runs yet.{' '}
              <Link href="/admin/imports" className="text-emerald-700 hover:underline focus-ring">
                Start a dry-run
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {(data?.importBatches ?? []).map((b: { id: string; status: string; started_at: string; finished_at: string | null }) => (
                <li key={b.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 text-sm">
                    <div className="text-ink-900 font-medium">{b.id.slice(0, 8)}</div>
                    <div className="text-xs text-ink-500 tabular-nums">
                      {new Date(b.started_at).toLocaleString()}
                      {b.finished_at ? ` → ${new Date(b.finished_at).toLocaleString()}` : ' (running)'}
                    </div>
                  </div>
                  <div className="text-xs rounded-pill bg-ink-50 text-ink-700 border border-ink-100 px-2 py-1 capitalize">
                    {b.status}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StateCard({ label, state, count }: { label: string; state: string; count: number }) {
  const tone =
    state === 'published'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
      : state === 'draft' || state === 'needs_review'
        ? 'bg-saffron-500/10 border-saffron-500/20 text-saffron-700'
        : state === 'archived' || state === 'rejected'
          ? 'bg-ink-50 border-ink-100 text-ink-500'
          : 'bg-white border-ink-100 text-ink-700';
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="text-xs uppercase tracking-widest opacity-70 capitalize">{label.replace('_', ' ')}</div>
      <div className="mt-2 font-display text-3xl tabular-nums">{count}</div>
    </div>
  );
}
