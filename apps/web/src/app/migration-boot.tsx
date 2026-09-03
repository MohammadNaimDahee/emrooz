'use client';
import { useDemoMigration } from '../lib/use-demo-migration';

/**
 * Runs the demo → Supabase migration once per (browser, userId) pair.
 * Rendered near the root of the layout tree so it fires exactly once.
 */
export function MigrationBoot(): null {
  useDemoMigration();
  return null;
}
