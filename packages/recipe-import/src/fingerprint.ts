import type { CanonicalImportCandidate } from '@emrooz/recipe-providers';
import { normalizeAlias } from '@emrooz/core';

/**
 * Deterministic 32-bit content fingerprint used by the deduplication step.
 * Consistent across runs so replay of the same import stays idempotent.
 */
export function fingerprint(candidate: CanonicalImportCandidate): string {
  const parts = [
    normalizeAlias(candidate.title),
    ...candidate.ingredientLines.map((l) => normalizeAlias(l.ingredient)),
    ...candidate.cuisineHints.map(normalizeAlias),
  ];
  return djb2(parts.sort().join('|'));
}

function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
