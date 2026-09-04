'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState, useEffect } from 'react';

import { recommend } from '@emrooz/recommendations';
import { timeOfDay, toIsoDate } from '@emrooz/core';
import type { FeedbackType, UserPreferences } from '@emrooz/types';

import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';
import { useTranslator } from '../../lib/i18n-client';
import { usePreferences } from '../../lib/prefs-client';
import OnboardingSheet from '../onboarding/OnboardingSheet';
import { CuisineArt } from '../../components/CuisineArt';

type Filter =
  | undefined
  | 'time_20'
  | 'time_30'
  | 'quick_meal'
  | 'vegetarian'
  | 'use_what_i_have'
  | 'surprise_me';

// Filter chips. Labels come from t() inside the component so they respect
// the active locale — this array only carries the stable key metadata.
const FILTERS: {
  key: Exclude<Filter, undefined>;
  labelKey: 'quick' | 'time20' | 'vegetarian' | 'useWhatIHave' | 'surpriseMe';
}[] = [
  { key: 'quick_meal', labelKey: 'quick' },
  { key: 'time_20', labelKey: 'time20' },
  { key: 'vegetarian', labelKey: 'vegetarian' },
  { key: 'use_what_i_have', labelKey: 'useWhatIHave' },
  { key: 'surprise_me', labelKey: 'surpriseMe' },
];

const FEEDBACK_OPTIONS: {
  kind: FeedbackType;
  labelKey: 'notToday' | 'doNotLike' | 'tooDifficult' | 'tooLong';
}[] = [
  { kind: 'not_today', labelKey: 'notToday' },
  { kind: 'do_not_like', labelKey: 'doNotLike' },
  { kind: 'too_difficult', labelKey: 'tooDifficult' },
  { kind: 'takes_too_long', labelKey: 'tooLong' },
];

