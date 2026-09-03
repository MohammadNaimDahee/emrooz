import { cookies } from 'next/headers';
import {
  t as translate,
  direction as directionFor,
  SUPPORTED_LOCALES,
  type MessageKey,
  type Locale,
} from '@emrooz/i18n';

/**
 * Web i18n locale source of truth: the 'emrooz-locale' cookie.
 * Falls back to 'en' when the cookie is missing or malformed.
 *
 * This mirrors the mobile hook (apps/mobile/src/i18n/hook.ts) in shape:
 * it returns `{ locale, t, direction }` so components can share the same
 * ergonomics on both platforms.
 */

export const LOCALE_COOKIE = 'emrooz-locale';
export const DEFAULT_LOCALE: Locale = 'en';

export function normalizeLocale(raw: string | undefined | null): Locale {
  if (!raw) return DEFAULT_LOCALE;
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : DEFAULT_LOCALE;
}

export type Translator = {
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  direction: 'ltr' | 'rtl';
};

function makeTranslator(locale: Locale): Translator {
  return {
    locale,
    t: (key, params) => translate(locale, key, params),
    direction: directionFor(locale),
  };
}

/**
 * Server-side helper: read the locale cookie and return a translator.
 * Use this in Server Components, route handlers, and metadata generators.
 */
export async function getTranslator(): Promise<Translator> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  return makeTranslator(locale);
}

/**
 * Server helper for callers that only need the raw locale (e.g. to set
 * <html lang> / <html dir>).
 */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/**
 * Build a translator for a known locale — useful when the locale has
 * already been resolved (e.g. via a client context that hydrated from the
 * cookie) and you want the same shape as the server helper.
 */
export function translatorFor(locale: Locale): Translator {
  return makeTranslator(locale);
}

export type { Locale, MessageKey };
