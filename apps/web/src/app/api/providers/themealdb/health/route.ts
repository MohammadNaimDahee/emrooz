import { NextResponse } from 'next/server';
import { requireStaff } from '../../../../../lib/staff-auth';
import { getTheMealDbProvider } from '../../../../../lib/providers';
import { providerLimiter } from '../../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/providers/themealdb/health — issues a lightweight probe against
 * the provider and returns the round-trip result. Staff-only, rate-limited
 * to keep the shared key inside its quota under refresh-storm conditions.
 */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;

  const gate = providerLimiter.take(`themealdb:health:${auth.userId}`);
  if (!gate.allowed) return tooMany(gate.retryAfterMs);

  const provider = getTheMealDbProvider();
  if (!provider.hasCredentials()) {
    return NextResponse.json(
      { error: 'THEMEALDB_API_KEY is not set on the server.' },
      { status: 501 },
    );
  }
  const health = await provider.health();
  return NextResponse.json({ provider: 'themealdb', health }, { headers: { 'cache-control': 'no-store' } });
}

function tooMany(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded.' },
    { status: 429, headers: { 'retry-after': Math.ceil(retryAfterMs / 1000).toString() } },
  );
}
