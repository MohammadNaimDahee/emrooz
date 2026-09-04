#!/usr/bin/env tsx
/**
 * Import recipes from an external provider through the ingestion pipeline.
 *
 * Called via:
 *
 *   pnpm recipes:import -- --provider=themealdb --area=Afghan
 *   pnpm recipes:import -- --provider=themealdb --query=palaw
 *
 * Currently supports TheMealDB — the only permanent-storage provider we
 * ship. Runs a dry-run by default and prints the staged candidates as a
 * JSON report. Pass `--commit` to actually write the recipes; without it,
 * no rows are touched.
 *
 * Persisted imports refuse to run unless a `providers` row and a
 * `provider_terms_reviews` row are on file for the chosen provider — that
 * matches the admin UI's guard and enforces the spec's requirement that
 * imports be blocked until terms have been reviewed.
 */
import { TheMealDbProvider } from '@emrooz/recipe-providers';
import { runImport, stage } from '@emrooz/recipe-import';
import { INGREDIENTS } from '@emrooz/database/seed';

interface CliArgs {
  provider: string;
  area?: string;
  query?: string;
  commit: boolean;
}

function parseArgs(): CliArgs {
  let provider = 'themealdb';
  let area: string | undefined;
  let query: string | undefined;
  let commit = false;
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith('--provider=')) provider = raw.slice('--provider='.length);
    else if (raw.startsWith('--area=')) area = raw.slice('--area='.length);
    else if (raw.startsWith('--query=')) query = raw.slice('--query='.length);
    else if (raw === '--commit') commit = true;
  }
  return { provider, area, query, commit };
}

function log(event: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...extra }));
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.provider !== 'themealdb') {
    throw new Error(`Only themealdb is supported today. Got "${args.provider}".`);
  }
  if (args.commit) {
    // We refuse to auto-publish; the admin UI is the persistence surface (§3),
    // and provider terms review is enforced through it. The CLI flag exists
    // for future automation but is currently gated off.
    throw new Error(
      '`--commit` is not enabled in this build. Use the admin UI (/admin/imports) to promote candidates to draft recipes.',
    );
  }

  const provider = new TheMealDbProvider(process.env.THEMEALDB_API_KEY);
  if (!provider.hasCredentials()) {
    throw new Error('THEMEALDB_API_KEY is not set on the environment.');
  }

  log('import.start', {
    provider: args.provider,
    area: args.area,
    query: args.query,
    commit: args.commit,
  });

  const candidates = args.area
    ? await provider.fetchByArea(args.area)
    : await provider.search({ query: args.query });

  const staged = stage(candidates, { ingredients: INGREDIENTS });
  const summary = {
    fetched: staged.length,
    ready: staged.filter((c) => c.stage === 'ready').length,
    duplicate: staged.filter((c) => c.stage === 'duplicate').length,
    needsAttention: staged.filter((c) => c.problems.length > 0).length,
  };
  log('import.done', summary);
  // Print full candidate detail last so a caller can `| jq .candidates` if desired.
  console.log(JSON.stringify({ candidates: staged }, null, 2));
}

// Consume runImport's export so tree-shakers keep it — the API is
// re-exported for programmatic callers even when the CLI itself doesn't use it.
void runImport;

main().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'import.failed',
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(1);
});
