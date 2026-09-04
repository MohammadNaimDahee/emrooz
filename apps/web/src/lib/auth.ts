'use client';
import { useState } from 'react';
import type { AuthError } from '@supabase/supabase-js';

import { getBrowserSupabase } from './supabase-browser';

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  needsVerification?: boolean;
}

/**
 * Auth actions on the browser Supabase client. Returns friendly result objects
 * instead of throwing so forms can render inline errors without a boundary.
 *
 * When Supabase is not configured, every action returns { ok: false } with a
 * hint pointing at the setup docs, so pages can render disabled states.
 */
export function useAuthActions() {
  const [pending, setPending] = useState<string | null>(null);

  async function withPending<T>(kind: string, fn: () => Promise<T>): Promise<T> {
    setPending(kind);
    try {
      return await fn();
    } finally {
      setPending(null);
    }
  }

  const supabase = getBrowserSupabase();
  const notConfigured: AuthActionResult = {
    ok: false,
    error: 'Sign-in wires up once Supabase credentials are configured. See docs/backend-setup.md.',
  };

  return {
    pending,

    async signInWithPassword(email: string, password: string): Promise<AuthActionResult> {
      if (!supabase) return notConfigured;
      return withPending('sign-in', async () => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return toResult(error);
      });
    },

    async signUp(email: string, password: string): Promise<AuthActionResult> {
      if (!supabase) return notConfigured;
      return withPending('sign-up', async () => {
        // If the caller already has an anonymous session, upgrade it rather
        // than creating a second user. The user keeps their auth.users row —
        // and therefore every pantry_items / favorites / history / planner /
        // shopping_list_items row keyed to it — for free.
        const { data: existing } = await supabase.auth.getUser();
        const isAnonymous =
          existing.user?.is_anonymous ?? (existing.user ? !existing.user.email : false);

        if (existing.user && isAnonymous) {
          const { error } = await supabase.auth.updateUser({
            email,
            password,
            data: { emailRedirectTo: redirectTo('/auth/callback') },
          });
          if (error) return toResult(error);
          // Anonymous upgrade always requires email verification.
          return { ok: true, needsVerification: true };
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo('/auth/callback') },
        });
        if (error) return toResult(error);
        return { ok: true, needsVerification: !data.session };
      });
    },

    async sendMagicLink(email: string): Promise<AuthActionResult> {
      if (!supabase) return notConfigured;
      return withPending('magic', async () => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo('/auth/callback') },
        });
        if (error) return toResult(error);
        return { ok: true, needsVerification: true };
      });
    },

    async sendPasswordReset(email: string): Promise<AuthActionResult> {
      if (!supabase) return notConfigured;
      return withPending('reset', async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo('/auth/reset-password'),
        });
        return toResult(error, true);
      });
    },

    async updatePassword(newPassword: string): Promise<AuthActionResult> {
      if (!supabase) return notConfigured;
      return withPending('update-password', async () => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return toResult(error);
      });
    },

    async signOut(): Promise<AuthActionResult> {
      if (!supabase) return notConfigured;
      return withPending('sign-out', async () => {
        const { error } = await supabase.auth.signOut();
        return toResult(error);
      });
    },
  };
}

function toResult(error: AuthError | null, needsVerification = false): AuthActionResult {
  if (!error) return { ok: true, needsVerification };
  return { ok: false, error: friendlyMessage(error) };
}

function friendlyMessage(error: AuthError): string {
  const msg = error.message ?? 'Something went wrong.';
  if (/invalid login credentials/i.test(msg))
    return "That email and password combination isn't right.";
  if (/user already registered/i.test(msg))
    return 'An account already exists with that email. Try signing in instead.';
  if (/email rate limit/i.test(msg)) return 'Too many messages sent. Try again in a minute.';
  if (/email not confirmed/i.test(msg))
    return 'Please confirm your email address before signing in.';
  return msg;
}

function redirectTo(path: string): string {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
