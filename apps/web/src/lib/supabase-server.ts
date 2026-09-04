import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client wired to Next.js cookies.
 * Reads and writes session cookies so both server components and route
 * handlers see the same authenticated user.
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the new `sb_publishable_*` key; fall back to the legacy anon JWT
  // so a hosted project that hasn't rotated keys still works.
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishable) return null;
  const cookieStore = await cookies();
  return createServerClient(url, publishable, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // The refresh will happen on the next request instead.
        }
      },
    },
  });
}
