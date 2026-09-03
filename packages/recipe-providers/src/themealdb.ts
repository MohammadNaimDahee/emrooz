import type { Provenance } from '@emrooz/types';
import type {
  CanonicalImportCandidate,
  ProviderHealth,
  ProviderRateLimit,
  ProviderSearchParams,
  RecipeProvider,
} from './interface';

/**
 * TheMealDB provider. Terms last reviewed 2026-09-02 (CLAUDE.md §26).
 *
 * The public test key "1" is dev-only. A production supporter key is required
 * before shipping to app stores. Storage of returned canonical content is
 * currently permitted subject to attribution and periodic terms re-review.
 */
export class TheMealDbProvider implements RecipeProvider {
  readonly key = 'themealdb';
  readonly displayName = 'TheMealDB';
  readonly rateLimit: ProviderRateLimit = { requestsPerMinute: 20, requestsPerDay: 20_000 };
  readonly storageMode = 'permanent' as const;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl = 'https://www.themealdb.com/api/json/v1',
  ) {}

  hasCredentials(): boolean {
    return Boolean(this.apiKey);
  }

  async health(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const res = await this.request(`/list.php?a=list`);
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return { reachable: false, latencyMs, lastError: `HTTP ${res.status}`, checkedAt: new Date().toISOString() };
      }
      return { reachable: true, latencyMs, checkedAt: new Date().toISOString() };
    } catch (err) {
      return { reachable: false, lastError: String(err), checkedAt: new Date().toISOString() };
    }
  }

  async search(params: ProviderSearchParams): Promise<CanonicalImportCandidate[]> {
    if (params.area) return this.fetchByArea(params.area);
    if (params.query) {
      const data = await this.requestJson<{ meals: RawMeal[] | null }>(
        `/search.php?s=${encodeURIComponent(params.query)}`,
      );
      return (data.meals ?? []).map((m) => this.toCanonical(m));
    }
    return [];
  }

  async fetchById(id: string): Promise<CanonicalImportCandidate | undefined> {
    const data = await this.requestJson<{ meals: RawMeal[] | null }>(
      `/lookup.php?i=${encodeURIComponent(id)}`,
    );
    const meal = data.meals?.[0];
    return meal ? this.toCanonical(meal) : undefined;
  }

  async fetchByArea(area: string): Promise<CanonicalImportCandidate[]> {
    // Filter endpoint returns id+title+image only; we look each up for full data.
    const list = await this.requestJson<{ meals: Array<{ idMeal: string }> | null }>(
      `/filter.php?a=${encodeURIComponent(area)}`,
    );
    if (!list.meals) return [];
    const full = await Promise.all(list.meals.map((m) => this.fetchById(m.idMeal)));
    return full.filter((x): x is CanonicalImportCandidate => Boolean(x));
  }

  private requestJson<T>(path: string): Promise<T> {
    return this.request(path).then((r) => {
      if (!r.ok) throw new Error(`TheMealDB request failed: ${r.status}`);
      return r.json() as Promise<T>;
    });
  }

  private request(path: string) {
    const key = this.apiKey ?? '1';
    return this.fetchImpl(`${this.baseUrl}/${key}${path}`);
  }

  private toCanonical(meal: RawMeal): CanonicalImportCandidate {
    const ingredientLines: CanonicalImportCandidate['ingredientLines'] = [];
    for (let i = 1; i <= 20; i++) {
      const name = (meal as unknown as Record<string, string | null>)[`strIngredient${i}`];
      const measure = (meal as unknown as Record<string, string | null>)[`strMeasure${i}`];
      if (name && name.trim()) {
        const measureText = (measure ?? '').trim();
        const { quantity, unit } = parseMeasure(measureText);
        ingredientLines.push({
          raw: `${measureText} ${name}`.trim(),
          ingredient: name.trim(),
          quantity,
          unit,
        });
      }
    }

    const steps = (meal.strInstructions ?? '')
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const provenance: Provenance = {
      contentOwner: 'TheMealDB contributors',
      ownershipType: 'licensed',
      sourceProvider: 'themealdb',
      sourceRecipeId: meal.idMeal,
      sourceUrl: meal.strSource ?? undefined,
      sourceTermsUrl: 'https://www.themealdb.com/terms_of_use.php',
      attributionText: meal.strSource ? `Adapted from ${meal.strSource}` : undefined,
      storagePermission: 'permanent',
      imageStoragePermission: 'permanent',
      importedAt: new Date().toISOString(),
    };

    return {
      providerRecipeId: meal.idMeal,
      title: meal.strMeal,
      description: undefined,
      cuisineHints: meal.strArea ? [meal.strArea] : [],
      countryHints: meal.strArea ? [meal.strArea] : [],
      regionHints: [],
      imageUrl: meal.strMealThumb ?? undefined,
      imageAllowsStorage: true,
      ingredientLines,
      steps,
      provenance,
    };
  }
}

interface RawMeal {
  idMeal: string;
  strMeal: string;
  strArea?: string | null;
  strCategory?: string | null;
  strInstructions?: string | null;
  strMealThumb?: string | null;
  strSource?: string | null;
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  litre: 'l',
  liter: 'l',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  clove: 'clove',
  cloves: 'clove',
  slice: 'slice',
  slices: 'slice',
  piece: 'piece',
  pieces: 'piece',
  pinch: 'pinch',
};

function parseMeasure(text: string): { quantity?: number; unit?: string } {
  if (!text) return {};
  const match = text.match(/^\s*([0-9]+(?:[.,][0-9]+)?(?:\s*\/\s*[0-9]+)?)\s*([a-zA-Z]+)?/);
  if (!match) return {};
  const rawQty = match[1]!.replace(',', '.');
  let quantity: number | undefined;
  if (rawQty.includes('/')) {
    const [a, b] = rawQty.split('/').map((s) => Number(s.trim()));
    if (a !== undefined && b) quantity = a / b;
  } else {
    const parsed = Number(rawQty);
    if (Number.isFinite(parsed)) quantity = parsed;
  }
  const unitRaw = (match[2] ?? '').toLowerCase();
  const unit = UNIT_ALIASES[unitRaw];
  return { quantity, unit };
}
