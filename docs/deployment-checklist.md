# Deployment checklist

Single-page release sequence for shipping Emrooz to real users. Every item is either linked to a detailed doc or has a concrete action in this file.

## Pre-launch — one-time operator setup

### Legal + policy

- [ ] Replace placeholders in [`/privacy`](/privacy), [`/terms`](/terms), and [`/imprint`](/imprint) with lawyer-reviewed content.
- [ ] Confirm essential-cookies-only stance still holds (no analytics added). If it changes, replace the disclosure banner with a real consent flow (see [`apps/web/src/app/essential-cookies.tsx`](../apps/web/src/app/essential-cookies.tsx)).
- [ ] Publish a privacy contact address you actively monitor and route it into an incident-response workflow.

### Domains + hosting

- [ ] Register / confirm ownership of `emroozapp.com`.
- [ ] Configure `www.emroozapp.com → emroozapp.com` 301 redirect at the DNS or CDN layer.
- [ ] Provision an HTTPS certificate (managed by your hosting platform is fine).
- [ ] Point the DNS A / AAAA / CNAME records at your Next.js host (Vercel, Netlify, self-hosted with a reverse proxy — all fine).
- [ ] Verify the site is reachable at `https://emroozapp.com/`.

### Supabase project

Follow [`docs/backend-setup.md`](./backend-setup.md) for the details. Summary:

- [ ] Create a Supabase project in the desired region.
- [ ] `supabase link --project-ref <ref>` locally.
- [ ] `supabase db push` to apply every migration in `supabase/migrations/`.
- [ ] Enable **Anonymous sign-ins** in Auth → Providers.
- [ ] Add the production and preview URLs to Auth → URL Configuration.
- [ ] Insert your first `staff_members` row via SQL Editor so you can reach `/admin`.
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the hosting platform's env store.

### Provider (TheMealDB)

- [ ] Re-review the current terms at <https://www.themealdb.com/terms_of_use.php> and update the review date in [`docs/recipe-sourcing-and-licensing.md`](./recipe-sourcing-and-licensing.md).
- [ ] Purchase a **supporter key** on Patreon (required before shipping to app stores per their terms) and set `THEMEALDB_API_KEY` on the hosting platform's env store.
- [ ] Insert a `providers` row and a matching `provider_terms_reviews` row via the Admin UI or SQL Editor. The `/admin/providers` page will show a warning until this exists.

### Backups

Follow [`docs/backup-and-restore.md`](./backup-and-restore.md). Concretely:

- [ ] Set every `BACKUP_*` env var in your scheduler's environment.
- [ ] Schedule `pnpm backup:database` daily.
- [ ] Schedule `pnpm backup:media` weekly.
- [ ] Run each script once by hand and verify the encrypted objects land in S3.
- [ ] Restore from one of them into a scratch database as a live test.
- [ ] Add an alert on backup-job failure (job exits non-zero and logs `event: backup.failed`).

### Web deployment

- [ ] `pnpm build:web` succeeds in CI.
- [ ] Deployment platform builds from `apps/web/` with `pnpm i && pnpm build:web`.
- [ ] Env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `THEMEALDB_API_KEY`, `EMROOZ_BASE_URL=https://emroozapp.com`.
- [ ] Middleware refreshes sessions correctly (test by signing in and refreshing).
- [ ] `/api/providers` returns 401 for anonymous users and 200 for a staff row.
- [ ] `/api/account/export` returns a valid JSON download when signed in.
- [ ] `/api/account/delete` (with confirm phrase `DELETE`) empties every user-scoped table and drops the auth user.
- [ ] `/robots.txt` and `/sitemap.xml` respond, and the sitemap references only public routes.

### Mobile builds

Follow [`docs/mobile-release.md`](./mobile-release.md). Concretely:

- [ ] Register a Bundle ID / Package name (currently `com.emroozapp.mobile` — replace if that conflicts with an existing app on your Apple/Google account).
- [ ] Provision an EAS project: `eas init` from `apps/mobile/`, paste the returned project id into `expo.extra.eas.projectId` in `apps/mobile/app.json`, and the account slug into `expo.owner`.
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_EMROOZ_BASE_URL` on the EAS build profile (or in `app.json → expo.extra` for testing).
- [ ] Generate icons: `pnpm mobile:icons` (regenerates from `apps/web/public/icon-512.svg`).
- [ ] Verify a dev build with `eas build --profile development --platform ios --local` (or `android`).
- [ ] Upload the previous mobile release checklist items to your internal tracker.

### App store submission (when ready to ship)

- [ ] App Store Connect: create a new app record with the Bundle ID above.
- [ ] Google Play Console: create a new app record with the Package name above.
- [ ] Fill in privacy questionnaire — Emrooz's V1 answer is "no data collected for tracking" and "user identifiers used only for app functionality".
- [ ] Provide screenshots that show a **globally-varied** experience (not only Afghan recipes — see [`docs/mobile-release.md`](./mobile-release.md#screenshots-and-store-copy)).
- [ ] App description presents Emrooz as a general-purpose cooking assistant.
- [ ] Support URL: your public contact page.
- [ ] Delete-account URL: `/settings` on the web app (App Store requires an accessible deletion pathway).
- [ ] `eas build --profile production --platform ios` and submit via `eas submit`.
- [ ] `eas build --profile production --platform android` and submit via `eas submit`.

## Ongoing operations

- Re-review provider terms at least every 6 months. Update the terms-review record in the admin UI.
- Rotate backup encryption keys annually. Keep the previous key available for the retention window (13 months).
- Renew the TheMealDB supporter subscription before it lapses.
- Restore drill from an encrypted backup at least quarterly.
- Review the OWASP top 10 checklist against Emrooz's surface area whenever a new integration lands.

## Rolling back

If a release breaks something visible:

- **Web**: redeploy the previous artifact from your platform's deploy history — the app itself is stateless.
- **Mobile**: publish an EAS Update to the affected channel; if the break is in a native module, submit a new store build and use phased rollout to soften the impact.
- **Database**: restore from the most recent good encrypted backup per [`docs/backup-and-restore.md`](./backup-and-restore.md).

## Definition of "shipped"

- All checkboxes above are ticked.
- CI is green on `main`.
- One human other than the release owner has used the live app end-to-end (sign up, cook a recipe, plan a week, sign out).
- Backups have run successfully for at least three consecutive days without alerts.
