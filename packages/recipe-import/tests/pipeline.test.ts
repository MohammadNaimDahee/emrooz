import { describe, expect, it } from 'vitest';
import type { CanonicalImportCandidate } from '@emrooz/recipe-providers';
import type { Ingredient } from '@emrooz/types';

import { stage } from '../src/pipeline';

const INGREDIENTS: Ingredient[] = [
  {
    id: 'rice',
    slug: 'rice',
    name: { en: 'Rice' },
    aliases: { en: [] },
    category: 'grain',
    commonUnits: [],
    allergens: [],
    dietaryCompatibility: {},
  },
  {
    id: 'eggplant',
    slug: 'eggplant',
    name: { en: 'Eggplant' },
    aliases: { en: ['aubergine', 'brinjal'] },
    category: 'vegetable',
    commonUnits: [],
    allergens: [],
    dietaryCompatibility: {},
  },
  {
    id: 'lamb',
    slug: 'lamb',
    name: { en: 'Lamb' },
    aliases: { en: [] },
    category: 'meat',
    commonUnits: [],
    allergens: [],
    dietaryCompatibility: {},
  },
];

function candidate(over: Partial<CanonicalImportCandidate>): CanonicalImportCandidate {
  return {
    providerRecipeId: over.providerRecipeId ?? 'p1',
    title: over.title ?? 'Untitled',
    cuisineHints: over.cuisineHints ?? [],
    countryHints: over.countryHints ?? [],
    regionHints: over.regionHints ?? [],
    ingredientLines: over.ingredientLines ?? [
      { raw: '', ingredient: 'Rice' },
      { raw: '', ingredient: 'Lamb' },
    ],
    steps: over.steps ?? ['Cook.'],
    provenance: over.provenance ?? {
      contentOwner: 'test',
      ownershipType: 'licensed',
      storagePermission: 'permanent',
    },
  };
}

describe('stage', () => {
  it('resolves canonical + alias ingredients', () => {
    const results = stage(
      [
        candidate({
          providerRecipeId: 'r1',
          title: 'Baingan bharta',
          ingredientLines: [
            { raw: '', ingredient: 'Aubergine' },
            { raw: '', ingredient: 'RICE' },
          ],
        }),
      ],
      { ingredients: INGREDIENTS },
    );

    expect(results).toHaveLength(1);
    const first = results[0]!;
    expect(first.normalized?.resolvedIngredientIds).toEqual(['eggplant', 'rice']);
    expect(first.normalized?.unmatchedIngredientNames).toEqual([]);
  });

  it('records unmatched ingredient names but does not fail the pipeline', () => {
    const results = stage(
      [
        candidate({
          providerRecipeId: 'r2',
          ingredientLines: [
            { raw: '', ingredient: 'Rice' },
            { raw: '', ingredient: 'Wolfsbane' },
          ],
        }),
      ],
      { ingredients: INGREDIENTS },
    );
    const first = results[0]!;
    expect(first.normalized?.resolvedIngredientIds).toEqual(['rice', null]);
    expect(first.normalized?.unmatchedIngredientNames).toEqual(['Wolfsbane']);
    expect(first.stage).toBe('ready');
  });

  it('flags empty titles, empty ingredients, and empty steps as problems', () => {
    const results = stage(
      [
        candidate({
          providerRecipeId: 'r3',
          title: '',
          ingredientLines: [],
          steps: [],
        }),
      ],
      { ingredients: INGREDIENTS },
    );
    const first = results[0]!;
    expect(first.problems).toEqual(
      expect.arrayContaining(['missing title', 'no ingredients', 'no steps']),
    );
  });

  it('refuses candidates whose provenance forbids storage', () => {
    const results = stage(
      [
        candidate({
          providerRecipeId: 'r4',
          provenance: {
            contentOwner: 'test',
            ownershipType: 'external_link_only',
            storagePermission: 'not_permitted',
          },
        }),
      ],
      { ingredients: INGREDIENTS },
    );
    expect(results[0]?.problems).toEqual(
      expect.arrayContaining(['provider forbids storage — use external_link_only']),
    );
  });

  it('marks the second identical candidate as a duplicate', () => {
    const first = candidate({ providerRecipeId: 'a' });
    const dup = candidate({ providerRecipeId: 'b' }); // same content ⇒ same fingerprint
    const results = stage([first, dup], { ingredients: INGREDIENTS });
    expect(results[0]!.stage).not.toBe('duplicate');
    expect(results[1]!.stage).toBe('duplicate');
    expect(results[1]!.duplicateOf).toBeDefined();
  });

  it('marks a candidate that matches a known fingerprint as a duplicate', () => {
    const c = candidate({ providerRecipeId: 'a' });
    // Compute the fingerprint by staging once and passing it as known input.
    const first = stage([c], { ingredients: INGREDIENTS })[0]!;
    const known = new Set([first.fingerprint]);

    const secondRun = stage([c], { ingredients: INGREDIENTS, knownFingerprints: known });
    expect(secondRun[0]!.stage).toBe('duplicate');
  });

  it('does not mark distinct candidates as duplicates', () => {
    const a = candidate({ providerRecipeId: 'a', title: 'Rice pilaf' });
    const b = candidate({
      providerRecipeId: 'b',
      title: 'Baingan bharta',
      ingredientLines: [{ raw: '', ingredient: 'Aubergine' }],
    });
    const results = stage([a, b], { ingredients: INGREDIENTS });
    expect(results[0]!.stage).not.toBe('duplicate');
    expect(results[1]!.stage).not.toBe('duplicate');
  });
});
