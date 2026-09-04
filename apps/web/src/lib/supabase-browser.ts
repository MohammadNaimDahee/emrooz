'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client. Session is persisted in cookies by `@supabase/ssr`
 * so it round-trips to the server and back cleanly. Safe to call from any
 * client component — the client is memoized per browser tab.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the new `sb_publishable_*` key; fall back to legacy anon JWT
  // so a hosted project that still uses the old naming keeps working.
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishable) return null;
  cached = createBrowserClient(url, publishable);
  return cached;
}
