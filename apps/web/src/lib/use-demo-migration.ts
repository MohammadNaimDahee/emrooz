'use client';
import { useEffect, useRef } from 'react';

import { migrateUserData, type UserSnapshot } from '@emrooz/core';
import type { UserPreferences } from '@emrooz/types';

import { getData } from './data';
import { useSupabaseSession } from './session';

const LOCAL_PREFS_KEY = 'emrooz.prefs';
const LOCAL_GUEST_KEY = 'emrooz.guestId';
const MIGRATION_MARKER = 'emrooz.migrated';

/**
 * When a user was formerly in demo mode (or an anonymous Supabase session on
 * this same device) and now has a real Supabase user id, migrate whatever
 * persistent local data we have into the Supabase-backed adapter.
 *
 * Only preferences are reliably persistent in demo mode today. The migration
 * helper handles more collections idempotently, ready for later work that
 * persists pantry / favorites / history locally.
 *
 * Runs once per (browser, userId) pair, guarded by a localStorage marker.
 */
export function useDemoMigration(): void {
  const session = useSupabaseSession();
  const runRef = useRef(false);

  useEffect(() => {
    if (runRef.current) return;
    if (!session.ready) return;
    if (!session.supabaseEnabled) return;
    if (!session.userId) return;

    const migratedFor = window.localStorage.getItem(MIGRATION_MARKER);
    if (migratedFor === session.userId) return;

    runRef.current = true;
    (async () => {
      try {
        const snapshot = readLocalSnapshot();
        if (!snapshot) return;
        await migrateUserData(snapshot, session.userId!, getData());
      } catch (err) {
        console.warn('[emrooz] demo → Supabase migration skipped', err);
      } finally {
        window.localStorage.setItem(MIGRATION_MARKER, session.userId!);
        // Local guest markers can go — the auth session is authoritative now.
        window.localStorage.removeItem(LOCAL_GUEST_KEY);
      }
    })();
  }, [session]);
}

function readLocalSnapshot(): UserSnapshot | undefined {
  const guestId = window.localStorage.getItem(LOCAL_GUEST_KEY) ?? 'guest';
  const prefsRaw = window.localStorage.getItem(LOCAL_PREFS_KEY);
  let preferences: UserPreferences | undefined;
  if (prefsRaw) {
    try {
      preferences = JSON.parse(prefsRaw) as UserPreferences;
    } catch {
      preferences = undefined;
    }
  }
  if (!preferences) return undefined;
  return { sourceUserId: guestId, preferences };
}
