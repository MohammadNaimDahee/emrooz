import { t as translate, direction as directionFor, type MessageKey } from '@emrooz/i18n';
import { useData } from '../data/context';

export function useTranslator() {
  const { locale } = useData();
  return {
    locale,
    t: (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params),
    direction: directionFor(locale),
  };
}
