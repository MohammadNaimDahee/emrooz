'use client';
import { useEffect, useState } from 'react';
import type { Allergen, DietaryTag, Locale, UserPreferences } from '@emrooz/types';

const CUISINES: Array<[string, string]> = [
  ['cu_afghan', 'Afghan'],
  ['cu_italian', 'Italian'],
  ['cu_japanese', 'Japanese'],
  ['cu_mexican', 'Mexican'],
  ['cu_indian', 'Indian'],
  ['cu_turkish', 'Turkish'],
  ['cu_vietnamese', 'Vietnamese'],
  ['cu_french', 'French'],
  ['cu_ethiopian', 'Ethiopian'],
  ['cu_thai', 'Thai'],
  ['cu_korean', 'Korean'],
  ['cu_brazilian', 'Brazilian'],
  ['cu_greek', 'Greek'],
  ['cu_iranian', 'Iranian'],
  ['cu_moroccan', 'Moroccan'],
  ['cu_german', 'German'],
];

const DIETS: DietaryTag[] = [
  'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher',
  'gluten_free', 'dairy_free', 'egg_free', 'nut_free',
];
const ALLERGENS: Allergen[] = [
  'gluten', 'dairy', 'egg', 'peanut', 'tree_nut', 'soy', 'sesame', 'fish', 'shellfish',
];

const STEPS = ['Language', 'Cuisines', 'Household', 'Time', 'Diet', 'Allergies'] as const;

