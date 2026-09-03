import 'server-only';
import { redirect } from 'next/navigation';

import { getServerSupabase } from './supabase-server';
import { STAFF_ROLES, type StaffRole } from './staff-auth';

export interface AdminGate {
  userId: string;
  email: string | null;
  role: StaffRole;
}

/**
 * Server-side guard for the admin section. Redirects to sign-in if the user
 * has no session, to the home page if they're signed in but lack a staff row.
 *
 * Both flows keep the admin area invisible to non-staff — no message, no
 * flicker of the layout, no leaked existence of specific routes.
 */
export async function requireAdmin(
  allowedRoles: readonly StaffRole[] = STAFF_ROLES,
): Promise<AdminGate> {
  const supabase = await getServerSupabase();
  if (!supabase) redirect('/');

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) redirect('/auth/sign-in?next=/admin');

  const { data: staff } = await supabase
    .from('staff_members')
    .select('role')
    .eq('user_id', user.id)
    .in('role', [...allowedRoles])
    .maybeSingle();

  if (!staff) redirect('/');

  return {
    userId: user.id,
    email: user.email ?? null,
    role: staff.role as StaffRole,
  };
}
