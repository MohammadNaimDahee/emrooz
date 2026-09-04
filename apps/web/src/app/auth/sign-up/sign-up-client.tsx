'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuthActions } from '../../../lib/auth';
import { useTranslator } from '../../../lib/i18n-client';
import { useSupabaseSession } from '../../../lib/session';

export default function SignUpClient() {
  const { t } = useTranslator();
  const router = useRouter();
  const auth = useAuthActions();
  const session = useSupabaseSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session.ready && session.userId && !session.isGuest) router.replace('/app');
  }, [session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) return setError(t('auth.error.shortPassword'));
    const r = await auth.signUp(email, password);
    if (!r.ok) return setError(r.error ?? t('auth.error.signUpFailed'));
    if (r.needsVerification) {
      setNotice(t('auth.signUp.confirmSentLong', { email }));
    } else {
      // Confirmation is off in this environment — proceed straight to the app.
      router.replace('/app');
    }
  }

  const supabaseDisabled = session.ready ? !session.supabaseEnabled : false;

  return (
    <div className="mx-auto max-w-md px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">{t('auth.signUp.eyebrow')}</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 mt-1">{t('auth.signUp.titleShort')}</h1>
      <p className="text-ink-500 mt-2">
        {t('auth.signUp.subtitleWeb')}
      </p>

      {supabaseDisabled && (
        <div className="mt-6 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-500">
          {t('auth.signUp.disabledHint.web', { code: 'docs/backend-setup.md' })}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm">{t('auth.email')}</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
          />
        </label>
        <label className="block">
          <span className="text-sm">{t('auth.password')}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
          />
          <span className="text-xs text-ink-400 mt-1 block">{t('auth.signUp.passwordHint')}</span>
        </label>

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
          {auth.pending ? t('auth.working') : t('action.signUp')}
        </button>

        <p className="text-xs text-ink-500">
          {t('auth.signUp.terms.prefix')}{' '}
          <Link href="/terms" className="underline focus-ring">{t('auth.signUp.terms.terms')}</Link>{' '}
          {t('auth.signUp.terms.and')}{' '}
          <Link href="/privacy" className="underline focus-ring">{t('auth.signUp.terms.privacy')}</Link>
          {t('auth.signUp.terms.dot')}
        </p>
      </form>

      <p className="mt-6 text-sm text-ink-500">
        {t('auth.signUp.alreadyHave')}{' '}
        <Link href="/auth/sign-in" className="text-emerald-700 hover:underline focus-ring">
          {t('auth.signUp.signInLink')}
        </Link>
        .
      </p>
    </div>
  );
}
