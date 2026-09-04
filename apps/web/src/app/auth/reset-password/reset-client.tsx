'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuthActions } from '../../../lib/auth';
import { useTranslator } from '../../../lib/i18n-client';
import { useSupabaseSession } from '../../../lib/session';

export default function ResetPasswordClient() {
  const { t } = useTranslator();
  const router = useRouter();
  const auth = useAuthActions();
  const session = useSupabaseSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(t('auth.error.shortPassword'));
    if (password !== confirm) return setError(t('auth.error.mismatch'));
    const r = await auth.updatePassword(password);
    if (!r.ok) return setError(r.error ?? t('auth.resetPassword.updateFailed'));
    router.replace('/app');
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-10 pb-16">
      <div className="text-xs uppercase tracking-widest text-ink-400">{t('auth.resetPassword.eyebrow')}</div>
      <h1 className="font-display text-4xl text-ink-900 mt-1">{t('auth.resetPassword.title')}</h1>

      {session.ready && !session.userId && (
        <div className="mt-6 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-500">
          {t('auth.resetPassword.expiredIntro')}
          <a href="/auth/forgot-password" className="text-emerald-700 underline focus-ring">
            {t('auth.resetPassword.expiredLink')}
          </a>
          .
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm">{t('auth.resetPassword.newPassword')}</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
          />
        </label>
        <label className="block">
          <span className="text-sm">{t('auth.confirmPassword')}</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-100 bg-white px-3 py-2 focus-ring"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={Boolean(auth.pending)}
          className="w-full rounded-pill bg-emerald-700 text-cream-50 px-5 py-3 font-medium hover:bg-emerald-600 focus-ring shadow-card disabled:opacity-50"
        >
          {auth.pending ? t('auth.resetPassword.saving') : t('auth.resetPassword.submit')}
        </button>
      </form>
    </div>
  );
}
