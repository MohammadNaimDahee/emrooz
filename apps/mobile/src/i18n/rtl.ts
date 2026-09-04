import type Ionicons from '@expo/vector-icons/Ionicons';

import { useTranslator } from './hook';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Direction-aware icon glyph names.
 *
 * React Native's layout system flips `start`/`end` spacing when the locale
 * is RTL (Dari, Pashto), but Ionicons glyphs are graphical bitmaps and do
 * not mirror themselves — a `chevron-back` (`<`) stays as `<` even in RTL,
 * where the natural "back" direction is `>`. This helper picks the correct
 * glyph based on the active locale so back/next/forward chevrons and
 * arrows read correctly in every language.
 *
 * Usage:
 *
 *   const dirIcons = useDirIcons();
 *   <Ionicons name={dirIcons.back} ... />
 *
 * The returned type is compatible with the `name` prop of `Ionicons`.
 */
export function useDirIcons(): {
  back: IoniconName;
  forward: IoniconName;
  arrowBack: IoniconName;
  arrowForward: IoniconName;
} {
  const { direction } = useTranslator();
  const rtl = direction === 'rtl';
  return {
    back: rtl ? 'chevron-forward' : 'chevron-back',
    forward: rtl ? 'chevron-back' : 'chevron-forward',
    arrowBack: rtl ? 'arrow-forward' : 'arrow-back',
    arrowForward: rtl ? 'arrow-back' : 'arrow-forward',
  };
}
