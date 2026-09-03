# Recipe sourcing and licensing

Emrooz never scrapes arbitrary websites. External providers are integrated only after their terms are reviewed and recorded in `provider_terms_reviews`. The application source of truth is the Emrooz Postgres database.

## TheMealDB

- API docs: <https://www.themealdb.com/api.php>
- Terms: <https://www.themealdb.com/terms_of_use.php>
- Terms last reviewed for this codebase: **2026-09-02**
- Storage: permanent (Emrooz stores adapted canonical content)
- Attribution: preserved via the recipe's `provenance.attributionText`
- Rate limits: honored by the adapter; check `ProviderRateLimit` in `packages/recipe-providers`
- Production requirement: a supporter key must be obtained before app-store release; the public "1" key is dev-only.

Recheck TheMealDB's terms during implementation and again before every public release. If the terms change materially, use the admin tools to convert affected recipes to `external_link_only` or remove them.

## Spoonacular and Edamam (optional)

These adapters exist as extension points but are not used by default. Their standard terms restrict persistent storage; do not enable them until a review record confirms what may be stored and for how long.

## Adding a new provider

1. Implement the `RecipeProvider` interface in `packages/recipe-providers`.
2. Add a `provider_terms_reviews` row with the URL, allowed uses, and storage mode.
3. The import pipeline stages results into `import_candidates` — never auto-publishes.

## Removal obligations

If a provider revokes permission for previously imported content, the admin tools support archiving affected recipes and stripping provider-hosted image URLs.

## Server-side proxy pattern

Provider API keys must never appear in the web bundle or the mobile bundle. In `apps/web` every provider call goes through a Next.js route handler that reads the key from server-only env, applies auth + rate limiting, and returns canonical shapes from `@emrooz/recipe-providers`.

### Endpoints

All endpoints require an authenticated staff member (`public.staff_members.role in ('admin', 'editor', 'reviewer')`). Rate-limited per (route, user) via `apps/web/src/lib/rate-limit.ts`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/providers` | List configured providers with credential status and rate limits |
| GET | `/api/providers/themealdb/health` | Provider round-trip probe |
| GET | `/api/providers/themealdb/search?q=&area=` | Search or filter-by-area, returns `CanonicalImportCandidate[]` |
| GET | `/api/providers/themealdb/lookup/[id]` | Single candidate by provider id |
| POST | `/api/providers/themealdb/import` | Dry-run staging via the ingestion pipeline. Body: `{ area?, query? }`. Persisted imports refuse with 501 until §3 lands. |

### Error semantics

- **401** — Not signed in.
- **403** — Signed in but not a staff member.
- **429** — Rate limit exceeded. `Retry-After` header (seconds) tells the caller when to try again.
- **501** — Provider is not configured on the server (`THEMEALDB_API_KEY` missing) or the requested operation is not yet available.
- **502** — Provider upstream failure.

### Adding a new provider

1. Implement `RecipeProvider` in `packages/recipe-providers`.
2. Add server-only env vars and a factory function in `apps/web/src/lib/providers.ts`.
3. Add route handlers under `apps/web/src/app/api/providers/<key>/`.
4. Update this document with the new endpoint list and terms review record.
5. Record the terms review in `provider_terms_reviews`.
