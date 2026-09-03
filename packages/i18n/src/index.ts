import type { Locale } from '@emrooz/types';
import { isRtl, SUPPORTED_LOCALES } from '@emrooz/types';

import en from './translations/en';
import de from './translations/de';
import faAF from './translations/fa-AF';
import ps from './translations/ps';

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export type MessagesTree = Record<Locale, Messages>;

/** Draft translations that still need native-speaker verification. */
export const DRAFT_LOCALES: readonly Locale[] = ['de', 'fa-AF', 'ps'];

export const messages: MessagesTree = {
  en,
  de,
  'fa-AF': faAF,
  ps,
};

export function t(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const dict = messages[locale] ?? en;
  const raw = dict[key] ?? en[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
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
  en: { code: 'en', displayName: 'English', nativeName: 'English', direction: 'ltr', needsReview: false },
  de: { code: 'de', displayName: 'German', nativeName: 'Deutsch', direction: 'ltr', needsReview: true },
  'fa-AF': {
    code: 'fa-AF',
    displayName: 'Dari',
    nativeName: 'دری',
    direction: 'rtl',
    needsReview: true,
  },
  ps: { code: 'ps', displayName: 'Pashto', nativeName: 'پښتو', direction: 'rtl', needsReview: true },
};

export { SUPPORTED_LOCALES };
export type { Locale };
