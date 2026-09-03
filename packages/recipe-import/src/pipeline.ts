import type { Ingredient } from '@emrooz/types';
import type { CanonicalImportCandidate, RecipeProvider } from '@emrooz/recipe-providers';
import { buildAliasIndex, resolveIngredient } from '@emrooz/core';
import { fingerprint } from './fingerprint';

export type PipelineStage = 'fetched' | 'normalized' | 'validated' | 'duplicate' | 'ready';

export interface StagedCandidate {
  stage: PipelineStage;
  fingerprint: string;
  candidate: CanonicalImportCandidate;
  normalized?: {
    resolvedIngredientIds: Array<string | null>;
    unmatchedIngredientNames: string[];
  };
  problems: string[];
  duplicateOf?: string;
}

export interface PipelineOptions {
  ingredients: Ingredient[];
  /** Existing fingerprints in the database, used for dedup. */
  knownFingerprints?: Set<string>;
}

/**
 * Run the ingestion pipeline for a batch of candidates.
 * The pipeline never publishes automatically. Its output is a list of staged
 * candidates ready for a reviewer to accept in the admin interface.
 */
export function stage(
  candidates: CanonicalImportCandidate[],
  opts: PipelineOptions,
): StagedCandidate[] {
  const aliasIndex = buildAliasIndex(opts.ingredients);
  const known = opts.knownFingerprints ?? new Set();
  const seenInBatch = new Set<string>();

  return candidates.map((candidate) => {
    const fp = fingerprint(candidate);
    const staged: StagedCandidate = {
      stage: 'fetched',
      fingerprint: fp,
      candidate,
      problems: [],
    };

    // Normalize
    const resolvedIds: Array<string | null> = [];
    const unmatched: string[] = [];
    for (const line of candidate.ingredientLines) {
      const id = resolveIngredient(aliasIndex, line.ingredient);
      resolvedIds.push(id ?? null);
      if (!id) unmatched.push(line.ingredient);
    }
    staged.normalized = { resolvedIngredientIds: resolvedIds, unmatchedIngredientNames: unmatched };
    staged.stage = 'normalized';

    // Basic validation — everything more nuanced is handled by @emrooz/validation.
    if (!candidate.title || candidate.title.trim().length === 0) staged.problems.push('missing title');
    if (candidate.ingredientLines.length === 0) staged.problems.push('no ingredients');
    if (candidate.steps.length === 0) staged.problems.push('no steps');
    if (candidate.provenance.storagePermission === 'not_permitted') {
      staged.problems.push('provider forbids storage — use external_link_only');
    }
    staged.stage = staged.problems.length === 0 ? 'validated' : 'validated';

    // Dedup — flag both known-in-db and duplicates within this batch.
    if (known.has(fp) || seenInBatch.has(fp)) {
      staged.stage = 'duplicate';
      staged.duplicateOf = fp;
    } else {
      seenInBatch.add(fp);
      if (staged.problems.length === 0) staged.stage = 'ready';
    }

    return staged;
  });
}

export interface ImportRunResult {
  provider: string;
  fetched: number;
  ready: number;
  duplicate: number;
  needsAttention: number;
  candidates: StagedCandidate[];
}

/**
 * End-to-end import for a single provider using its default fetch path.
 * Callers can specify an area or a query.
 */
export async function runImport(
  provider: RecipeProvider,
  spec: { area?: string; query?: string },
  opts: PipelineOptions,
): Promise<ImportRunResult> {
  if (!provider.hasCredentials()) {
    return { provider: provider.key, fetched: 0, ready: 0, duplicate: 0, needsAttention: 0, candidates: [] };
  }
  const raw = spec.area
    ? await provider.fetchByArea(spec.area)
    : await provider.search({ query: spec.query });
  const candidates = stage(raw, opts);
  return {
    provider: provider.key,
    fetched: candidates.length,
    ready: candidates.filter((c) => c.stage === 'ready').length,
    duplicate: candidates.filter((c) => c.stage === 'duplicate').length,
    needsAttention: candidates.filter((c) => c.problems.length > 0).length,
    candidates,
  };
}
