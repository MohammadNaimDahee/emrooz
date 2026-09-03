import type { Ingredient, Locale } from '@emrooz/types';

/**
 * Build a lookup table from every alias (and canonical name) to the ingredient id.
 * Aliases are lowercased and diacritic-stripped so that "coriander", "Coriander",
 * "coriándre", and "cilantro" all resolve to the same canonical entry.
 */
export function buildAliasIndex(ingredients: Ingredient[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const ing of ingredients) {
    for (const alias of enumerateAliases(ing)) {
      const key = normalizeAlias(alias);
      if (key.length === 0) continue;
      // First writer wins so canonical names (yielded first) take precedence.
      if (!index.has(key)) index.set(key, ing.id);
    }
  }
  return index;
}

function* enumerateAliases(ing: Ingredient): Iterable<string> {
  // Canonical names first so they take precedence in the index.
  for (const localized of Object.values(ing.name)) if (localized) yield localized;
  for (const locale of Object.keys(ing.aliases) as Locale[]) {
    const list = ing.aliases[locale];
    if (list) for (const a of list) yield a;
  }
}

export function normalizeAlias(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveIngredient(index: Map<string, string>, query: string): string | undefined {
  return index.get(normalizeAlias(query));
}
