import 'server-only';
import { cookies } from 'next/headers';

import { LOCALE_COOKIE, normalizeLocale, translatorFor, type Locale, type Translator } from './i18n';

/**
 * Server-only i18n helpers. Isolated from the client-safe `i18n.ts` so
 * client components can import `Translator` / `DEFAULT_LOCALE` without
 * dragging `next/headers` into their bundle.
 *
 * Use these in Server Components, route handlers, `generateMetadata`,
 * server actions, and anywhere else that runs only on the server.
 */

/** Read the locale cookie and return a translator ready to use. */
export async function getTranslator(): Promise<Translator> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  return translatorFor(locale);
}

/** Read just the resolved locale, e.g. to set <html lang> / <html dir>. */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}