export default function OnboardingSheet({
  userId,
  onSave,
}: {
  userId: string;
  onSave: (prefs: UserPreferences) => void;
}) {
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<Locale>('en');
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState(2);
  const [maxCookMinutes, setMaxCookMinutes] = useState<number | undefined>(45);
  const [dietary, setDietary] = useState<DietaryTag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && step < STEPS.length - 1) setStep(step + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  function finish() {
    onSave({
      userId,
      language,
      cuisineIds: cuisines,
      householdSize,
      maxCookMinutes,
      dietaryTags: dietary,
      allergens,
      dislikedIngredientIds: [],
      pantrySeedIngredientIds: [],
    });
  }

  function toggle<T>(v: T, list: T[], set: (l: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-up"
    >
      <div className="bg-cream-50 rounded-t-[28px] sm:rounded-[28px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-pop border border-ink-100">
        {/* Progress */}
        <div className="sticky top-0 z-10 bg-cream-50/95 backdrop-blur border-b border-ink-100/60 px-6 pt-5 pb-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-ink-400">
            <span>Getting to know you</span>
            <span>
              {step + 1} of {STEPS.length}
            </span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-ink-100 overflow-hidden">
            <div
              className="h-full bg-emerald-700 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <h2 id="onboarding-title" className="mt-4 font-display text-3xl text-ink-900 leading-tight">
            {stepTitle(step)}
          </h2>
          <p className="text-ink-500 text-sm mt-1">{stepSubtitle(step)}</p>
        </div>

        <div className="px-6 py-6">
          {STEPS[step] === 'Language' && (
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['en', 'English', 'ltr'],
                  ['de', 'Deutsch', 'ltr'],
                  ['fa-AF', 'دری', 'rtl'],
                  ['ps', 'پښتو', 'rtl'],
                ] as const
              ).map(([code, label, dir]) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  aria-pressed={language === code}
                  className={`rounded-2xl border px-5 py-4 text-left transition focus-ring ${
                    language === code
                      ? 'border-emerald-700 bg-emerald-50 shadow-card'
                      : 'border-ink-100 bg-white hover:border-emerald-700'
                  }`}
                >
                  <div className="font-display text-xl" dir={dir === 'rtl' ? 'rtl' : 'ltr'}>
                    {label}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-ink-400 mt-1">{code}</div>
                </button>
              ))}
            </div>
          )}

          {STEPS[step] === 'Cuisines' && (
            <div className="flex flex-wrap gap-2">
              {CUISINES.map(([id, label]) => (
                <ChipButton key={id} active={cuisines.includes(id)} onClick={() => toggle(id, cuisines, setCuisines)}>
                  {label}
                </ChipButton>
              ))}
            </div>
          )}

          {STEPS[step] === 'Household' && (
            <div className="grid grid-cols-6 gap-2 max-w-md">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setHouseholdSize(n)}
                  aria-pressed={householdSize === n}
                  className={`h-16 rounded-xl border font-display text-2xl transition focus-ring ${
                    householdSize === n
                      ? 'bg-emerald-700 text-cream-50 border-emerald-700 shadow-card'
                      : 'bg-white border-ink-100 hover:border-emerald-700'
                  }`}
                >
                  {n === 6 ? '6+' : n}
                </button>
              ))}
            </div>
          )}

          {STEPS[step] === 'Time' && (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 max-w-lg">
              {[20, 30, 45, 60].map((m) => (
                <ChoiceCard
                  key={m}
                  active={maxCookMinutes === m}
                  onClick={() => setMaxCookMinutes(m)}
                  title={`${m} min`}
                  subtitle={m <= 30 ? 'Quick' : m === 60 ? 'Weekend' : 'Weeknight'}
                />
              ))}
              <ChoiceCard
                active={maxCookMinutes === undefined}
                onClick={() => setMaxCookMinutes(undefined)}
                title="No limit"
                subtitle="I've got time"
              />
            </div>
          )}

          {STEPS[step] === 'Diet' && (
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => (
                <ChipButton key={d} active={dietary.includes(d)} onClick={() => toggle(d, dietary, setDietary)}>
                  {d.replace('_', ' ')}
                </ChipButton>
              ))}
            </div>
          )}

          {STEPS[step] === 'Allergies' && (
            <>
              <p className="text-sm text-ink-500 mb-3">
                Emrooz treats allergies as a hard filter. Recipes we can't positively verify as safe
                for you never appear.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => (
                  <ChipButton key={a} active={allergens.includes(a)} onClick={() => toggle(a, allergens, setAllergens)}>
                    {a.replace('_', ' ')}
                  </ChipButton>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-ink-100/60 bg-cream-50/95 backdrop-blur px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => (step === 0 ? finish() : setStep(step - 1))}
            className="text-sm text-ink-500 hover:text-emerald-700 focus-ring px-3 py-2 rounded-lg"
          >
            {step === 0 ? 'Skip for now' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-2 rounded-pill bg-emerald-700 text-cream-50 px-6 py-3 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
              >
                Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={finish}
                className="inline-flex items-center gap-2 rounded-pill bg-saffron-500 text-ink-900 px-6 py-3 text-sm font-semibold hover:bg-saffron-400 focus-ring shadow-card"
              >
                Let's cook
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function stepTitle(i: number): string {
  return [
    'Choose your language',
    'Which cuisines do you love?',
    'How many at the table?',
    'How much time do you have?',
    'Any dietary preferences?',
    'Any allergies?',
  ][i]!;
}

function stepSubtitle(i: number): string {
  return [
    'You can change this any time from settings.',
    'Pick as many as you like. Emrooz will lean toward these — but never at the expense of variety.',
    'This helps us scale ingredient quantities on recipes.',
    "We won't suggest anything that doesn't fit your window.",
    'Optional. Strict restrictions are enforced as hard filters.',
    "These are hard filters — we'll never suggest anything that isn't safe for you.",
  ][i]!;
}

function ChoiceCard({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border px-5 py-4 text-left transition focus-ring ${
        active
          ? 'border-emerald-700 bg-emerald-50 shadow-card'
          : 'border-ink-100 bg-white hover:border-emerald-700'
      }`}
    >
      <div className="font-display text-xl text-ink-900">{title}</div>
      <div className="text-xs uppercase tracking-widest text-ink-400 mt-1">{subtitle}</div>
    </button>
  );
}

function ChipButton({
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
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3.5 py-2 text-sm capitalize transition focus-ring ${
        active
          ? 'bg-emerald-700 text-cream-50 border-emerald-700 shadow-card'
          : 'bg-white text-ink-700 border-ink-100 hover:border-emerald-700 hover:text-emerald-700'
      }`}
    >
      {children}
    </button>
  );
}
