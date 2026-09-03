'use client';
import { useMemo } from 'react';

import {
  createDemoData,
  SupabaseEmroozData,
  type EmroozData,
} from '@emrooz/database';

import { getBrowserSupabase } from './supabase-browser';
import { useSupabaseSession } from './session';

let cachedDemo: EmroozData | null = null;
let cachedSupabase: EmroozData | null = null;

/**
 * Client-side hook that returns the right EmroozData adapter for the current
 * environment, plus the effective user id (anonymous or authenticated).
 *
 * In demo mode (no Supabase credentials), the adapter is the in-memory
 * demo dataset and the user id comes from a per-browser localStorage guest id.
 *
 * In Supabase mode, the adapter is a Supabase-backed EmroozData wired to the
 * browser client (so writes and private reads are auth-scoped), and the user
 * id comes from the current Supabase session (anonymous by default until the
 * user signs up or in).
 */
export function useEmroozData(): {
  data: EmroozData;
  userId: string;
  isGuest: boolean;
  ready: boolean;
} {
  const session = useSupabaseSession();

  const adapter = useMemo<EmroozData>(() => {
    if (!session.supabaseEnabled) {
      if (!cachedDemo) cachedDemo = createDemoData();
      return cachedDemo;
    }
    if (!cachedSupabase) {
      const supabase = getBrowserSupabase()!;
      cachedSupabase = new SupabaseEmroozData(supabase);
    }
    return cachedSupabase;
  }, [session.supabaseEnabled]);

  // Fallback guest id for demo mode / pre-session state, kept in localStorage.
  const localGuestId = useLocalGuestId();
  const userId = session.userId ?? localGuestId;

  return { data: adapter, userId, isGuest: session.isGuest, ready: session.ready };
}

function useLocalGuestId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'emrooz.guestId';
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const created = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  window.localStorage.setItem(KEY, created);
  return created;
}
