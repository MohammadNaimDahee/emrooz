import { describe, expect, it } from 'vitest';
import type { CanonicalImportCandidate } from '@emrooz/recipe-providers';

import { fingerprint } from '../src/fingerprint';

function candidate(over: Partial<CanonicalImportCandidate> = {}): CanonicalImportCandidate {
  return {
    providerRecipeId: over.providerRecipeId ?? '52772',
    title: over.title ?? 'Qabuli Palaw',
    description: over.description,
    cuisineHints: over.cuisineHints ?? ['Afghan'],
    countryHints: over.countryHints ?? [],
    regionHints: over.regionHints ?? [],
    imageUrl: over.imageUrl,
    imageAllowsStorage: over.imageAllowsStorage,
    ingredientLines: over.ingredientLines ?? [
      { raw: '500g rice', ingredient: 'Rice', quantity: 500, unit: 'g' },
      { raw: '800g lamb', ingredient: 'Lamb', quantity: 800, unit: 'g' },
    ],
    steps: over.steps ?? ['Brown lamb.', 'Layer with rice.'],
    provenance: over.provenance ?? {
      contentOwner: 'test',
      ownershipType: 'licensed',
      storagePermission: 'permanent',
    },
  };
}

describe('fingerprint', () => {
  it('is deterministic for equivalent input', () => {
    const a = candidate();
    const b = candidate();
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('is stable against ingredient order changes (sort-based)', () => {
    const a = candidate({
      ingredientLines: [
        { raw: '500g rice', ingredient: 'Rice' },
        { raw: '800g lamb', ingredient: 'Lamb' },
      ],
    });
    const b = candidate({
      ingredientLines: [
        { raw: '800g lamb', ingredient: 'Lamb' },
        { raw: '500g rice', ingredient: 'Rice' },
      ],
    });
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('is stable against case and whitespace variation', () => {
    const a = candidate({
      title: '  Qabuli   Palaw  ',
      ingredientLines: [
        { raw: 'RICE', ingredient: 'RICE' },
        { raw: 'lamb', ingredient: 'lamb' },
      ],
    });
    const b = candidate();
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('differs when the title changes materially', () => {
    const a = candidate({ title: 'Qabuli Palaw' });
    const b = candidate({ title: 'Mantu' });
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it('differs when the ingredient set changes', () => {
    const a = candidate();
    const b = candidate({
      ingredientLines: [
        ...a.ingredientLines,
        { raw: '2 pieces onion', ingredient: 'Onion' },
      ],
    });
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it('produces a compact 8-char hex string', () => {
    expect(fingerprint(candidate())).toMatch(/^[0-9a-f]{8}$/);
  });
});
