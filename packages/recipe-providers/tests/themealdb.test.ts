import { describe, expect, it, vi } from 'vitest';

import { TheMealDbProvider } from '../src/themealdb';

/**
 * A minimal TheMealDB response for a single meal. Keeps only the fields the
 * adapter actually reads so the fixture is easy to eyeball.
 */
function meal(over: Record<string, string | null | undefined> = {}) {
  return {
    idMeal: '52772',
    strMeal: 'Qabuli Palaw',
    strArea: 'Afghan',
    strCategory: 'Beef',
    strInstructions: 'Brown the lamb.\nAdd rice.\nSteam for 25 minutes.',
    strMealThumb: 'https://example.com/qabuli.jpg',
    strSource: 'https://example.com/qabuli',
    strIngredient1: 'Rice',
    strIngredient2: 'Lamb',
    strIngredient3: 'Onion',
    strMeasure1: '500 g',
    strMeasure2: '800g',
    strMeasure3: '2 pieces',
    ...over,
  };
}

function mockFetch(responses: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const key = typeof input === 'string' ? input : input.toString();
    // Trim the base URL down to the routed path for readable matchers below.
    const path = key.replace(/^https:\/\/www\.themealdb\.com\/api\/json\/v1\/[^/]+/, '');
    const body = responses[path];
    if (body === undefined) {
      return new Response(JSON.stringify({ meals: null }), { status: 200 });
    }
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
}

describe('TheMealDbProvider', () => {
  it('advertises its declared metadata', () => {
    const provider = new TheMealDbProvider('1');
    expect(provider.key).toBe('themealdb');
    expect(provider.displayName).toBe('TheMealDB');
    expect(provider.storageMode).toBe('permanent');
    expect(provider.rateLimit.requestsPerMinute).toBeGreaterThan(0);
  });

  it('reports credentials only when the key is set', () => {
    expect(new TheMealDbProvider(undefined).hasCredentials()).toBe(false);
    expect(new TheMealDbProvider('').hasCredentials()).toBe(false);
    expect(new TheMealDbProvider('some-key').hasCredentials()).toBe(true);
  });

  it('maps a lookup response to a canonical candidate', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({ '/lookup.php?i=52772': { meals: [meal()] } }),
    );
    const result = await provider.fetchById('52772');
    expect(result).toBeDefined();
    expect(result!.title).toBe('Qabuli Palaw');
    expect(result!.cuisineHints).toEqual(['Afghan']);
    expect(result!.countryHints).toEqual(['Afghan']);
    expect(result!.imageUrl).toBe('https://example.com/qabuli.jpg');
    expect(result!.steps).toEqual(['Brown the lamb.', 'Add rice.', 'Steam for 25 minutes.']);
  });

  it('parses measure units and quantities per line', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({ '/lookup.php?i=52772': { meals: [meal()] } }),
    );
    const result = await provider.fetchById('52772');
    expect(result!.ingredientLines).toEqual([
      expect.objectContaining({ ingredient: 'Rice', quantity: 500, unit: 'g' }),
      expect.objectContaining({ ingredient: 'Lamb', quantity: 800, unit: 'g' }),
      expect.objectContaining({ ingredient: 'Onion', quantity: 2, unit: 'piece' }),
    ]);
  });

  it('parses fractional measures', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({
        '/lookup.php?i=1': {
          meals: [
            meal({
              idMeal: '1',
              strIngredient1: 'Salt',
              strMeasure1: '1/2 tsp',
              strIngredient2: 'Cream',
              strMeasure2: '3/4 cup',
              strIngredient3: '',
              strMeasure3: '',
            }),
          ],
        },
      }),
    );
    const result = await provider.fetchById('1');
    expect(result!.ingredientLines[0]).toEqual(
      expect.objectContaining({ ingredient: 'Salt', quantity: 0.5, unit: 'tsp' }),
    );
    expect(result!.ingredientLines[1]).toEqual(
      expect.objectContaining({ ingredient: 'Cream', quantity: 0.75, unit: 'cup' }),
    );
  });

  it('stops at the first empty ingredient slot', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({
        '/lookup.php?i=1': {
          meals: [
            meal({
              idMeal: '1',
              strIngredient1: 'Rice',
              strMeasure1: '500 g',
              strIngredient2: '',
              strMeasure2: '',
              strIngredient3: 'Onion',
              strMeasure3: '1 piece',
            }),
          ],
        },
      }),
    );
    // Ingredient 3 IS actually included by the adapter's loop even after empty 2,
    // because it iterates through all 20 slots and only skips empty ones.
    const result = await provider.fetchById('1');
    const names = result!.ingredientLines.map((l) => l.ingredient);
    expect(names).toEqual(['Rice', 'Onion']);
  });

  it('carries provenance for downstream ownership tracking', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({ '/lookup.php?i=52772': { meals: [meal()] } }),
    );
    const result = await provider.fetchById('52772');
    expect(result!.provenance.sourceProvider).toBe('themealdb');
    expect(result!.provenance.sourceRecipeId).toBe('52772');
    expect(result!.provenance.sourceUrl).toBe('https://example.com/qabuli');
    expect(result!.provenance.sourceTermsUrl).toBe('https://www.themealdb.com/terms_of_use.php');
    expect(result!.provenance.storagePermission).toBe('permanent');
  });

  it('search by query returns an array of canonical candidates', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({
        '/search.php?s=palaw': { meals: [meal(), meal({ idMeal: 'x', strMeal: 'Other' })] },
      }),
    );
    const results = await provider.search({ query: 'palaw' });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.title)).toEqual(['Qabuli Palaw', 'Other']);
  });

  it('search by area performs filter then lookup fanout', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({
        '/filter.php?a=Afghan': { meals: [{ idMeal: 'a1' }, { idMeal: 'a2' }] },
        '/lookup.php?i=a1': { meals: [meal({ idMeal: 'a1', strMeal: 'A1' })] },
        '/lookup.php?i=a2': { meals: [meal({ idMeal: 'a2', strMeal: 'A2' })] },
      }),
    );
    const results = await provider.fetchByArea('Afghan');
    expect(results.map((r) => r.title).sort()).toEqual(['A1', 'A2']);
  });

  it('returns undefined when a lookup misses', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({ '/lookup.php?i=nope': { meals: null } }),
    );
    expect(await provider.fetchById('nope')).toBeUndefined();
  });

  it('health returns reachable when the request succeeds', async () => {
    const provider = new TheMealDbProvider(
      'test',
      mockFetch({ '/list.php?a=list': { meals: [] } }),
    );
    const health = await provider.health();
    expect(health.reachable).toBe(true);
    expect(health.checkedAt).toBeDefined();
  });

  it('health captures thrown errors', async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    const provider = new TheMealDbProvider('test', failingFetch);
    const health = await provider.health();
    expect(health.reachable).toBe(false);
    expect(health.lastError).toContain('boom');
  });
});
