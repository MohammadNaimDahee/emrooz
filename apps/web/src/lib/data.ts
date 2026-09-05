import { createClient } from '@supabase/supabase-js';

import {
  createDemoData,
  inferDemoMode,
  SupabaseEmroozData,
  type EmroozData,
} from '@emrooz/database';

let cachedDemo: EmroozData | null = null;
let cachedSupabase: EmroozData | null = null;

/**
 * Adapter for server components and route handlers.
 *
 * When Supabase environment variables are present, we return a Supabase-backed
 * EmroozData built on a publishable-key client. It's safe for public reads
 * (recipes, cuisines, ingredients) because RLS is authoritative. Private
 * per-user reads from server components should use the auth-aware helper in
 * `apps/web/src/lib/supabase-server.ts` and wire their own adapter around it.
 *
 * When credentials are missing (or explicitly disabled), we return the bundled
 * demo dataset so the app boots without any provider setup.
 *
 * Key naming: prefers the new `sb_publishable_*` env var; falls back to the
 * legacy `anon_key` for compatibility with older hosted projects.
 */
export function getData(): EmroozData {
  const env = process.env as Record<string, string | undefined>;
  if (inferDemoMode(env)) {
    if (!cachedDemo) cachedDemo = createDemoData();
    return cachedDemo;
  }
  if (!cachedSupabase) {
    const url = env.NEXT_PUBLIC_SUPABASE_URL!;
    const publishable =
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    cachedSupabase = new SupabaseEmroozData(
      createClient(url, publishable, {
        global: {
          // Next 15 auto-caches every `fetch()` in server components.
          // Recipe/cuisine reads should always show the current
          // published set, so opt out per-request. Reads are cheap and
          // RLS gates what's visible.
          fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
        },
      }),
    );
  }
  return cachedSupabase;
}

/**
 * True whenever `getData()` returned a demo adapter this process.
 * Handy for banners and dev tooling.
 */
export const IS_DEMO = inferDemoMode(process.env as Record<string, string | undefined>);
