import { NextResponse } from 'next/server';
import { getServerSupabase } from './supabase-server';

/**
 * Roles recognised in public.staff_members. Kept in sync with
 * supabase/migrations/0001_extensions_and_enums.sql.
 */
export const STAFF_ROLES = ['admin', 'editor', 'reviewer'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface StaffContext {
  userId: string;
  role: StaffRole;
}

/**
 * Resolve the current user and confirm they are a member of the requested
 * staff roles. Returns either a NextResponse for the caller to return
 * unchanged, or the StaffContext with the user id and effective role.
 *
 * Order of failures:
 *  - 503 when Supabase is not configured — the route is unavailable.
 *  - 401 when there is no authenticated user.
 *  - 403 when the user has no matching staff row.
 *
 * The route handler pattern:
 *   const auth = await requireStaff(['admin', 'editor']);
 *   if (auth instanceof NextResponse) return auth;
 *   // ... use auth.userId, auth.role
 */
export async function requireStaff(
  roles: readonly StaffRole[] = STAFF_ROLES,
): Promise<StaffContext | NextResponse> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Provider routes require Supabase configuration.' },
      { status: 503 },
    );
  }

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { data: staff } = await supabase
    .from('staff_members')
    .select('role')
    .eq('user_id', user.id)
    .in('role', [...roles])
    .maybeSingle();
  if (!staff) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  }

  return { userId: user.id, role: staff.role as StaffRole };
}
