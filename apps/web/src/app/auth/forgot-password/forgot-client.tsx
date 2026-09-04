'use client';
import Link from 'next/link';
import { useState } from 'react';

import { useAuthActions } from '../../../lib/auth';
import { useTranslator } from '../../../lib/i18n-client';
import { useSupabaseSession } from '../../../lib/session';

export default function ForgotPasswordClient() {
  const { t } = useTranslator();
  const auth = useAuthActions();
  const session = useSupabaseSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    const r = await auth.sendPasswordReset(email);
    if (!r.ok) return setError(r.error ?? t('auth.error.somethingWrong'));
    setSent(true);
  }

  const supabaseDisabled = session.ready ? !session.supabaseEnabled : false;

  return (
    <div className="mx-auto max-w-md px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">
        {t('auth.forgotPassword.eyebrow')}
      </div>
      <h1 className="font-display text-4xl text-ink-900 mt-1">
        {t('auth.forgotPassword.titleShort')}
      </h1>
      <p className="text-ink-500 mt-2">{t('auth.forgotPassword.subtitleWeb')}</p>

      {supabaseDisabled && (
        <div className="mt-6 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-500">
          {t('auth.forgotPassword.disabledHint.web')}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm">{t('auth.email')}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}
        {sent && (
          <p
            role="status"
            className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2"
          >
            {t('auth.forgotPassword.checkInbox')}
          </p>
        )}

        <button
          type="submit"
          disabled={supabaseDisabled || Boolean(auth.pending)}
          className="w-full rounded-pill bg-emerald-700 text-cream-50 px-5 py-3 font-medium hover:bg-emerald-600 focus-ring shadow-card disabled:opacity-50"
        >
          {auth.pending ? t('auth.forgotPassword.sending') : t('auth.sendResetLink')}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-500">
        {t('auth.forgotPassword.remembered')}{' '}
        <Link href="/auth/sign-in" className="text-emerald-700 hover:underline focus-ring">
          {t('action.signIn')}
        </Link>
        .
      </p>
    </div>
  );
}
