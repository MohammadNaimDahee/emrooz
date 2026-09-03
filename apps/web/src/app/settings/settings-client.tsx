'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { Allergen, DietaryTag, Locale, UserPreferences } from '@emrooz/types';

import { useAuthActions } from '../../lib/auth';
import { getData } from '../../lib/data';
import { useGuestId } from '../../lib/guest';
import { usePreferences } from '../../lib/prefs-client';
import { useSupabaseSession } from '../../lib/session';
import { getBrowserSupabase } from '../../lib/supabase-browser';

const LANGS: { code: Locale; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'fa-AF', label: 'دری', dir: 'rtl' },
  { code: 'ps', label: 'پښتو', dir: 'rtl' },
];
const DIETS: DietaryTag[] = ['vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher', 'gluten_free', 'dairy_free', 'egg_free', 'nut_free'];
const ALLERGENS: Allergen[] = ['gluten', 'dairy', 'egg', 'peanut', 'tree_nut', 'soy', 'sesame', 'fish', 'shellfish'];

export default function SettingsClient() {
  const data = getData();
  const userId = useGuestId();
  const { prefs, save } = usePreferences(userId);
  const session = useSupabaseSession();
  const auth = useAuthActions();
  const router = useRouter();
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!session.userId || session.isGuest) {
      setAccountEmail(null);
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setAccountEmail(data.user?.email ?? null));
  }, [session]);

  const [language, setLanguage] = useState<Locale>('en');
  const [household, setHousehold] = useState(2);
  const [maxCookMinutes, setMaxCookMinutes] = useState<number | undefined>(undefined);
  const [diets, setDiets] = useState<DietaryTag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState('17:00');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!prefs) return;
    setLanguage(prefs.language);
    setHousehold(prefs.householdSize);
    setMaxCookMinutes(prefs.maxCookMinutes);
    setDiets(prefs.dietaryTags);
    setAllergens(prefs.allergens);
    setReminderOn(prefs.reminder?.enabled ?? false);
    setReminderTime(prefs.reminder?.time ?? '17:00');
  }, [prefs]);

  function toggle<T>(v: T, list: T[], setter: (l: T[]) => void) {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function apply() {
    if (!userId) return;
    const next: UserPreferences = {
      userId,
      language,
      cuisineIds: prefs?.cuisineIds ?? [],
      householdSize: household,
      maxCookMinutes,
      dietaryTags: diets,
      allergens,
      dislikedIngredientIds: prefs?.dislikedIngredientIds ?? [],
      pantrySeedIngredientIds: prefs?.pantrySeedIngredientIds ?? [],
      preferredDifficulty: prefs?.preferredDifficulty,
      reminder: reminderOn ? { enabled: true, time: reminderTime } : { enabled: false, time: reminderTime },
      onboardedAt: prefs?.onboardedAt ?? new Date().toISOString(),
    };
    save(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function exportData() {
    if (!userId) return;
    if (session.supabaseEnabled) {
      // Server-side export — hits /api/account/export which reads through the
      // caller's own RLS-scoped session.
      const res = await fetch('/api/account/export', { credentials: 'include' });
      if (!res.ok) {
        alert(`Export failed (${res.status}). Please try again.`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emrooz-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }

    // Demo mode: fall back to a local dump.
    const [profile, prefsC, pantry, favorites, history, feedback, planner, list] = await Promise.all([
      data.profile.get(userId),
      data.preferences.get(userId),
      data.pantry.list(userId),
      data.favorites.list(userId),
      data.history.list(userId),
      data.feedback.list(userId),
      data.planner.listForRange(userId, '1970-01-01', '2999-12-31'),
      data.shoppingList.list(userId),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      preferences: prefsC,
      pantry,
      favorites,
      history,
      feedback,
      planner,
      shoppingList: list,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emrooz-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!userId) return;

    if (session.supabaseEnabled) {
      const typed = prompt(
        'This permanently removes your account and everything in it (pantry, favorites, history, planner, shopping list, feedback, preferences).\n\nType DELETE to confirm.',
      );
      if (typed !== 'DELETE') return;
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Delete failed: ${body.error ?? res.status}`);
        return;
      }
      localStorage.removeItem('emrooz.guestId');
      localStorage.removeItem('emrooz.prefs');
      localStorage.removeItem('emrooz.migrated');
      window.location.href = '/';
      return;
    }

    // Demo mode: local reset.
    if (!confirm('Delete all local data? This clears your guest identity, pantry, favorites, history, feedback, planner, and shopping list. This cannot be undone.')) return;
    await data.pantry.clear(userId);
    await data.shoppingList.clear(userId);
    for (const h of await data.history.list(userId)) await data.history.remove(userId, h.id);
    for (const f of await data.favorites.list(userId)) await data.favorites.remove(userId, f.recipeId);
    for (const p of await data.planner.listForRange(userId, '1970-01-01', '2999-12-31')) {
      await data.planner.remove(userId, p.id);
    }
    localStorage.removeItem('emrooz.guestId');
    localStorage.removeItem('emrooz.prefs');
    window.location.href = '/';
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">Preferences</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">Settings</h1>

      <div className="mt-8 space-y-6">
        {session.supabaseEnabled && (
          <Section
            title="Account"
            hint={
              accountEmail
                ? 'Signed in. Your data syncs across every device you use.'
                : "You're a guest. Create an account to sync your pantry, favorites, and history."
            }
          >
            {accountEmail ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid place-items-center w-10 h-10 rounded-full bg-emerald-700 text-cream-50 font-semibold">
                  {(accountEmail[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-900 truncate">{accountEmail}</div>
                  <div className="text-xs text-ink-500">Signed in</div>
                </div>
                <button
                  onClick={async () => {
                    await auth.signOut();
                    router.replace('/');
                  }}
                  className="rounded-pill border border-ink-200 px-4 py-2 text-sm hover:border-emerald-700 hover:text-emerald-700 focus-ring"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/auth/sign-in"
                  className="rounded-pill bg-emerald-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded-pill border border-ink-200 px-4 py-2 text-sm hover:border-emerald-700 hover:text-emerald-700 focus-ring"
                >
                  Create account
                </Link>
              </div>
            )}
          </Section>
        )}

        <Section title="Language" hint="Right-to-left languages flip the UI direction.">
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <Chip key={l.code} active={language === l.code} onClick={() => setLanguage(l.code)}>
                <span dir={l.dir}>{l.label}</span>
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Household size" hint="We scale ingredient quantities to your table.">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={20}
              value={household}
              onChange={(e) => setHousehold(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-md border border-ink-100 px-3 py-2 tabular-nums focus-ring"
            />
            <span className="text-ink-500 text-sm">{household === 1 ? 'person' : 'people'}</span>
          </div>
        </Section>

        <Section title="Time you usually have" hint="We won't suggest anything outside this window.">
          <div className="flex flex-wrap gap-2">
            {[20, 30, 45, 60].map((m) => (
              <Chip key={m} active={maxCookMinutes === m} onClick={() => setMaxCookMinutes(m)}>
                {m} min
              </Chip>
            ))}
            <Chip active={maxCookMinutes === undefined} onClick={() => setMaxCookMinutes(undefined)}>
              No limit
            </Chip>
          </div>
        </Section>

        <Section title="Dietary preferences" hint="Strict restrictions are enforced as hard filters.">
          <div className="flex flex-wrap gap-2">
            {DIETS.map((d) => (
              <Chip key={d} active={diets.includes(d)} onClick={() => toggle(d, diets, setDiets)}>
                {d.replace('_', ' ')}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Allergies" hint="Recipes we can't positively verify as safe for you never appear.">
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <Chip key={a} active={allergens.includes(a)} onClick={() => toggle(a, allergens, setAllergens)}>
                {a.replace('_', ' ')}
              </Chip>
            ))}
          </div>
        </Section>

        <Section
          title="Daily reminder"
          hint={"“Not sure what to cook? Emrooz has today’s ideas ready.”"}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reminderOn}
                onChange={(e) => setReminderOn(e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
              Enable reminder
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!reminderOn}
              className="rounded-md border border-ink-100 px-3 py-2 tabular-nums focus-ring disabled:opacity-50"
            />
            <span className="text-xs text-ink-400">
              Local notifications are delivered by the mobile app on your device.
            </span>
          </div>
        </Section>

        <div className="flex gap-3 items-center">
          <button
            onClick={apply}
            className="rounded-pill bg-emerald-700 text-cream-50 px-5 py-3 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
          >
            Save changes
          </button>
          {saved && <span className="text-sm text-emerald-700">Saved.</span>}
        </div>

        <Section title="Your data" hint="Export a JSON snapshot or delete everything stored locally.">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportData}
              className="rounded-pill border border-ink-200 px-4 py-2 text-sm hover:border-emerald-700 hover:text-emerald-700 focus-ring"
            >
              Export my data
            </button>
            <button
              onClick={deleteAccount}
              className="rounded-pill border border-rose-400/40 text-rose-400 px-4 py-2 text-sm hover:bg-rose-400/10 focus-ring"
            >
              Delete my data
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-ink-900">{title}</h2>
      </div>
      {hint && <p className="text-sm text-ink-500 mt-1">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
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
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill border px-3 py-1.5 text-sm capitalize focus-ring transition ${
        active
          ? 'bg-emerald-700 text-cream-50 border-emerald-700'
          : 'bg-white text-ink-700 border-ink-100 hover:border-emerald-700 hover:text-emerald-700'
      }`}
    >
      {children}
    </button>
  );
}
