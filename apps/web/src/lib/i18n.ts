import {
  t as translate,
  direction as directionFor,
  SUPPORTED_LOCALES,
  type MessageKey,
  type Locale,
} from '@emrooz/i18n';

/**
 * Client-safe i18n primitives. This file MUST NOT import `next/headers`
 * or any other server-only API — client components import `Translator`
 * and `DEFAULT_LOCALE` from here via `i18n-client.tsx`, and pulling in
 * `cookies()` here would poison the client bundle:
 *
 *   Build Error: You're importing a component that needs "next/headers".
 *   That only works in a Server Component.
 *
 * Server-side helpers that read the locale cookie live in `i18n-server.ts`.
 */

export const LOCALE_COOKIE = 'emrooz-locale';
export const DEFAULT_LOCALE: Locale = 'en';

export function normalizeLocale(raw: string | undefined | null): Locale {
  if (!raw) return DEFAULT_LOCALE;
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : DEFAULT_LOCALE;
}

export type Translator = {
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  direction: 'ltr' | 'rtl';
};

/**
 * Build a translator for a known locale. Client components typically use
 * `useTranslator()` from `i18n-client.tsx`, which wraps this. Server
 * components call `getTranslator()` from `i18n-server.ts`, which reads
 * the cookie and then calls this.
 */
export function translatorFor(locale: Locale): Translator {
  return {
    locale,
    t: (key, params) => translate(locale, key, params),
    direction: directionFor(locale),
  };
}

export type { Locale, MessageKey };
