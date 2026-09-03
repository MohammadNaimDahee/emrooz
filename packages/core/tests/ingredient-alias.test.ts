import { describe, expect, it } from 'vitest';

import { buildAliasIndex, normalizeAlias, resolveIngredient } from '../src/ingredient-alias';
import type { Ingredient } from '@emrooz/types';

function ing(
  id: string,
  english: string,
  aliases: Partial<Record<'en' | 'de', string[]>> = {},
): Ingredient {
  return {
    id,
    slug: id,
    name: { en: english },
    aliases: { en: [], ...aliases },
    category: 'other',
    commonUnits: [],
    allergens: [],
    dietaryCompatibility: {},
  };
}

describe('normalizeAlias', () => {
  it('lowercases input', () => {
    expect(normalizeAlias('Aubergine')).toBe('aubergine');
  });

  it('strips diacritics', () => {
    expect(normalizeAlias('coriándre')).toBe('coriandre');
    expect(normalizeAlias('crème fraîche')).toBe('creme fraiche');
  });

  it('collapses whitespace and drops punctuation', () => {
    expect(normalizeAlias('  extra-virgin  olive  oil ')).toBe('extra virgin olive oil');
    expect(normalizeAlias('spring/green onion')).toBe('spring green onion');
  });

  it('returns empty for empty and whitespace-only input', () => {
    expect(normalizeAlias('')).toBe('');
    expect(normalizeAlias('   ')).toBe('');
  });
});

describe('buildAliasIndex + resolveIngredient', () => {
  const ingredients: Ingredient[] = [
    ing('eggplant', 'Eggplant', { en: ['aubergine', 'brinjal', 'baingan'] }),
    ing('cilantro', 'Cilantro', { en: ['coriander leaves', 'fresh coriander'] }),
    ing('chickpea', 'Chickpeas', { en: ['garbanzo bean', 'garbanzo beans'] }),
    ing('zucchini', 'Zucchini', { en: ['courgette'] }),
    ing('scallion', 'Scallion', { en: ['green onion', 'spring onion'] }),
    ing('ground_beef', 'Ground beef', { en: ['minced beef', 'beef mince'] }),
  ];

  const index = buildAliasIndex(ingredients);

  it('resolves the canonical English name', () => {
    expect(resolveIngredient(index, 'Eggplant')).toBe('eggplant');
    expect(resolveIngredient(index, 'Chickpeas')).toBe('chickpea');
  });

  it('resolves regional English aliases to the same id', () => {
    // Aubergine and eggplant map to the same canonical id — CLAUDE.md §19.
    expect(resolveIngredient(index, 'aubergine')).toBe('eggplant');
    expect(resolveIngredient(index, 'brinjal')).toBe('eggplant');
    // Coriander leaves and cilantro.
    expect(resolveIngredient(index, 'coriander leaves')).toBe('cilantro');
    // Chickpea + garbanzo.
    expect(resolveIngredient(index, 'garbanzo beans')).toBe('chickpea');
    // Courgette + zucchini.
    expect(resolveIngredient(index, 'Courgette')).toBe('zucchini');
    // Minced + ground meat.
    expect(resolveIngredient(index, 'minced beef')).toBe('ground_beef');
  });

  it('normalises case, whitespace, and punctuation before lookup', () => {
    expect(resolveIngredient(index, '  Aubergine  ')).toBe('eggplant');
    expect(resolveIngredient(index, 'Spring-onion')).toBe('scallion');
  });

  it('returns undefined for unknown ingredients', () => {
    expect(resolveIngredient(index, 'unicorn horn')).toBeUndefined();
  });

  it('canonical name wins over alias on conflict', () => {
    // If someone accidentally lists "eggplant" as an alias of another ingredient,
    // the canonical mapping registered first (via name.en) takes precedence.
    const conflicting: Ingredient[] = [
      ing('eggplant', 'Eggplant'),
      ing('purple_ball', 'Purple ball', { en: ['eggplant'] }),
    ];
    const idx = buildAliasIndex(conflicting);
    expect(resolveIngredient(idx, 'eggplant')).toBe('eggplant');
  });
});
