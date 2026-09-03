'use client';
import { useEffect, useState } from 'react';
import type { UserPreferences } from '@emrooz/types';

const KEY = 'emrooz.prefs';

export function usePreferences(userId: string) {
  const [prefs, setPrefs] = useState<UserPreferences | undefined>();
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs(JSON.parse(raw) as UserPreferences);
    } catch {
      // ignore malformed
    }
  }, [userId]);
  function save(p: UserPreferences) {
    localStorage.setItem(KEY, JSON.stringify(p));
    setPrefs(p);
  }
  return { prefs, save };
}
