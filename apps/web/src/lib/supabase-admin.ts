import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Privileged server-only Supabase client for operations that RLS blocks —
 * most notably deleting rows in `auth.users`. NEVER call this from a client
 * component; the `server-only` import guards against that at build time.
 *
 * Key naming: Supabase's new key format calls this the `secret_key`
 * (`sb_secret_*`); the legacy name was `service_role_key` (a JWT). We
 * prefer the new name and fall back to the legacy one so a hosted project
 * that hasn't rotated its keys keeps working. `@supabase/supabase-js`
 * accepts either.
 *
 * We construct with `persistSession: false` because we never want this
 * client to write auth cookies for the request — it acts on behalf of the
 * server, not a user.
 */
export function getAdminSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  cached = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
