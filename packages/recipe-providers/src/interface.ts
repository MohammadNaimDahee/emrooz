import type { Provenance } from '@emrooz/types';

/** Canonical form used by the import pipeline before normalization + review. */
export interface CanonicalImportCandidate {
  providerRecipeId: string;
  title: string;
  description?: string;
  cuisineHints: string[];
  countryHints: string[];
  regionHints: string[];
  totalMinutes?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  imageUrl?: string;
  imageAllowsStorage?: boolean;
  ingredientLines: Array<{
    raw: string;
    quantity?: number;
    unit?: string;
    ingredient: string;
    note?: string;
  }>;
  steps: string[];
  provenance: Provenance;
}

export interface ProviderRateLimit {
  /** null = unlimited or unknown. */
  requestsPerMinute: number | null;
  requestsPerDay: number | null;
}

export interface ProviderHealth {
  reachable: boolean;
  latencyMs?: number;
  lastError?: string;
  checkedAt: string;
}

export interface ProviderSearchParams {
  query?: string;
  area?: string;
  cuisine?: string;
  page?: number;
  pageSize?: number;
}

export interface RecipeProvider {
  readonly key: string;
  readonly displayName: string;
  readonly rateLimit: ProviderRateLimit;
  /**
   * Whether canonical content returned by this provider is allowed to be
   * stored permanently in the Emrooz database. See CLAUDE.md §27, §31.
   */
  readonly storageMode:
    'permanent' | 'subscription_only' | 'temporary_cache' | 'metadata_only' | 'not_permitted';
  hasCredentials(): boolean;
  health(): Promise<ProviderHealth>;
  search(params: ProviderSearchParams): Promise<CanonicalImportCandidate[]>;
  fetchById(id: string): Promise<CanonicalImportCandidate | undefined>;
  fetchByArea(
    area: string,
    opts?: { page?: number; pageSize?: number },
  ): Promise<CanonicalImportCandidate[]>;
}
