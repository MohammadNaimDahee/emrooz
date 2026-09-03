import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '../../../../../lib/staff-auth';
import { getTheMealDbProvider } from '../../../../../lib/providers';
import { providerLimiter } from '../../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/providers/themealdb/search?q=&area=
 *
 * Proxies a TheMealDB search or filter-by-area request. Returns canonical
 * CanonicalImportCandidate objects so downstream consumers don't get coupled
 * to TheMealDB's raw response shape.
 *
 * Staff-only. Rate-limited per (route, user).
 */
export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;

  const gate = providerLimiter.take(`themealdb:search:${auth.userId}`);
  if (!gate.allowed) return tooMany(gate.retryAfterMs);

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() || undefined;
  const area = url.searchParams.get('area')?.trim() || undefined;
  const page = Number.parseInt(url.searchParams.get('page') ?? '', 10) || undefined;
  const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '', 10) || undefined;

  if (!query && !area) {
    return NextResponse.json(
      { error: 'Provide `q` or `area` as a query parameter.' },
      { status: 400 },
    );
  }

  const provider = getTheMealDbProvider();
  if (!provider.hasCredentials()) {
    return NextResponse.json(
      { error: 'THEMEALDB_API_KEY is not set on the server.' },
      { status: 501 },
    );
  }

  try {
    const results = await provider.search({ query, area, page, pageSize });
    return NextResponse.json(
      { provider: 'themealdb', count: results.length, results },
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
