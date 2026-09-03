import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client for privileged server operations that RLS
 * blocks — most notably deleting rows in `auth.users`. NEVER call this from
 * a client component; the `server-only` import guards against that at build
 * time.
 *
 * We construct with `persistSession: false` because we never want this
 * client to write auth cookies for the request — it acts on behalf of the
 * server, not a user.
 */
export function getAdminSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  cached = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
