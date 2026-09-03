import { NextResponse, type NextRequest } from 'next/server';

import { USER_SCOPED_TABLES } from '../../../../lib/account-snapshot';
import { getServerSupabase } from '../../../../lib/supabase-server';
import { getAdminSupabase } from '../../../../lib/supabase-admin';
import { RateLimiter } from '../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

// Extremely tight rate limit — a single request per hour with no burst.
// Someone attempting to spam-delete an account is either a mistake or an
// attack; either way, one attempt per hour is enough.
const limiter = new RateLimiter({ capacity: 1, refillPerSecond: 1 / 3600 });

/**
 * POST /api/account/delete
 *
 * Body: { confirm: "DELETE" }
 *
 * Deletes every user-scoped row for the caller, drops their profile, then
 * uses the service-role client to remove the auth.users row. Signs the
 * session out on the way out.
 *
 * Idempotent: repeating the call after successful deletion returns 401
 * because the session is already gone. That's the desired outcome.
 *
 * Backups may still contain snapshots of the deleted user, see
 * docs/backup-and-restore.md for the retention window and purge process.
 */
export async function POST(request: NextRequest) {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Backend not configured.' }, { status: 503 });
  }
  const admin = getAdminSupabase();
  if (!admin) {
    return NextResponse.json(
      { error: 'Account deletion requires a service-role key on the server.' },
      { status: 503 },
    );
  }

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const gate = limiter.take(user.id);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Please wait before trying again.' },
      { status: 429, headers: { 'retry-after': Math.ceil(gate.retryAfterMs / 1000).toString() } },
    );
  }

  let body: { confirm?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Empty body handled by the confirmation check below.
  }
  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'Provide { "confirm": "DELETE" } in the request body.' },
      { status: 400 },
    );
  }

  // 1. Purge user-scoped tables via the caller's own session (RLS enforced).
  for (const table of USER_SCOPED_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', user.id);
    if (error) {
      return NextResponse.json(
        { error: `Failed to clear ${table}.`, detail: error.message },
        { status: 500 },
      );
    }
  }

  // 2. Drop the profile row (cascades any leftover FK references from the
  // migrations that model per-user editorial records — currently none, but
  // the delete cascade is defensive).
  {
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    if (error) {
      return NextResponse.json(
        { error: 'Failed to remove profile.', detail: error.message },
        { status: 500 },
      );
    }
  }

  // 3. Delete the auth.users row itself. Only the service role can do this.
  {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json(
        { error: 'Failed to remove auth user.', detail: error.message },
        { status: 500 },
      );
    }
  }

  // 4. Sign out the caller so their cookie session stops working.
  await supabase.auth.signOut().catch(() => undefined);

  return NextResponse.json(
    { ok: true, deletedAt: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
