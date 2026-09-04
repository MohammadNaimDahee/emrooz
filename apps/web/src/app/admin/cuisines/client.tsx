'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deleteCuisine, saveCuisine, type CuisinePayload } from './actions';

interface CuisineRow extends CuisinePayload {
  id: string;
  recipe_count: number;
}

interface Country {
  id: string;
  code: string;
  name_en: string;
}

const EMPTY: CuisinePayload = { slug: '', name_en: '', primary_country_id: null };

export function CuisinesClient({
  cuisines,
  countries,
}: {
  cuisines: CuisineRow[];
  countries: Country[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CuisinePayload | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(payload: CuisinePayload) {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await saveCuisine(payload);
          setEditing(null);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  }

  function remove(row: CuisineRow) {
    if (row.recipe_count > 0) {
      alert(`Can't delete: ${row.recipe_count} recipes still reference this cuisine.`);
      return;
    }
    if (!confirm(`Delete cuisine "${row.name_en}"?`)) return;
    startTransition(() => {
      void (async () => {
        try {
          await deleteCuisine(row.id);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  }

  const countryName = (id: string | null) =>
    id ? (countries.find((c) => c.id === id)?.name_en ?? '—') : '—';

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="rounded-pill bg-emerald-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
        >
          + New cuisine
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="rounded-2xl bg-white border border-ink-100 shadow-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-ink-400 bg-ink-50/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Primary country</th>
              <th className="px-4 py-3">Recipes</th>
              <th className="px-4 py-3 sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {cuisines.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-ink-900">{c.name_en}</td>
                <td className="px-4 py-3 text-ink-400 tabular-nums">/{c.slug}</td>
                <td className="px-4 py-3 text-ink-500">{countryName(c.primary_country_id)}</td>
                <td className="px-4 py-3 tabular-nums">{c.recipe_count}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-sm text-emerald-700 hover:underline focus-ring mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={pending}
                    className="text-sm text-ink-400 hover:text-rose-400 focus-ring"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {cuisines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ink-500">
                  No cuisines yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditorDialog
          initial={editing}
          countries={countries}
          onCancel={() => setEditing(null)}
          onSubmit={submit}
          pending={pending}
        />
      )}
    </div>
  );
}

function EditorDialog({
  initial,
  countries,
  onCancel,
  onSubmit,
  pending,
}: {
  initial: CuisinePayload;
  countries: Country[];
  onCancel: () => void;
  onSubmit: (p: CuisinePayload) => void;
  pending: boolean;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.name_en);
  const [country, setCountry] = useState<string | null>(initial.primary_country_id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-pop border border-ink-100 w-full max-w-md">
        <div className="p-6 space-y-4">
          <h2 className="font-display text-2xl text-ink-900">
            {initial.id ? 'Edit cuisine' : 'New cuisine'}
          </h2>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-ink-400">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-ink-400">Slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-ink-400">Primary country</span>
            <select
              value={country ?? ''}
              onChange={(e) => setCountry(e.target.value || null)}
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
            >
              <option value="">—</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-100">
            <button
              onClick={onCancel}
              className="text-sm text-ink-500 hover:text-emerald-700 focus-ring px-3 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              disabled={pending || !slug || !name}
              onClick={() =>
                onSubmit({
                  id: initial.id,
                  slug,
                  name_en: name,
                  primary_country_id: country,
                })
              }
              className="rounded-pill bg-emerald-700 text-cream-50 px-5 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring disabled:opacity-50 shadow-card"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
