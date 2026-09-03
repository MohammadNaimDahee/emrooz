export const SUPPORTED_LOCALES = ['en', 'de', 'fa-AF', 'ps'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const RTL_LOCALES: readonly Locale[] = ['fa-AF', 'ps'] as const;

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export type LocalizedText = Partial<Record<Locale, string>> & { en: string };
