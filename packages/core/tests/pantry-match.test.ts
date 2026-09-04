import { describe, expect, it } from 'vitest';

import { pantryMatch } from '../src/pantry-match';

describe('pantryMatch', () => {
  it('returns 100% when every required ingredient is in the pantry', () => {
    const result = pantryMatch(
      { ingredients: [{ ingredientId: 'a' }, { ingredientId: 'b' }] },
      new Set(['a', 'b']),
    );
    expect(result.ratio).toBe(1);
    expect(result.matched).toEqual(['a', 'b']);
    expect(result.missing).toEqual([]);
  });

  it('returns 50% when half the ingredients are in the pantry', () => {
    const result = pantryMatch(
      { ingredients: [{ ingredientId: 'a' }, { ingredientId: 'b' }] },
      new Set(['a']),
    );
    expect(result.ratio).toBe(0.5);
    expect(result.matched).toEqual(['a']);
    expect(result.missing).toEqual(['b']);
  });

  it('ignores optional ingredients in the ratio', () => {
    const result = pantryMatch(
      {
        ingredients: [
          { ingredientId: 'a' },
          { ingredientId: 'b' },
          { ingredientId: 'garnish', optional: true },
        ],
      },
      new Set(['a', 'b']),
    );
    expect(result.ratio).toBe(1);
    expect(result.matched).not.toContain('garnish');
    expect(result.missing).not.toContain('garnish');
  });

  it('returns 0% when nothing matches', () => {
    const result = pantryMatch(
      { ingredients: [{ ingredientId: 'a' }, { ingredientId: 'b' }] },
      new Set(['c']),
    );
    expect(result.ratio).toBe(0);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(['a', 'b']);
  });

  it('returns 100% for a recipe with only optional ingredients', () => {
    const result = pantryMatch({ ingredients: [{ ingredientId: 'a', optional: true }] }, new Set());
    // No required ingredients ⇒ ratio 1 by definition.
    expect(result.ratio).toBe(1);
  });
});
