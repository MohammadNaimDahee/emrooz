import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDemoData, SupabaseEmroozData, type EmroozData } from '@emrooz/database';
import { migrateUserData } from '@emrooz/core';
import type { Locale, UserPreferences, UserProfile } from '@emrooz/types';

import { ensureSession, getSupabase } from './supabase';

interface DataCtxValue {
  data: EmroozData;
  profile: UserProfile | undefined;
  preferences: UserPreferences | undefined;
  setPreferences: (p: UserPreferences) => Promise<void>;
  refresh: () => Promise<void>;
  locale: Locale;
  setLocale: (l: Locale) => void;
  ready: boolean;
  supabaseEnabled: boolean;
}

const DataCtx = createContext<DataCtxValue | null>(null);

const PREFS_KEY = '@emrooz/prefs';
const GUEST_KEY = '@emrooz/guest';
const LOCALE_KEY = '@emrooz/locale';
const MIGRATION_MARKER = '@emrooz/migrated';

export function DataProvider({ children }: { children: React.ReactNode }) {
  // The adapter depends on whether Supabase is configured. We pick once at
  // mount and hold onto it. Screens don't care which flavor they got.
  const supabase = useMemo(() => getSupabase(), []);
  const supabaseEnabled = Boolean(supabase);
  const data = useMemo<EmroozData>(
    () => (supabase ? new SupabaseEmroozData(supabase) : createDemoData()),
    [supabase],
  );

  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [preferences, setPrefs] = useState<UserPreferences | undefined>();
  const [locale, setLocaleState] = useState<Locale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Load cached locale immediately so language flips before network I/O.
      const storedLocale = await AsyncStorage.getItem(LOCALE_KEY);
      if (storedLocale) setLocaleState(storedLocale as Locale);

      let userProfile: UserProfile | undefined;

      if (supabase) {
        // Real backend: guarantee a session (anonymous if needed), then load
        // the corresponding profile row created by the auth trigger.
        const session = await ensureSession();
        if (session) {
          const p = await data.profile.get(session.userId);
          if (p) userProfile = p;
        }
      } else {
        // Demo mode: reuse or create a local guest identity.
        const storedGuestJson = await AsyncStorage.getItem(GUEST_KEY);
        if (storedGuestJson) {
          const p = JSON.parse(storedGuestJson) as UserProfile;
          await data.profile.upsert(p);
          userProfile = p;
        } else {
          const created = await data.profile.createGuest();
          await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(created));
          userProfile = created;
        }
      }
      setProfile(userProfile);

      // Load preferences from the adapter if available; fall back to the
      // AsyncStorage cache we keep for offline first-boot.
      if (userProfile) {
        const remote = await data.preferences.get(userProfile.id);
        if (remote) {
          setPrefs(remote);
          setLocaleState(remote.language);
        } else {
          const cachedPrefs = await AsyncStorage.getItem(PREFS_KEY);
          if (cachedPrefs) {
            const p = JSON.parse(cachedPrefs) as UserPreferences;
            // Route through the shared idempotent migration helper so this
            // stays consistent with the web path. Marks the user so we skip
            // running the migration a second time on next boot.
            const marker = await AsyncStorage.getItem(MIGRATION_MARKER);
            if (marker !== userProfile.id) {
              await migrateUserData(
                { sourceUserId: p.userId, preferences: p },
                userProfile.id,
                data,
              );
              await AsyncStorage.setItem(MIGRATION_MARKER, userProfile.id);
            }
            setPrefs({ ...p, userId: userProfile.id });
            setLocaleState(p.language);
          }
        }
      }

      setReady(true);
    })();
  }, [data, supabase]);

  async function setPreferences(p: UserPreferences) {
    await data.preferences.save(p);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
    setPrefs(p);
    setLocaleState(p.language);
    await AsyncStorage.setItem(LOCALE_KEY, p.language);
  }

  function setLocale(l: Locale) {
    setLocaleState(l);
    AsyncStorage.setItem(LOCALE_KEY, l).catch(() => {});
  }

  async function refresh() {
    if (!profile) return;
    const p = await data.preferences.get(profile.id);
    setPrefs(p);
  }

  return (
    <DataCtx.Provider
      value={{
        data,
        profile,
        preferences,
        setPreferences,
        refresh,
        locale,
        setLocale,
        ready,
        supabaseEnabled,
      }}
    >
      {children}
    </DataCtx.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
