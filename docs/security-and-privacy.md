# Security and privacy

## Principles

- Collect only what's needed to make good recommendations.
- Treat allergy and dietary data as sensitive: never used for advertising or third-party sharing.
- Validate on the server; validate again on the client for a good UX.
- Row Level Security policies (see `supabase/migrations/`) enforce ownership at the database, never in the client.

## Secrets

- Public envs (`NEXT_PUBLIC_*`) are safe to ship. Server-only envs (`SUPABASE_SERVICE_ROLE_KEY`, `THEMEALDB_API_KEY`) must never appear in browser or mobile bundles.
- The web app calls providers via Next.js server routes or Supabase Edge Functions. Mobile calls them only through the Emrooz backend.

## Web headers

`next.config.mjs` sets:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restricting camera/microphone/geolocation.

## User rights

Users can export their data and delete their account. The demo mode has these endpoints as stubs; the Supabase adapter will wire them up.
