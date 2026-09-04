'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scaleIngredients, toIsoDate } from '@emrooz/core';
import type { RecipeIngredient } from '@emrooz/types';
import { getData } from '../../../lib/data';
import { useGuestId } from '../../../lib/guest';
import { useTranslator } from '../../../lib/i18n-client';

export function RecipeActions(props: {
  recipeId: string;
  slug: string;
  title: string;
  baselineServings: number;
  ingredients: RecipeIngredient[];
  ingredientNames: Record<string, string>;
}) {
  const { t } = useTranslator();
  const data = getData();
  const userId = useGuestId();
  const client = useQueryClient();
  const [servings, setServings] = useState(props.baselineServings);
  const [showCookedModal, setShowCookedModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [addedToList, setAddedToList] = useState(false);
  const [note, setNote] = useState('');
  const [cookedAt, setCookedAt] = useState<string | null>(null);

  // Live favorite status so the button reflects true state on load.
  const favQ = useQuery({
    queryKey: ['favorite', userId, props.recipeId],
    enabled: Boolean(userId),
    queryFn: () => data.favorites.isFavorite(userId, props.recipeId),
  });
  const pantryQ = useQuery({
    queryKey: ['pantry', userId],
    enabled: Boolean(userId),
    queryFn: () => data.pantry.list(userId),
  });

  const scaled = scaleIngredients(
    { servings: props.baselineServings, ingredients: props.ingredients },
    servings,
  );

  const pantrySet = new Set((pantryQ.data ?? []).map((p) => p.ingredientId));
  const missing = props.ingredients
    .filter((i) => !i.optional && !pantrySet.has(i.ingredientId))
    .map((i) => i.ingredientId);

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (favQ.data) {
        await data.favorites.remove(userId, props.recipeId);
      } else {
        await data.favorites.add({
          id: `fv_${Math.random().toString(36).slice(2)}`,
          userId,
          recipeId: props.recipeId,
          favoritedAt: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['favorite'] }),
  });

  const markCooked = useMutation({
    mutationFn: async (privateNote?: string) => {
      const id = `hi_${Math.random().toString(36).slice(2)}`;
      await data.history.add({
        id,
        userId,
        recipeId: props.recipeId,
        cookedOn: toIsoDate(),
        servings,
        note: privateNote?.trim() ? privateNote.trim() : undefined,
        createdAt: new Date().toISOString(),
      });
      return id;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['history'] });
      client.invalidateQueries({ queryKey: ['today'] });
      setCookedAt(new Date().toISOString());
    },
  });

  const addMissingToList = useMutation({
    mutationFn: async () => {
      if (missing.length === 0) return;
      const existing = await data.shoppingList.list(userId);
      const existingByIngredient = new Map(
        existing.filter((i) => i.ingredientId).map((i) => [i.ingredientId!, i]),
      );
      const now = new Date().toISOString();
      for (const ingredientId of missing) {
        const found = existingByIngredient.get(ingredientId);
        if (found) {
          // Attach this recipe as another source; don't uncheck a user's checked item.
          if (!found.sourceRecipeIds.includes(props.recipeId)) {
            await data.shoppingList.upsert({
              ...found,
              sourceRecipeIds: [...found.sourceRecipeIds, props.recipeId],
              updatedAt: now,
            });
          }
        } else {
          await data.shoppingList.upsert({
            id: `sl_${Math.random().toString(36).slice(2)}`,
            userId,
            ingredientId,
            sourceRecipeIds: [props.recipeId],
            checked: false,
            addedAt: now,
            updatedAt: now,
          });
        }
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['shopping-list'] });
      setAddedToList(true);
      setTimeout(() => setAddedToList(false), 2200);
    },
  });

  async function shareRecipe() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const message = t('recipe.share.message', { title: props.title, slug: props.slug });
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: props.title, text: message, url });
      } catch {
        // User cancelled — nothing to do.
      }
    } else if (
      typeof navigator !== 'undefined' &&
      (navigator as Navigator & { clipboard?: Clipboard }).clipboard
    ) {
      await (navigator as Navigator & { clipboard: Clipboard }).clipboard.writeText(url);
      alert(t('recipe.share.linkCopied'));
    }
  }

  return (
    <section className="mt-6 card p-6 md:p-8 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-ink-900">{t('recipe.ingredients')}</h2>
        <div className="flex items-center gap-3">
          <label htmlFor="servings" className="text-sm text-ink-500">
            {t('recipe.servings')}
          </label>
          <div className="inline-flex items-center rounded-pill border border-ink-100 bg-white">
            <button
              type="button"
              onClick={() => setServings(Math.max(1, servings - 1))}
              className="w-9 h-9 leading-none text-lg text-ink-500 hover:text-emerald-700 focus-ring rounded-l-pill"
              aria-label={t('recipe.decreaseServings')}
            >
              −
            </button>
            <span id="servings" className="w-9 text-center font-semibold tabular-nums">
              {servings}
            </span>
            <button
              type="button"
              onClick={() => setServings(servings + 1)}
              className="w-9 h-9 leading-none text-lg text-ink-500 hover:text-emerald-700 focus-ring rounded-r-pill"
              aria-label={t('recipe.increaseServings')}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-ink-100">
        {scaled.map((ing, i) => {
          const inPantry = pantrySet.has(ing.ingredientId);
          return (
            <li key={i} className="flex py-3 gap-4 items-baseline">
              <span className="w-28 text-ink-400 tabular-nums text-sm">
                {ing.quantity ? `${ing.quantity} ${ing.unit ?? ''}`.trim() : t('recipe.toTaste')}
              </span>
              <span className={`flex-1 ${inPantry ? 'text-ink-500' : 'text-ink-900'}`}>
                {props.ingredientNames[ing.ingredientId] ?? ing.ingredientId}
              </span>
              {ing.optional ? (
                <span className="text-xs text-ink-400 italic">{t('recipe.optionalLabel')}</span>
              ) : inPantry ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12l4 4L20 6"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t('recipe.pantryIndicator')}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {missing.length > 0 && (
        <button
          onClick={() => addMissingToList.mutate()}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-pill border px-5 py-3 text-sm font-medium focus-ring transition ${
            addedToList
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'border-ink-200 text-ink-700 hover:border-emerald-700 hover:text-emerald-700'
          }`}
        >
          {addedToList ? (
            <>
              <CheckIcon /> {t('recipe.addedToList', { count: missing.length })}
            </>
          ) : (
            <>
              <BasketIcon /> {t('recipe.addMissingToList', { count: missing.length })}
            </>
          )}
        </button>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setShowCookedModal(true)}
          className={`inline-flex items-center gap-2 rounded-pill px-5 py-3 text-sm font-medium focus-ring transition ${
            cookedAt
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-emerald-700 text-cream-50 hover:bg-emerald-600 shadow-card'
          }`}
        >
          {cookedAt ? (
            <>
              <CheckIcon /> {t('recipe.actions.logged')}
            </>
          ) : (
            <>
              <ChefIcon /> {t('recipe.iCookedThis.button')}
            </>
          )}
        </button>
        <button
          onClick={() => toggleFavorite.mutate()}
          className={`inline-flex items-center gap-2 rounded-pill border px-5 py-3 text-sm font-medium focus-ring transition ${
            favQ.data
              ? 'bg-rose-400/10 text-rose-400 border-rose-400/30'
              : 'border-ink-200 text-ink-700 hover:border-emerald-700 hover:text-emerald-700'
          }`}
          aria-pressed={Boolean(favQ.data)}
        >
          <HeartIcon filled={Boolean(favQ.data)} />
          {favQ.data ? t('recipe.actions.favorited') : t('recipe.favorite')}
        </button>
        <button
          onClick={shareRecipe}
          className="inline-flex items-center gap-2 rounded-pill border border-ink-200 px-5 py-3 text-sm font-medium hover:border-emerald-700 hover:text-emerald-700 focus-ring transition"
        >
          <ShareIcon /> {t('recipe.share')}
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-pill border border-ink-200 px-5 py-3 text-sm font-medium hover:border-emerald-700 hover:text-emerald-700 focus-ring transition"
        >
          <PrintIcon /> {t('recipe.print')}
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="ml-auto text-xs text-ink-400 hover:text-emerald-700 focus-ring underline"
        >
          {t('recipe.reportProblem')}
        </button>
      </div>

      {/* "I cooked this" — capture optional private note */}
      {showCookedModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCookedModal(false)}
        >
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-display text-2xl text-ink-900">{t('recipe.log.title')}</h3>
            <p className="text-ink-500 text-sm mt-2">{t('recipe.log.noteHint2')}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t('recipe.log.notePlaceholder')}
              className="mt-3 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 focus-ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowCookedModal(false)}
                className="px-4 py-2 text-sm text-ink-500 hover:text-emerald-700 focus-ring rounded-lg"
              >
                {t('action.cancel')}
              </button>
              <button
                onClick={async () => {
                  await markCooked.mutateAsync(note);
                  setShowCookedModal(false);
                  setNote('');
                }}
                className="rounded-pill bg-emerald-700 text-cream-50 px-5 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring"
              >
                {t('action.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report a problem */}
      {showReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowReport(false)}
        >
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-display text-2xl text-ink-900">{t('recipe.reportProblem')}</h3>
            <p className="text-ink-500 text-sm mt-2">{t('recipe.report.body')}</p>
            <div className="mt-4 flex flex-col gap-2">
              {(
                [
                  'recipe.report.reason.ingredient',
                  'recipe.report.reason.instructions',
                  'recipe.report.reason.time',
                  'recipe.report.reason.dietary',
                  'recipe.report.reason.other',
                ] as const
              ).map((key) => {
                const label = t(key);
                return (
                  <a
                    key={key}
                    href={`mailto:hello@emroozapp.com?subject=Report%3A%20${encodeURIComponent(props.slug)}&body=${encodeURIComponent(`Issue: ${label}\n\nRecipe: ${props.title}\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}\n\nDetails:\n`)}`}
                    className="block rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm hover:border-emerald-700 hover:text-emerald-700 focus-ring"
                    onClick={() => setShowReport(false)}
                  >
                    {label}
                  </a>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowReport(false)}
                className="px-4 py-2 text-sm text-ink-500 hover:text-emerald-700 focus-ring rounded-lg"
              >
                {t('action.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12l4 4L20 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChefIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 14v6h10v-6M7 14a4 4 0 010-8c0-1.5 1.5-3 3.5-3 1.5 0 2 1 2 1s.5-1 2-1c2 0 3.5 1.5 3.5 3a4 4 0 010 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
    >
      <path
        d="M12 20s-7-4.35-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.65-9 9-9 9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PrintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9V4h12v5M6 18h12v3H6v-3zM6 18H4v-6a2 2 0 012-2h12a2 2 0 012 2v6h-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v13m0-13l-4 4m4-4l4 4M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function BasketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 9h14l-1 10a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9zm3-3a4 4 0 018 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
