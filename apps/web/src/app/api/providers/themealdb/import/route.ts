import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '../../../../../lib/staff-auth';
import { getTheMealDbProvider } from '../../../../../lib/providers';
import { providerLimiter } from '../../../../../lib/rate-limit';
import { runImport } from '@emrooz/recipe-import';
import { INGREDIENTS } from '@emrooz/database/seed';

export const dynamic = 'force-dynamic';

/**
 * POST /api/providers/themealdb/import
 *
 * Body: { area?: string, query?: string, dryRun?: true }
 *
 * Runs the ingestion pipeline against TheMealDB and returns staged
 * CanonicalImportCandidate objects for admin review. When `dryRun` is true
 * (default in V1 — the persistence UI lives in the admin CRUD area, §3),
 * nothing is written to the database. Non-dry runs are refused until §3
 * lands to prevent silent auto-imports.
 *
 * Staff-only, rate-limited.
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaff(['admin', 'editor']);
  if (auth instanceof NextResponse) return auth;

  const gate = providerLimiter.take(`themealdb:import:${auth.userId}`);
  if (!gate.allowed) return tooMany(gate.retryAfterMs);

  let body: { area?: string; query?: string; dryRun?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  if (body.dryRun === false) {
    return NextResponse.json(
      { error: 'Persisted imports require the admin CRUD interface (coming in §3). Send dryRun: true.' },
      { status: 501 },
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
    const result = await runImport(
      provider,
      { area: body.area, query: body.query },
      { ingredients: INGREDIENTS },
    );
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      { error: 'Import failed.', detail: String(err) },
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
