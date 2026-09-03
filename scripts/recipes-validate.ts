#!/usr/bin/env tsx
/**
 * Validate a JSON export produced by `pnpm recipes:export` (or hand-written
 * canonical content) against the shared Zod schemas in `@emrooz/validation`.
 *
 * Called via `pnpm recipes:validate -- --in=./out.json`.
 *
 * Reports the number of valid vs invalid entries per collection and exits
 * non-zero if any validation failed, so CI can enforce well-formed data
 * before an import.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { RecipeSchema, IngredientSchema, PantryItemSchema } from '@emrooz/validation';
import { z } from 'zod';

interface CliArgs {
  input: string;
}

function parseArgs(): CliArgs {
  let input = './emrooz-recipes-export.json';
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith('--in=')) input = raw.slice('--in='.length);
  }
  return { input: resolve(input) };
}

interface ValidateReport {
  ok: number;
  failed: number;
  issues: Array<{ index: number; message: string }>;
}

function validateArray<T>(items: unknown[], schema: z.ZodType<T>): ValidateReport {
  const report: ValidateReport = { ok: 0, failed: 0, issues: [] };
  items.forEach((item, index) => {
    const parsed = schema.safeParse(item);
    if (parsed.success) report.ok += 1;
    else {
      report.failed += 1;
      report.issues.push({ index, message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ') });
    }
  });
  return report;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const raw = await readFile(args.input, 'utf8');
  const parsed = JSON.parse(raw) as {
    recipes?: unknown[];
    ingredients?: unknown[];
    pantryItems?: unknown[];
  };

  const results = {
    recipes: parsed.recipes ? validateArray(parsed.recipes, RecipeSchema) : null,
    ingredients: parsed.ingredients ? validateArray(parsed.ingredients, IngredientSchema) : null,
    pantryItems: parsed.pantryItems ? validateArray(parsed.pantryItems, PantryItemSchema) : null,
  };

  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event: 'validate.report', results }, null, 2));

  const anyFailed = Object.values(results).some((r) => r && r.failed > 0);
  if (anyFailed) {
    console.error('Validation failed — see report above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ event: 'validate.failed', message: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
