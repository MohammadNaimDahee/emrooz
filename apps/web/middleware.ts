import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresh the Supabase session cookie on every request so server components
 * and route handlers see a valid user. When Supabase is not configured,
 * this middleware is effectively a no-op.
 *
 * The matcher intentionally excludes Next.js internals and static assets.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = NextResponse.next({ request });
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Touch the session to refresh cookies if needed.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Skip middleware for static assets. Keep favicon-*, apple-touch-icon,
  // and manifest icon fallbacks in the exclude list so browser requests
  // for them don't go through the auth-refresh path.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.svg|favicon-.*|apple-touch-icon\\.png|manifest\\.webmanifest|sw\\.js|icon-.*).*)',
  ],
};
