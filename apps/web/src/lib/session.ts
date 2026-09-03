'use client';
import { useEffect, useState } from 'react';
import { getBrowserSupabase } from './supabase-browser';

export interface SessionState {
  userId: string | null;
  isGuest: boolean;
  supabaseEnabled: boolean;
  ready: boolean;
}

/**
 * Boot a Supabase session in the browser. If no session exists yet, sign in
 * anonymously so RLS `auth.uid()` works and per-user tables are accessible.
 * When Supabase is not configured, callers fall back to the legacy localStorage
 * guest id via useGuestId().
 */
export function useSupabaseSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    userId: null,
    isGuest: true,
    supabaseEnabled: false,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setState({ userId: null, isGuest: true, supabaseEnabled: false, ready: true });
      return;
    }
    (async () => {
      const { data: existing } = await supabase.auth.getUser();
      if (existing.user) {
        if (!cancelled) {
          setState({
            userId: existing.user.id,
            isGuest: existing.user.is_anonymous ?? !existing.user.email,
            supabaseEnabled: true,
            ready: true,
          });
        }
        return;
      }
      const { data: created, error } = await supabase.auth.signInAnonymously();
      if (error) {
        // Anonymous sign-ins may be disabled at the project level. Fall back
        // to legacy guest id so the app still boots and reads public data.
        if (!cancelled) {
          setState({ userId: null, isGuest: true, supabaseEnabled: false, ready: true });
        }
        return;
      }
      if (!cancelled && created.user) {
        setState({
          userId: created.user.id,
          isGuest: true,
          supabaseEnabled: true,
          ready: true,
        });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        setState({
          userId: session.user.id,
          isGuest: session.user.is_anonymous ?? !session.user.email,
          supabaseEnabled: true,
          ready: true,
        });
      } else {
        setState({ userId: null, isGuest: true, supabaseEnabled: true, ready: true });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
