'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { saveRecipe, type RecipeEditorInput } from './actions';

interface Taxonomy {
  cuisines: { id: string; name_en: string }[];
  regions: { id: string; name_en: string; country_id: string }[];
  countries: { id: string; code: string; name_en: string }[];
  ingredients: { id: string; name_en: string; slug: string }[];
}

const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'halal',
  'kosher',
  'gluten_free',
  'dairy_free',
  'egg_free',
  'nut_free',
  'low_carb',
  'high_protein',
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

const MEAL_TYPES = [
  'breakfast',
  'brunch',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'drink',
  'side',
  'appetizer',
  'soup',
  'salad',
] as const;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece', 'clove', 'slice', 'pinch', 'to_taste'] as const;

const OWNERSHIP = [
  'emrooz_owned',
  'licensed',
  'open_license',
  'provider_hosted',
  'external_link_only',
] as const;

const STORAGE = [
  'permanent',
  'subscription_only',
  'temporary_cache',
  'metadata_only',
  'not_permitted',
] as const;

type IngredientRow = RecipeEditorInput['ingredients'][number];
type StepRow = RecipeEditorInput['steps'][number];

interface Props extends Taxonomy {
  initial?: Partial<RecipeEditorInput> & { id?: string };
}

export function RecipeEditor({ initial, cuisines, regions, countries, ingredients }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? '');
  const [descriptionEn, setDescriptionEn] = useState(initial?.description_en ?? '');
  const [originCountryId, setOriginCountryId] = useState<string | null>(
    initial?.origin_country_id ?? null,
  );
  const [prep, setPrep] = useState(initial?.prep_minutes ?? 10);
  const [cook, setCook] = useState(initial?.cook_minutes ?? 20);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    (initial?.difficulty ?? 'easy') as 'easy' | 'medium' | 'hard',
  );
  const [mealTypes, setMealTypes] = useState<string[]>(initial?.meal_types ?? ['dinner']);
  const [servings, setServings] = useState(initial?.servings ?? 4);
  const [dietaryTags, setDietaryTags] = useState<string[]>(initial?.dietary_tags ?? []);
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [cuisineIds, setCuisineIds] = useState<string[]>(initial?.cuisine_ids ?? []);
  const [regionIds, setRegionIds] = useState<string[]>(initial?.region_ids ?? []);
  const [ing, setIng] = useState<IngredientRow[]>(initial?.ingredients ?? []);
  const [steps, setSteps] = useState<StepRow[]>(initial?.steps ?? []);

  const [contentOwner, setContentOwner] = useState(initial?.content_owner ?? 'Emrooz');
  const [ownershipType, setOwnershipType] = useState<(typeof OWNERSHIP)[number]>(
    (initial?.ownership_type as (typeof OWNERSHIP)[number]) ?? 'emrooz_owned',
  );
  const [sourceProvider, setSourceProvider] = useState(initial?.source_provider ?? '');
  const [sourceRecipeId, setSourceRecipeId] = useState(initial?.source_recipe_id ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? '');
  const [attributionText, setAttributionText] = useState(initial?.attribution_text ?? '');
  const [storagePermission, setStoragePermission] = useState<(typeof STORAGE)[number]>(
    (initial?.storage_permission as (typeof STORAGE)[number]) ?? 'permanent',
  );

  const total = prep + cook;

  // Regions filtered by selected origin country for a tighter picker.
  const relevantRegions = useMemo(() => {
    if (!originCountryId) return regions;
    return regions.filter((r) => r.country_id === originCountryId);
  }, [originCountryId, regions]);

  const ingredientMap = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i.name_en] as const)),
    [ingredients],
  );

  function toggleFrom<T>(list: T[], v: T, setter: (l: T[]) => void) {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function addIngredient() {
    setIng((prev) => [
      ...prev,
      {
        ingredient_id: ingredients[0]?.id ?? '',
        position: prev.length,
        quantity: null,
        unit: null,
        note_en: null,
        optional: false,
        group_en: null,
      },
    ]);
  }

  function moveIngredient(from: number, to: number) {
    if (to < 0 || to >= ing.length) return;
    setIng((prev) => {
      const next = prev.slice();
      const item = next[from]!;
      next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((row, i) => ({ ...row, position: i }));
    });
  }

  function updateIngredient(index: number, patch: Partial<IngredientRow>) {
    setIng((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeIngredient(index: number) {
    setIng((prev) => prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, position: i })));
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { step_order: prev.length, text_en: '', duration_minutes: null },
    ]);
  }

  function moveStep(from: number, to: number) {
    if (to < 0 || to >= steps.length) return;
    setSteps((prev) => {
      const next = prev.slice();
      const item = next[from]!;
      next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((s, i) => ({ ...s, step_order: i }));
    });
  }

  function updateStep(index: number, patch: Partial<StepRow>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i })),
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!slug || !titleEn) {
      setError('Slug and title are required.');
      return;
    }
    const payload: RecipeEditorInput = {
      id: initial?.id,
      slug,
      title_en: titleEn,
      description_en: descriptionEn || undefined,
      origin_country_id: originCountryId,
      prep_minutes: prep,
      cook_minutes: cook,
      total_minutes: total,
      difficulty,
      meal_types: mealTypes,
      servings,
      dietary_tags: dietaryTags,
      allergens,
      content_owner: contentOwner,
      ownership_type: ownershipType,
      source_provider: sourceProvider || null,
      source_recipe_id: sourceRecipeId || null,
      source_url: sourceUrl || null,
      attribution_text: attributionText || null,
      storage_permission: storagePermission,
      cuisine_ids: cuisineIds,
      region_ids: regionIds,
      ingredients: ing,
      steps,
    };

    startTransition(() => {
      void (async () => {
        try {
          const result = await saveRecipe(payload);
          if (!initial?.id) router.push(`/admin/recipes/${result.id}`);
          else router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-16">
      <Panel title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title (English)" required>
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Slug" required hint="Used in URLs. Lowercase, hyphens.">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              className="input"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              className="input"
            />
          </Field>
          <Field label="Origin country">
            <select
              value={originCountryId ?? ''}
              onChange={(e) => {
                setOriginCountryId(e.target.value || null);
                setRegionIds([]);
              }}
              className="input"
            >
              <option value="">—</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>

      <Panel title="Cuisines & regions">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cuisines" hint="One or more.">
            <div className="flex flex-wrap gap-2">
              {cuisines.map((c) => (
                <ChipToggle
                  key={c.id}
                  active={cuisineIds.includes(c.id)}
                  onClick={() => toggleFrom(cuisineIds, c.id, setCuisineIds)}
                >
                  {c.name_en}
                </ChipToggle>
              ))}
            </div>
          </Field>
          <Field label="Regions" hint="Optional. Filtered by origin country if set.">
            <div className="flex flex-wrap gap-2">
              {relevantRegions.length === 0 && (
                <span className="text-xs text-ink-400">
                  No regions available. Pick an origin country first.
                </span>
              )}
              {relevantRegions.map((r) => (
                <ChipToggle
                  key={r.id}
                  active={regionIds.includes(r.id)}
                  onClick={() => toggleFrom(regionIds, r.id, setRegionIds)}
                >
                  {r.name_en}
                </ChipToggle>
              ))}
            </div>
          </Field>
        </div>
      </Panel>

      <Panel title="Timing & serving">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Prep (min)" required>
            <input
              type="number"
              min={0}
              value={prep}
              onChange={(e) => setPrep(Math.max(0, Number(e.target.value) || 0))}
              className="input tabular-nums"
              required
            />
          </Field>
          <Field label="Cook (min)" required>
            <input
              type="number"
              min={0}
              value={cook}
              onChange={(e) => setCook(Math.max(0, Number(e.target.value) || 0))}
              className="input tabular-nums"
              required
            />
          </Field>
          <Field label="Total (min)">
            <input value={total} readOnly className="input tabular-nums bg-ink-50" />
          </Field>
          <Field label="Servings" required>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
              className="input tabular-nums"
              required
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Field label="Difficulty" required>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as never)}
              className="input capitalize"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Meal types" hint="One or more.">
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((m) => (
                <ChipToggle
                  key={m}
                  active={mealTypes.includes(m)}
                  onClick={() => toggleFrom(mealTypes, m, setMealTypes)}
                >
                  {m}
                </ChipToggle>
              ))}
            </div>
          </Field>
        </div>
      </Panel>

      <Panel title="Safety">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Dietary tags" hint="Positive claims — only include if verified.">
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((t) => (
                <ChipToggle
                  key={t}
                  active={dietaryTags.includes(t)}
                  onClick={() => toggleFrom(dietaryTags, t, setDietaryTags)}
                >
                  {t.replace('_', ' ')}
                </ChipToggle>
              ))}
            </div>
          </Field>
          <Field label="Allergens" hint="Anything present or 'may contain'.">
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((a) => (
                <ChipToggle
                  key={a}
                  active={allergens.includes(a)}
                  onClick={() => toggleFrom(allergens, a, setAllergens)}
                >
                  {a.replace('_', ' ')}
                </ChipToggle>
              ))}
            </div>
          </Field>
        </div>
      </Panel>

      <Panel
        title="Ingredients"
        action={
          <button type="button" onClick={addIngredient} className="btn-ghost text-sm">
            + Add ingredient
          </button>
        }
      >
        {ing.length === 0 && (
          <p className="text-sm text-ink-500">No ingredients yet. Add the first one.</p>
        )}
        <div className="space-y-2">
          {ing.map((row, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-[auto_2fr_1fr_1fr_2fr_auto_auto] items-center bg-ink-50/40 border border-ink-100 rounded-xl p-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => moveIngredient(index, index - 1)}
                  className="text-ink-500 hover:text-emerald-700 focus-ring px-1"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => moveIngredient(index, index + 1)}
                  className="text-ink-500 hover:text-emerald-700 focus-ring px-1"
                >
                  ▼
                </button>
              </div>
              <select
                value={row.ingredient_id}
                onChange={(e) => updateIngredient(index, { ingredient_id: e.target.value })}
                className="input"
              >
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name_en}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                placeholder="qty"
                value={row.quantity ?? ''}
                onChange={(e) =>
                  updateIngredient(index, {
                    quantity: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="input tabular-nums"
              />
              <select
                value={row.unit ?? ''}
                onChange={(e) => updateIngredient(index, { unit: e.target.value || null })}
                className="input"
              >
                <option value="">—</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                placeholder="Note (optional)"
                value={row.note_en ?? ''}
                onChange={(e) =>
                  updateIngredient(index, { note_en: e.target.value || null })
                }
                className="input"
              />
              <label className="text-xs text-ink-500 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={row.optional}
                  onChange={(e) => updateIngredient(index, { optional: e.target.checked })}
                />
                optional
              </label>
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="text-xs text-ink-400 hover:text-rose-400 focus-ring"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Method"
        action={
          <button type="button" onClick={addStep} className="btn-ghost text-sm">
            + Add step
          </button>
        }
      >
        {steps.length === 0 && (
          <p className="text-sm text-ink-500">No steps yet. Add the first one.</p>
        )}
        <div className="space-y-2">
          {steps.map((s, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-[auto_2rem_1fr_6rem_auto] items-start bg-ink-50/40 border border-ink-100 rounded-xl p-2">
              <div className="flex flex-col mt-1">
                <button
                  type="button"
                  onClick={() => moveStep(index, index - 1)}
                  className="text-ink-500 hover:text-emerald-700 focus-ring px-1"
                  aria-label="Move step up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, index + 1)}
                  className="text-ink-500 hover:text-emerald-700 focus-ring px-1"
                  aria-label="Move step down"
                >
                  ▼
                </button>
              </div>
              <div className="text-center font-display text-lg text-emerald-700 tabular-nums pt-1">
                {index + 1}
              </div>
              <textarea
                value={s.text_en}
                onChange={(e) => updateStep(index, { text_en: e.target.value })}
                rows={2}
                className="input"
                placeholder="What happens at this step?"
              />
              <input
                type="number"
                min={0}
                placeholder="min"
                value={s.duration_minutes ?? ''}
                onChange={(e) =>
                  updateStep(index, {
                    duration_minutes: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="input tabular-nums"
              />
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="text-xs text-ink-400 hover:text-rose-400 focus-ring pt-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Provenance & licensing">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Content owner" required>
            <input
              value={contentOwner}
              onChange={(e) => setContentOwner(e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Ownership type" required>
            <select
              value={ownershipType}
              onChange={(e) => setOwnershipType(e.target.value as never)}
              className="input"
            >
              {OWNERSHIP.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source provider">
            <input
              value={sourceProvider ?? ''}
              onChange={(e) => setSourceProvider(e.target.value)}
              className="input"
              placeholder="themealdb"
            />
          </Field>
          <Field label="Source recipe id">
            <input
              value={sourceRecipeId ?? ''}
              onChange={(e) => setSourceRecipeId(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Source URL">
            <input
              value={sourceUrl ?? ''}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="input"
              type="url"
              placeholder="https://…"
            />
          </Field>
          <Field label="Attribution text">
            <input
              value={attributionText ?? ''}
              onChange={(e) => setAttributionText(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Storage permission" required>
            <select
              value={storagePermission}
              onChange={(e) => setStoragePermission(e.target.value as never)}
              className="input"
            >
              {STORAGE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>

      {error && (
        <p role="alert" className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="sticky bottom-4 flex items-center gap-3 justify-end bg-cream-50/95 backdrop-blur border border-ink-100 rounded-pill shadow-card px-4 py-2 max-w-max ml-auto">
        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-emerald-700 text-cream-50 px-5 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring disabled:opacity-50"
        >
          {pending ? 'Saving…' : initial?.id ? 'Save changes' : 'Create draft'}
        </button>
      </div>

    </form>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-ink-100 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-ink-400 font-medium">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-xs text-ink-400 mt-1 block">{hint}</span>}
    </label>
  );
}

function ChipToggle({
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
