import type { Locale } from '@emrooz/types';
import { isRtl, SUPPORTED_LOCALES } from '@emrooz/types';

import en from './translations/en';
import de from './translations/de';
import faAF from './translations/fa-AF';
import ps from './translations/ps';

export type MessageKey = keyof typeof en;
/**
 * A locale dictionary. Only English is guaranteed to have every key —
 * German, Dari, and Pashto are draft translations and may lag behind
 * en.ts by a handful of keys when new UI copy lands. The `t()` runtime
 * fallback (see below) transparently uses the English value when a key
 * is missing from the active dictionary, so this permissive shape is
 * both honest and safe.
 *
 * CLAUDE.md §10.1 requires new keys to be added to all four dictionaries
 * in the same commit; `Partial` is a pragmatic safety net, not a license
 * to skip translations.
 */
export type Messages = Partial<Record<MessageKey, string>> & { [key: string]: string };
export type MessagesTree = Record<Locale, Messages>;

/** Draft translations that still need native-speaker verification. */
export const DRAFT_LOCALES: readonly Locale[] = ['de', 'fa-AF', 'ps'];

export const messages: MessagesTree = {
  en,
  de,
  'fa-AF': faAF,
  ps,
};

export function t(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const dict = messages[locale] ?? en;
  const raw = dict[key] ?? en[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

/**
 * List translation keys that exist in en.ts but are missing from a given
 * dictionary. Useful in tests and CI checks; a value of 0 across all
 * draft locales is the target state per CLAUDE.md §10.1.
 */
export function missingKeys(locale: Locale): MessageKey[] {
  const dict = messages[locale];
  if (!dict) return Object.keys(en) as MessageKey[];
  return (Object.keys(en) as MessageKey[]).filter((k) => !(k in dict));
}

export function direction(locale: Locale): 'ltr' | 'rtl' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

export function localeMetadata(locale: Locale): {
  code: Locale;
  displayName: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  needsReview: boolean;
} {
  return LOCALE_METADATA[locale];
}

export const LOCALE_METADATA: Record<
  Locale,
  {
    code: Locale;
    displayName: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
    needsReview: boolean;
  }
> = {
  en: {
    code: 'en',
    displayName: 'English',
    nativeName: 'English',
    direction: 'ltr',
    needsReview: false,
  },
  de: {
    code: 'de',
    displayName: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    needsReview: true,
  },
  'fa-AF': {
    code: 'fa-AF',
    displayName: 'Dari',
    nativeName: 'دری',
    direction: 'rtl',
    needsReview: true,
  },
  ps: {
    code: 'ps',
    displayName: 'Pashto',
    nativeName: 'پښتو',
    direction: 'rtl',
    needsReview: true,
  },
};

export { SUPPORTED_LOCALES };
export type { Locale };
