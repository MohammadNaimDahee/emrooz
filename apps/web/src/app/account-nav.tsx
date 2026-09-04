'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAuthActions } from '../lib/auth';
import { useTranslator } from '../lib/i18n-client';
import { useSupabaseSession } from '../lib/session';
import { getBrowserSupabase } from '../lib/supabase-browser';

/**
 * Auth-aware nav slot for the site header. Renders a Sign-in link for
 * unauthenticated (or anonymous) sessions, and an account menu with sign-out
 * once the user is fully signed in with an email.
 */
export function AccountNav() {
  const { t } = useTranslator();
  const session = useSupabaseSession();
  const auth = useAuthActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Fetch the current email lazily — the session hook only carries id + guest flag.
  useEffect(() => {
    if (!session.userId || session.isGuest) {
      setEmail(null);
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [session]);

  if (!session.ready) return null;

  // Demo mode: link to the auth pages anyway. They render a friendly
  // "Sign-in wires up once Supabase credentials are configured" panel,
  // which is clearer than hiding the affordance entirely.
  if (!session.supabaseEnabled) {
    return (
      <Link
        href="/auth/sign-in"
        className="text-sm text-ink-500 hover:text-emerald-700 focus-ring px-3 py-2 rounded-lg"
      >
        {t('action.signIn')}
      </Link>
    );
  }

  if (session.isGuest) {
    return (
      <Link
        href="/auth/sign-in"
        className="text-sm text-ink-700 hover:text-emerald-700 focus-ring px-3 py-2 rounded-lg"
      >
        {t('action.signIn')}
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-pill border border-ink-100 bg-white px-3 py-1.5 text-sm hover:border-emerald-700 focus-ring"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="grid place-items-center w-6 h-6 rounded-full bg-emerald-700 text-cream-50 text-xs font-bold"
          aria-hidden="true"
        >
          {(email?.[0] ?? '?').toUpperCase()}
        </span>
        <span className="hidden sm:inline max-w-[10rem] truncate">
          {email ?? t('accountNav.account')}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-pop border border-ink-100 p-1 z-20 text-sm"
        >
          <Link
            href="/settings"
            className="block px-3 py-2 rounded-lg text-ink-700 hover:bg-emerald-50 hover:text-emerald-700 focus-ring"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {t('nav.settings')}
          </Link>
          <Link
            href="/history"
            className="block px-3 py-2 rounded-lg text-ink-700 hover:bg-emerald-50 hover:text-emerald-700 focus-ring"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {t('nav.history')}
          </Link>
          <div className="my-1 h-px bg-ink-100" />
          <button
            onClick={async () => {
              setOpen(false);
              await auth.signOut();
              router.replace('/');
            }}
            className="block w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-400/10 focus-ring"
            role="menuitem"
          >
            {t('action.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
