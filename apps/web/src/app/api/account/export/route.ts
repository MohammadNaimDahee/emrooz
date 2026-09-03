import { NextResponse } from 'next/server';

import { buildAccountSnapshot } from '../../../../lib/account-snapshot';
import { getServerSupabase } from '../../../../lib/supabase-server';
import { RateLimiter } from '../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

// Exports are cheap to compute but still worth throttling to prevent an
// automated tool from siphoning off snapshots on a loop. Three per hour is
// generous for a human and hostile to a script.
const limiter = new RateLimiter({ capacity: 3, refillPerSecond: 3 / 3600 });

/**
 * GET /api/account/export
 *
 * Returns a JSON attachment containing every user-scoped row the caller
 * owns. Row Level Security enforces that this can never include another
 * user's data, even accidentally.
 *
 * Never cached, per §45 of CLAUDE.md — allergy and dietary information
 * must not sit in shared caches.
 */
export async function GET() {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Backend not configured.' }, { status: 503 });
  }
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const gate = limiter.take(user.id);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Please wait before requesting another export.' },
      { status: 429, headers: { 'retry-after': Math.ceil(gate.retryAfterMs / 1000).toString() } },
    );
  }

  const snapshot = await buildAccountSnapshot(supabase, user.id);
  const filename = `emrooz-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}
