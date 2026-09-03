import Link from 'next/link';

import { getServerSupabase } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const STATES = ['draft', 'imported', 'needs_review', 'reviewed', 'published', 'rejected', 'archived'] as const;
type State = (typeof STATES)[number];

interface Row {
  id: string;
  slug: string;
  title_en: string;
  editorial_state: State;
  updated_at: string;
  version: number;
  recipe_cuisines: { cuisine_id: string }[];
}

interface SearchParams {
  q?: string;
  state?: string;
}

async function loadRecipes(sp: SearchParams): Promise<Row[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  let query = supabase
    .from('recipes')
    .select('id, slug, title_en, editorial_state, updated_at, version, recipe_cuisines(cuisine_id)')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (sp.state && (STATES as readonly string[]).includes(sp.state)) {
    query = query.eq('editorial_state', sp.state);
  }
  if (sp.q?.trim()) {
    query = query.ilike('title_en', `%${sp.q.trim()}%`);
  }
  const { data } = await query;
  return (data as Row[] | null) ?? [];
}

export default async function AdminRecipesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const rows = await loadRecipes(sp);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-400">Content</div>
          <h1 className="font-display text-4xl text-ink-900 mt-1">Recipes</h1>
          <p className="text-sm text-ink-500 mt-1">{rows.length} recipes match your filters.</p>
        </div>
        <Link
          href="/admin/recipes/new"
          className="inline-flex items-center gap-2 rounded-pill bg-emerald-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
        >
          <span aria-hidden="true">+</span> New recipe
        </Link>
      </div>

      {/* Filter form (GET → URL query) */}
      <form
        method="GET"
        className="flex flex-wrap items-center gap-3 rounded-2xl bg-white border border-ink-100 p-3 shadow-card"
      >
        <div className="relative flex-1 min-w-[12rem]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Search titles…"
            className="w-full rounded-pill border border-ink-100 bg-white pl-10 pr-4 py-2 text-sm focus-ring"
          />
        </div>
        <select
          name="state"
          defaultValue={sp.state ?? ''}
          className="rounded-pill border border-ink-100 bg-white px-3 py-2 text-sm focus-ring capitalize"
        >
          <option value="">Any state</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-pill bg-emerald-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
        >
          Filter
        </button>
        {(sp.q || sp.state) && (
          <Link href="/admin/recipes" className="text-sm text-ink-500 hover:text-emerald-700 focus-ring">
            Clear
          </Link>
        )}
      </form>

      {/* Recipe table */}
      <div className="rounded-2xl bg-white border border-ink-100 shadow-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-ink-400 bg-ink-50/60">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Cuisines</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3 sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/recipes/${r.id}`} className="font-medium text-emerald-700 focus-ring">
                    {r.title_en}
                  </Link>
                  <div className="text-xs text-ink-400 tabular-nums">/{r.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <StateChip state={r.editorial_state} />
                </td>
                <td className="px-4 py-3 text-ink-500 text-xs">
                  {r.recipe_cuisines?.map((c) => c.cuisine_id.slice(0, 8)).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-ink-500 tabular-nums text-xs">
                  {new Date(r.updated_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 tabular-nums">{r.version}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/recipes/${r.id}`}
                    className="text-sm text-emerald-700 hover:underline focus-ring"
                  >
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-500">
                  No recipes match. Try clearing filters or{' '}
                  <Link href="/admin/recipes/new" className="text-emerald-700 hover:underline focus-ring">
                    create the first one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StateChip({ state }: { state: State }) {
  const tone: Record<State, string> = {
    draft: 'bg-ink-50 text-ink-700 border-ink-100',
    imported: 'bg-ink-50 text-ink-700 border-ink-100',
    needs_review: 'bg-saffron-500/10 text-saffron-700 border-saffron-500/20',
    reviewed: 'bg-saffron-500/10 text-saffron-700 border-saffron-500/20',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-rose-400/10 text-rose-400 border-rose-400/30',
    archived: 'bg-ink-50 text-ink-400 border-ink-100',
  };
  return (
    <span className={`inline-block rounded-pill border px-2 py-0.5 text-xs font-medium capitalize ${tone[state]}`}>
      {state.replace('_', ' ')}
    </span>
  );
}
