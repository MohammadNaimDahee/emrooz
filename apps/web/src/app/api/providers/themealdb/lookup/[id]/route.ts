import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '../../../../../../lib/staff-auth';
import { getTheMealDbProvider } from '../../../../../../lib/providers';
import { providerLimiter } from '../../../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/providers/themealdb/lookup/[id]
 *
 * Returns a single canonical import candidate for a provider recipe id.
 * Useful for the admin review UI when inspecting a specific candidate.
 * Staff-only. Rate-limited.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;

  const gate = providerLimiter.take(`themealdb:lookup:${auth.userId}`);
  if (!gate.allowed) return tooMany(gate.retryAfterMs);

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const provider = getTheMealDbProvider();
  if (!provider.hasCredentials()) {
    return NextResponse.json(
      { error: 'THEMEALDB_API_KEY is not set on the server.' },
      { status: 501 },
    );
  }

  try {
    const meal = await provider.fetchById(id);
    if (!meal) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json(
      { provider: 'themealdb', meal },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Provider request failed.', detail: String(err) },
      { status: 502 },
    );
  }
}

function tooMany(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded.' },
    { status: 429, headers: { 'retry-after': Math.ceil(retryAfterMs / 1000).toString() } },
  );
}
