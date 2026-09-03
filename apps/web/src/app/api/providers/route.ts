import { NextResponse } from 'next/server';
import { requireStaff } from '../../../lib/staff-auth';
import { listProviders } from '../../../lib/providers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/providers — list configured providers with credential status and rate limits.
 * Requires an authenticated staff member.
 */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ providers: listProviders() }, { headers: { 'cache-control': 'no-store' } });
}
