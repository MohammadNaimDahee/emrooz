import * as Linking from 'expo-linking';
import { getSupabase } from './supabase';

export interface AuthResult {
  ok: boolean;
  error?: string;
  needsVerification?: boolean;
}

/**
 * Mobile auth helpers on top of the shared Supabase client.
 *
 * Magic-link and email verification return to the app via the `emrooz://`
 * deep-link scheme. Passwords are handled entirely inside the app.
 * All helpers return a friendly result object rather than throwing.
 */
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Email and password don't match.";
  if (/user already registered/i.test(message)) return 'An account already exists with that email.';
  if (/email rate limit/i.test(message)) return 'Too many messages sent. Try again in a minute.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email before signing in.';
  return message;
}

function redirect(path: string): string {
  return Linking.createURL(path);
}

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  error: 'Sign-in wires up once Supabase credentials are configured.',
};

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;

  // If the caller already has an anonymous session, upgrade it. The user
  // keeps their auth.users row and therefore every pantry_items / favorites
  // / history / planner / shopping_list_items row keyed to it.
  const { data: existing } = await supabase.auth.getUser();
  const isAnonymous =
    existing.user?.is_anonymous ?? (existing.user ? !existing.user.email : false);

  if (existing.user && isAnonymous) {
    const { error } = await supabase.auth.updateUser({ email, password });
    if (error) return { ok: false, error: friendly(error.message) };
    return { ok: true, needsVerification: true };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirect('/auth/callback') },
  });
  if (error) return { ok: false, error: friendly(error.message) };
  return { ok: true, needsVerification: !data.session };
}

export async function sendMagicLink(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect('/auth/callback') },
  });
  return error
    ? { ok: false, error: friendly(error.message) }
    : { ok: true, needsVerification: true };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirect('/auth/reset-password'),
  });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.signOut();
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}
