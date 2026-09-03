# Backend setup — running Emrooz on Supabase

By default, Emrooz runs in local demo mode against a bundled dataset. This document walks through switching to a real Supabase backend.

## 1. Prerequisites

- Supabase account (free tier is fine)
- Supabase CLI: `brew install supabase/tap/supabase`
- Docker Desktop (for local Supabase)

## 2. Local Supabase (recommended for development)

```bash
supabase start                       # boots Postgres, Auth, Storage, Studio in Docker
pnpm supabase:reset                  # applies migrations and the safe seed
```

The CLI prints a set of URLs and keys after `supabase start`. Copy them into `.env` at the repo root:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon key>
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key>   # server-only, never bundled
```

Also enable **anonymous sign-ins** in `supabase/config.toml`:

```toml
[auth]
enable_anonymous_sign_ins = true
```

(Restart Supabase after editing.)

Studio: <http://127.0.0.1:54323>

## 3. Hosted Supabase (staging or production)

1. Create a project at <https://supabase.com>.
2. Link the CLI: `supabase link --project-ref <your-ref>`.
3. Push migrations: `supabase db push`.
4. Copy the anon / service_role keys into your deployment's env vars.
5. In the dashboard: **Authentication → Providers → Anonymous** — enable it.
6. In the dashboard: **Authentication → URL Configuration** — add your site URL and any preview URLs to the allowlist.

## 4. Web configuration

`.env.local` in `apps/web/` (or the deployment platform's env vars):

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # server routes only, never bundled
THEMEALDB_API_KEY=...             # server routes only, never bundled
```

When these env vars are present, `apps/web/src/lib/data.ts` returns a Supabase-backed `EmroozData`. The middleware in `apps/web/middleware.ts` refreshes the session cookie on every request so server components and route handlers see the same authenticated user.

The demo adapter continues to be used when the env vars are missing — no code changes required.

**Server-only env vars.** `SUPABASE_SERVICE_ROLE_KEY` and `THEMEALDB_API_KEY` must never be prefixed with `NEXT_PUBLIC_` — that would inline them into the client bundle. External provider calls go through `/api/providers/*` route handlers (see [`recipe-sourcing-and-licensing.md`](./recipe-sourcing-and-licensing.md#server-side-proxy-pattern)).

## 5. Mobile configuration

Add to `apps/mobile/.env` or use the standard Expo `EXPO_PUBLIC_*` mechanism:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Alternatively add them to `app.json` under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_SUPABASE_URL": "...",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
    }
  }
}
```

The mobile app persists the session in AsyncStorage via `@supabase/supabase-js`. On first launch, `ensureSession()` in `apps/mobile/src/data/supabase.ts` calls `supabase.auth.signInAnonymously()` if there's no active session, so RLS `auth.uid()` returns a real UUID for guests.

## 6. Verify

1. Boot the web app: `pnpm dev:web` → visit `/app`.
2. Open Supabase Studio → **Table editor → profiles** — you should see one row created by the `handle_new_auth_user()` trigger.
3. Add a pantry ingredient in the app, then in Studio check `pantry_items` — the row should be `user_id`-scoped to your anonymous user.
4. Sign out and sign in again — data persists.
5. Grant yourself staff access to test provider routes: in Studio, insert into `public.staff_members` with your user id and role `admin`. Then hit `curl http://localhost:3005/api/providers -H "Cookie: <session-cookies>"` — you should see the TheMealDB provider entry with `hasCredentials`.

## 7. Common issues

- **No profile row after sign-in** — verify the `0007_auth_user_profile_bridge.sql` migration ran (`supabase db push`). The trigger is what creates profile rows.
- **Anonymous sign-in returns 422** — anonymous sign-ins are disabled at the project level. Enable in Studio or `config.toml`.
- **RLS errors on writes** — every write requires an authenticated `auth.uid()`. Make sure the browser client shows a session and cookies aren't blocked.
- **Middleware error `cookies() must be async`** — using Next.js 15+ with an outdated `@supabase/ssr`. Upgrade to the version pinned in `apps/web/package.json`.

## 8. Rolling back to demo mode

Remove the Supabase env vars (or set `EMROOZ_DEMO_MODE=on`). Restart the dev server. The app boots against the bundled seed and no calls go to Supabase.
