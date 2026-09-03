'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  t as translate,
  direction as directionFor,
  type MessageKey,
  type Locale,
} from '@emrooz/i18n';
import { DEFAULT_LOCALE, type Translator } from './i18n';

/**
 * Client-side i18n. The locale is read from the 'emrooz-locale' cookie on
 * the server and passed down through <LocaleProvider> in the root layout,
 * so client components can call useTranslator() without touching cookies
 * themselves.
 *
 * Signature mirrors apps/mobile/src/i18n/hook.ts.
 */

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useTranslator(): Translator {
  const locale = useContext(LocaleContext);
  return useMemo(
    () => ({
      locale,
      t: (key: MessageKey, params?: Record<string, string | number>) =>
        translate(locale, key, params),
      direction: directionFor(locale),
    }),
    [locale],
  );
}
