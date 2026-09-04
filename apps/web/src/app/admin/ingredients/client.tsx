'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { deleteIngredient, saveIngredient, type IngredientPayload } from './actions';

const CATEGORIES = [
  'produce',
  'vegetable',
  'fruit',
  'herb',
  'spice',
  'grain',
  'legume',
  'dairy',
  'egg',
  'meat',
  'poultry',
  'seafood',
  'fat_or_oil',
  'sweetener',
  'condiment',
  'baking',
  'nut_or_seed',
  'beverage',
  'other',
] as const;

const UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'piece',
  'clove',
  'slice',
  'pinch',
  'to_taste',
] as const;
const ALLERGENS = [
  'gluten',
  'wheat',
  'dairy',
  'egg',
  'peanut',
  'tree_nut',
  'soy',
  'sesame',
  'fish',
  'shellfish',
] as const;
const DIETS = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'halal',
  'kosher',
  'gluten_free',
  'dairy_free',
  'egg_free',
  'nut_free',
] as const;
const COMPAT = ['compatible', 'incompatible', 'unknown'] as const;

const EMPTY: IngredientPayload = {
  slug: '',
  name_en: '',
  category: 'other',
  common_units: [],
  allergens: [],
  dietary_compatibility: {},
  aliases: [],
};

export function IngredientsClient({ rows }: { rows: (IngredientPayload & { id: string })[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<IngredientPayload | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.name_en.toLowerCase().includes(needle) ||
        r.slug.includes(needle) ||
        r.aliases.some((a) => a.toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  function submit(payload: IngredientPayload) {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await saveIngredient(payload);
          setEditing(null);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  }

  function remove(id: string) {
    if (!confirm('Delete this ingredient? Recipes that reference it will fail on next save.'))
      return;
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          await deleteIngredient(id);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[12rem]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, slug, or alias…"
            className="w-full rounded-pill border border-ink-100 bg-white px-4 py-2 text-sm focus-ring"
          />
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="rounded-pill bg-emerald-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
        >
          + New ingredient
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
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Aliases</th>
              <th className="px-4 py-3">Allergens</th>
              <th className="px-4 py-3 sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900">{row.name_en}</div>
                  <div className="text-xs text-ink-400">/{row.slug}</div>
                </td>
                <td className="px-4 py-3 text-ink-500 capitalize">
                  {row.category.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 text-ink-500 text-xs">{row.aliases.join(', ') || '—'}</td>
                <td className="px-4 py-3 text-xs">
                  {row.allergens.length === 0 ? (
                    <span className="text-ink-400">—</span>
                  ) : (
                    row.allergens.join(', ')
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditing(row)}
                    className="text-sm text-emerald-700 hover:underline focus-ring mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(row.id)}
                    disabled={pending}
                    className="text-sm text-ink-400 hover:text-rose-400 focus-ring"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ink-500">
                  No ingredients match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditorDialog
          initial={editing}
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
  onCancel,
  onSubmit,
  pending,
}: {
  initial: IngredientPayload;
  onCancel: () => void;
  onSubmit: (p: IngredientPayload) => void;
  pending: boolean;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.name_en);
  const [category, setCategory] = useState(initial.category);
  const [units, setUnits] = useState<string[]>(initial.common_units);
  const [allergens, setAllergens] = useState<string[]>(initial.allergens);
  const [compat, setCompat] = useState<Record<string, string>>(initial.dietary_compatibility);
  const [aliases, setAliases] = useState<string>(initial.aliases.join(', '));

  function toggle<T>(list: T[], v: T, setter: (l: T[]) => void) {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-pop border border-ink-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <h2 className="font-display text-2xl text-ink-900">
            {initial.id ? 'Edit ingredient' : 'New ingredient'}
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
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
              <span className="text-xs uppercase tracking-widest text-ink-400">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs uppercase tracking-widest text-ink-400">
                Aliases (comma-separated)
              </span>
              <input
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
                placeholder="aubergine, brinjal, baingan"
              />
            </label>
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-ink-400">Common units</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {UNITS.map((u) => (
                <Chip active={units.includes(u)} onClick={() => toggle(units, u, setUnits)} key={u}>
                  {u}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-ink-400">Allergens</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALLERGENS.map((a) => (
                <Chip
                  active={allergens.includes(a)}
                  onClick={() => toggle(allergens, a, setAllergens)}
                  key={a}
                >
                  {a.replace('_', ' ')}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-ink-400">
              Dietary compatibility
            </span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {DIETS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 text-sm">
                  <span className="w-28 capitalize text-ink-700">{tag.replace('_', ' ')}</span>
                  <select
                    value={compat[tag] ?? 'unknown'}
                    onChange={(e) => setCompat((prev) => ({ ...prev, [tag]: e.target.value }))}
                    className="rounded-md border border-ink-100 bg-white px-2 py-1 focus-ring text-xs capitalize"
                  >
                    {COMPAT.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-100">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-ink-500 hover:text-emerald-700 focus-ring px-3 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !name || !slug}
              onClick={() =>
                onSubmit({
                  id: initial.id,
                  slug,
                  name_en: name,
                  category,
                  common_units: units,
                  allergens,
                  dietary_compatibility: compat,
                  aliases: aliases
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3 py-1 text-xs capitalize focus-ring transition ${
        active
          ? 'bg-emerald-700 text-cream-50 border-emerald-700'
          : 'bg-white text-ink-700 border-ink-100 hover:border-emerald-700 hover:text-emerald-700'
      }`}
    >
      {children}
    </button>
  );
}