export default function TodayClient() {
  const data = getData();
  const { t } = useTranslator();
  const userId = useGuestId();
  const { prefs, save } = usePreferences(userId);
  const [filter, setFilter] = useState<Filter>();
  const today = toIsoDate();
  const client = useQueryClient();

  const q = useQuery({
    queryKey: ['today', userId, today, filter, prefs?.onboardedAt],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [recipes, ingredientsList, pantry, favorites, history, feedback, impressions] =
        await Promise.all([
          data.recipes.listPublished({ limit: 200 }),
          data.ingredients.all(),
          data.pantry.list(userId),
          data.favorites.list(userId),
          data.history.list(userId),
          data.feedback.list(userId),
          data.impressions.list(userId),
        ]);
      const preferences: UserPreferences = prefs ?? {
        userId,
        language: 'en',
        cuisineIds: [],
        householdSize: 2,
        dietaryTags: [],
        allergens: [],
        dislikedIngredientIds: [],
        pantrySeedIngredientIds: [],
      };
      return recommend({
        today,
        userId,
        preferences,
        pantry: new Set(pantry.map((p) => p.ingredientId)),
        favorites,
        history,
        feedback,
        impressions,
        recipes,
        ingredients: new Map(ingredientsList.map((i) => [i.id, i])),
        quickFilter: filter,
        limit: 3,
      });
    },
  });

  const sendFeedback = useMutation({
    mutationFn: async (v: { recipeId: string; kind: FeedbackType }) => {
      await data.feedback.add({
        id: `fb_${Math.random().toString(36).slice(2)}`,
        userId,
        recipeId: v.recipeId,
        feedback: v.kind,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['today'] }),
  });

  const greeting = useMemo(() => {
    const tod = timeOfDay();
    const key =
      tod === 'morning'
        ? 'today.greeting.morning'
        : tod === 'afternoon'
          ? 'today.greeting.afternoon'
          : 'today.greeting.evening';
    return t(key as never);
  }, [t]);

  const showOnboarding = !prefs?.onboardedAt;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16">
      <div className="animate-fade-up">
        <p className="text-sm text-ink-500">{greeting}</p>
        <h1 className="font-display text-4xl md:text-5xl text-ink-900 leading-tight mt-1">
          {t('today.question')}
        </h1>
        <p className="mt-3 text-ink-500">{t('today.web.subtitle')}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter((cur) => (cur === f.key ? undefined : f.key))}
            className={`rounded-pill px-4 py-2 text-sm border transition focus-ring ${
              filter === f.key
                ? 'bg-emerald-700 text-cream-50 border-emerald-700'
                : 'bg-white border-ink-100 text-ink-700 hover:border-emerald-700 hover:text-emerald-700'
            }`}
            aria-pressed={filter === f.key}
          >
            {t(`today.filter.${f.labelKey}` as never)}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {q.isLoading && <SkeletonList />}
        {q.data?.length === 0 && (
          <div className="card p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 4l16 16M4 20L20 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 className="mt-4 font-display text-2xl text-ink-900">
              {t('today.emptyState.title')}
            </h2>
            <p className="text-ink-500 mt-2 max-w-md mx-auto">{t('today.emptyState.subtitle')}</p>
          </div>
        )}
        {q.data &&
          q.data.length > 0 &&
          (() => {
            // Pull the primary pick into a local so TS narrows the tuple access
            // — indexing into q.data inline keeps its type as `T | undefined`.
            const hero = q.data[0]!;
            const rest = q.data.slice(1);
            return (
              <>
                {/* Hero: today's single primary pick. Same visual weight as the
                mobile app's Today hero card so users get a clear "one meal
                per day" moment before browsing the alternatives. */}
                <HeroPick
                  slug={hero.recipe.slug}
                  title={hero.recipe.title.en}
                  mealType={hero.recipe.mealTypes[0] ?? 'meal'}
                  totalMinutes={hero.recipe.totalMinutes}
                  difficulty={hero.recipe.difficulty}
                  reason={hero.reason}
                  pantryMatch={hero.breakdown.pantryMatch}
                  missing={hero.missingIngredientIds.length}
                  dietaryTags={hero.recipe.dietaryTags}
                  cuisineSeed={hero.recipe.cuisineIds[0] ?? hero.recipe.slug}
                  onFeedback={(kind) => sendFeedback.mutate({ recipeId: hero.recipe.id, kind })}
                />

                {rest.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-xs uppercase tracking-widest text-ink-400">
                      {t('today.web.orTryTheseTitle')}
                    </h2>
                    <div className="mt-3 space-y-3">
                      {rest.map((rec, i) => (
                        <SecondaryPick
                          key={rec.recipe.id}
                          index={i}
                          slug={rec.recipe.slug}
                          title={rec.recipe.title.en}
                          mealType={rec.recipe.mealTypes[0] ?? 'meal'}
                          totalMinutes={rec.recipe.totalMinutes}
                          difficulty={rec.recipe.difficulty}
                          pantryMatch={rec.breakdown.pantryMatch}
                          missing={rec.missingIngredientIds.length}
                          cuisineSeed={rec.recipe.cuisineIds[0] ?? rec.recipe.slug}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
      </div>

      <div className="mt-10 text-center text-xs text-ink-400">{t('demo.banner')}</div>

      {showOnboarding && userId && (
        <OnboardingSheet
          userId={userId}
          onSave={(p) => save({ ...p, onboardedAt: new Date().toISOString() })}
        />
      )}
    </div>
  );
}

/**
 * The one primary pick of the day — matches the mobile Today hero card in
 * visual weight (large image, bold headline, reason quote, feedback menu).
 * There is intentionally only one HeroPick on the screen at a time.
 */
function HeroPick({
  slug,
  title,
  mealType,
  totalMinutes,
  difficulty,
  reason,
  pantryMatch,
  missing,
  dietaryTags,
  cuisineSeed,
  onFeedback,
}: {
  slug: string;
  title: string;
  mealType: string;
  totalMinutes: number;
  difficulty: string;
  reason: string;
  pantryMatch: number;
  missing: number;
  dietaryTags: string[];
  cuisineSeed: string;
  onFeedback: (kind: FeedbackType) => void;
}) {
  const { t } = useTranslator();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div className="relative">
      <Link
        href={`/recipes/${slug}`}
        className="group grid md:grid-cols-5 gap-0 card overflow-hidden lift focus-ring animate-fade-up"
      >
        <div className="md:col-span-2">
          <CuisineArt seed={cuisineSeed} size="lg" className="rounded-none h-56 md:h-full" />
        </div>
        <div className="md:col-span-3 p-6 md:p-8 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-400">
                {t('today.pick')} · {mealType}
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-ink-900 mt-1 group-hover:text-emerald-700 transition leading-tight">
                {title}
              </h2>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-2xl text-emerald-700">
                {Math.round(pantryMatch * 100)}%
              </div>
              <div className="text-xs text-ink-400 uppercase tracking-widest">match</div>
            </div>
          </div>

          <p className="text-emerald-700/90 mt-3 italic">"{reason}"</p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Chip>
              <ClockIcon /> {totalMinutes} min
            </Chip>
            <Chip>{difficulty}</Chip>
            {missing > 0 && <Chip tone="warn">{missing} missing</Chip>}
            {dietaryTags.slice(0, 2).map((t) => (
              <Chip key={t} tone="soft">
                {t.replace('_', ' ')}
              </Chip>
            ))}
          </div>
        </div>
      </Link>

      {/* Overflow menu — kept outside the Link to prevent accidental navigation */}
      <div ref={menuRef} className="absolute top-3 right-3 print:hidden">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="grid place-items-center w-9 h-9 rounded-full bg-white/90 shadow-card hover:bg-white text-ink-500 hover:text-emerald-700 focus-ring"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Feedback"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="6" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="18" cy="12" r="1.6" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-pop border border-ink-100 p-1 z-10 text-sm"
          >
            <div className="px-3 py-2 text-xs text-ink-400 uppercase tracking-widest">
              {t('today.feedback.title')}
            </div>
            {FEEDBACK_OPTIONS.map((opt) => {
              const label = t(`today.feedback.${opt.labelKey}` as never);
              return (
                <button
                  key={opt.kind}
                  onClick={() => {
                    onFeedback(opt.kind);
                    setMenuOpen(false);
                    setDismissed(label);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-ink-700 hover:bg-emerald-50 hover:text-emerald-700 focus-ring"
                  role="menuitem"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {dismissed && (
        <div role="status" className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12l4 4L20 6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Thanks — we'll take "{dismissed}" into account for next time.
        </div>
      )}
    </div>
  );
}

/**
 * A compact alternative pick displayed beneath the hero. Same information
 * density as the mobile "rest" cards — small image on the left, title +
 * essentials on the right — so a user can scan a few candidates quickly.
 */
function SecondaryPick({
  index,
  slug,
  title,
  mealType,
  totalMinutes,
  difficulty,
  pantryMatch,
  missing,
  cuisineSeed,
}: {
  index: number;
  slug: string;
  title: string;
  mealType: string;
  totalMinutes: number;
  difficulty: string;
  pantryMatch: number;
  missing: number;
  cuisineSeed: string;
}) {
  return (
    <Link
      href={`/recipes/${slug}`}
      className="group grid grid-cols-[112px_1fr] gap-4 card overflow-hidden lift focus-ring animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <CuisineArt seed={cuisineSeed} size="sm" className="rounded-none h-full min-h-[96px]" />
      <div className="py-3 pr-5 flex flex-col justify-center">
        <div className="text-[10px] uppercase tracking-widest text-ink-400">{mealType}</div>
        <h3 className="font-display text-lg text-ink-900 mt-0.5 leading-tight group-hover:text-emerald-700 transition line-clamp-2">
          {title}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <Chip>
            <ClockIcon /> {totalMinutes} min
          </Chip>
          <Chip>{Math.round(pantryMatch * 100)}%</Chip>
          {missing > 0 && <Chip tone="warn">{missing} missing</Chip>}
          <Chip tone="soft">{difficulty}</Chip>
        </div>
      </div>
    </Link>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'warn' | 'soft' }) {
  const cls =
    tone === 'warn'
      ? 'bg-saffron-500/10 text-saffron-700 border-saffron-500/20'
      : tone === 'soft'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : 'bg-ink-50 text-ink-700 border-ink-100';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card overflow-hidden">
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-2 h-48 bg-ink-50 animate-pulse" />
            <div className="md:col-span-3 p-6">
              <div className="h-3 w-24 bg-ink-100 rounded animate-pulse" />
              <div className="h-6 w-2/3 bg-ink-100 rounded mt-3 animate-pulse" />
              <div className="h-4 w-1/2 bg-ink-100 rounded mt-3 animate-pulse" />
              <div className="mt-6 flex gap-2">
                <div className="h-6 w-16 bg-ink-100 rounded-pill animate-pulse" />
                <div className="h-6 w-12 bg-ink-100 rounded-pill animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
