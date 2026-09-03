'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuthActions } from '../../../lib/auth';
import { useSupabaseSession } from '../../../lib/session';

type Mode = 'password' | 'magic';

export default function SignInClient() {
  const router = useRouter();
  const search = useSearchParams();
  const auth = useAuthActions();
  const session = useSupabaseSession();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bounce out of /auth if the user is already fully signed in.
  useEffect(() => {
    if (session.ready && session.userId && !session.isGuest) {
      router.replace(search.get('next') ?? '/app');
    }
  }, [session, router, search]);

  useEffect(() => {
    const err = search.get('error');
    if (err) setError(err);
  }, [search]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === 'password') {
      const r = await auth.signInWithPassword(email, password);
      if (!r.ok) return setError(r.error ?? 'Sign-in failed.');
      router.replace(search.get('next') ?? '/app');
    } else {
      const r = await auth.sendMagicLink(email);
      if (!r.ok) return setError(r.error ?? 'Failed to send magic link.');
      setNotice(`We sent a sign-in link to ${email}. Check your inbox.`);
    }
  }

  const supabaseDisabled = !session.ready ? false : !session.supabaseEnabled;

  return (
    <div className="mx-auto max-w-md px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">Welcome back</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">Sign in</h1>
      <p className="text-ink-500 mt-2">
        Sync your pantry, favorites, and cooking history across devices.
      </p>

      {supabaseDisabled && (
        <div className="mt-6 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-500">
          Sign-in wires up once Supabase credentials are configured. See{' '}
          <code className="text-ink-700">docs/backend-setup.md</code>. In the meantime, Emrooz
          works fully as a guest.
        </div>
      )}

      {/* Mode toggle */}
      <div
        role="tablist"
        aria-label="Sign in method"
        className="mt-6 inline-flex rounded-pill border border-ink-100 bg-white p-1"
      >
        <button
          role="tab"
          aria-selected={mode === 'password'}
          onClick={() => setMode('password')}
          className={`px-4 py-1.5 text-sm rounded-pill transition focus-ring ${
            mode === 'password' ? 'bg-emerald-700 text-cream-50' : 'text-ink-700'
          }`}
        >
          Password
        </button>
        <button
          role="tab"
          aria-selected={mode === 'magic'}
          onClick={() => setMode('magic')}
          className={`px-4 py-1.5 text-sm rounded-pill transition focus-ring ${
            mode === 'magic' ? 'bg-emerald-700 text-cream-50' : 'text-ink-700'
          }`}
        >
          Magic link
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
          />
        </label>

        {mode === 'password' && (
          <label className="block">
            <span className="text-sm flex justify-between items-baseline">
              <span>Password</span>
              <Link href="/auth/forgot-password" className="text-xs text-emerald-700 hover:underline focus-ring">
                Forgot password?
              </Link>
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={supabaseDisabled || Boolean(auth.pending)}
          className="w-full rounded-pill bg-emerald-700 text-cream-50 px-5 py-3 font-medium hover:bg-emerald-600 focus-ring shadow-card disabled:opacity-50"
        >
          {auth.pending
            ? 'Working…'
            : mode === 'password'
              ? 'Sign in'
              : 'Send magic link'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-500">
        New here?{' '}
        <Link href="/auth/sign-up" className="text-emerald-700 hover:underline focus-ring">
          Create an account
        </Link>
        .
      </p>
    </div>
  );
}
