import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Mobile Supabase client. Session persistence via AsyncStorage so the user
 * stays signed in across app launches without a network round-trip.
 *
 * Reads URL + anon key from Expo's `extra` config (app.json → extra.supabase)
 * or from the standard EXPO_PUBLIC_* env vars, whichever is populated.
 */
export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  // Metro inlines process.env.EXPO_PUBLIC_* at build time. We access it via
  // globalThis to avoid pulling @types/node into the mobile compilation.
  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const url = extra.EXPO_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  cached = createClient(url, anon, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

/**
 * Ensure the user has a session. Guests are signed in anonymously so RLS
 * `auth.uid()` returns a real UUID and per-user tables are usable.
 */
export async function ensureSession(): Promise<{ userId: string; isGuest: boolean } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return { userId: data.user.id, isGuest: data.user.is_anonymous ?? !data.user.email };
  }
  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error || !created.user) return null;
  return { userId: created.user.id, isGuest: true };
}
