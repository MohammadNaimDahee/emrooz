'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useTranslator } from '../lib/i18n-client';

const STORAGE_KEY = 'emrooz.cookieAck';

/**
 * Minimal essential-cookie disclosure banner.
 *
 * Emrooz V1 does not use analytics, advertising, or any third-party tracking
 * cookies. The only cookies we set are essential — auth session tokens, an
 * anonymous guest identifier, and locally-cached preferences — none of which
 * require consent under the ePrivacy Directive or the GDPR.
 *
 * We show a small, dismissible acknowledgement rather than a consent modal
 * because there is nothing to consent to. It's here so users can see, at a
 * glance, exactly which cookies the app relies on.
 */
export function EssentialCookieBanner(): JSX.Element | null {
  const { t } = useTranslator();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Storage may be blocked; the banner reappears next visit, which is fine.
    }
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="essential-cookies-title"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 rounded-2xl bg-white border border-ink-100 shadow-pop p-4"
    >
      <h2 id="essential-cookies-title" className="font-display text-lg text-ink-900">
        {t('cookies.title')}
      </h2>
      <p className="text-sm text-ink-500 mt-1">
        {t('cookies.body')}{' '}
        <Link href="/privacy" className="text-emerald-700 underline focus-ring">
          {t('cookies.readMore')}
        </Link>
        .
      </p>
      <div className="mt-3 flex justify-end">
        <button
          onClick={dismiss}
          className="rounded-pill bg-emerald-700 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus-ring shadow-card"
        >
          {t('cookies.gotIt')}
        </button>
      </div>
    </div>
  );
}
