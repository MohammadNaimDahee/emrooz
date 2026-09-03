import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase-server';

/**
 * OAuth / magic-link / password-reset callback.
 *
 * Supabase redirects here with `?code=<pkce>` on successful auth. We exchange
 * that code for a session server-side (cookies are set by @supabase/ssr),
 * then bounce the user into the app or back to the sign-in page on error.
 *
 * The `next` query param controls where the user lands. Any absolute URL is
 * refused to avoid open-redirect abuse.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextRaw = url.searchParams.get('next') ?? '/app';
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/app';

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const target = new URL('/auth/sign-in', request.url);
      target.searchParams.set('error', error.message);
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
