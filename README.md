# Emrooz

**What should I cook today?** — a global personal cooking assistant that helps people decide what to cook based on the ingredients they have, the time they have, their tastes, household, dietary needs, cooking history, and preferred cuisines.

Emrooz is a global product from day one. Afghan cuisine is the first fully curated flagship collection because it is underserved by mainstream cooking apps, but every supported cuisine is a first-class citizen. See [`CLAUDE.md`](./CLAUDE.md) §1, §29, §30 for the full positioning.

## Platforms

- iOS + Android — Expo React Native (`apps/mobile`)
- Web + PWA — Next.js App Router (`apps/web`) at [emroozapp.com](https://emroozapp.com)

## Repository layout

```
apps/
  mobile/                 Expo React Native app
  web/                    Next.js (App Router) web + PWA + admin
packages/
  config/                 shared tsconfig, eslint, prettier presets
  types/                  shared domain types
  validation/             Zod schemas
  i18n/                   translations (EN, DE, Dari, Pashto) + RTL flags
  core/                   framework-agnostic domain services
  recommendations/        recommendation & ranking engine
  database/               repository contracts + demo (in-memory) adapter + seed
  recipe-providers/       Provider interface + TheMealDB / Spoonacular / Edamam adapters
  recipe-import/          ingestion, normalization, dedup, validation, review pipeline
supabase/
  migrations/             versioned SQL schema + RLS
  functions/              Edge Functions
  seed.sql                developer seed
docs/                     architecture, data model, recommendation, licensing, backup, deployment
```

## Prerequisites

- Node.js ≥ 20.11
- pnpm ≥ 9 (enable with `corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- (optional) Supabase CLI for local database
- (optional) Xcode / Android Studio for native builds

## Quick start (demo mode, no credentials)

```bash
pnpm install
cp .env.example .env      # leave the Supabase and provider values blank for demo mode
pnpm dev                  # runs web + mobile concurrently
```

The app boots into **local demo mode** whenever Supabase credentials are missing. It reads from a bundled, legally safe seed dataset spanning Afghan, Italian, Japanese, Mexican, Indian, Turkish, and other cuisines.

- Web: <http://localhost:3005>
- Mobile: open the Expo Dev Tools URL that Expo prints in the terminal.

## Common commands

> **Heads up**: pnpm 9 interprets `pnpm somescript` with a colon as a workspace command
> dispatch, not a script call. Prefix commands like `dev:web` / `dev:mobile` /
> `supabase:reset` with `pnpm run` (e.g. `pnpm run dev:mobile`) or scope them with
> `--filter` (e.g. `pnpm --filter @emrooz/mobile dev`). Single-word commands like
> `pnpm dev` / `pnpm test` / `pnpm build` don't need the prefix.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Web + mobile in parallel |
| `pnpm run dev:web` / `pnpm run dev:mobile` | Just one app |
| `pnpm --filter @emrooz/mobile dev` | Equivalent, bypasses turbo |
| `pnpm lint` | ESLint across the workspace |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm test` | Vitest across packages + apps |
| `pnpm test:e2e` | Playwright smoke tests for the web app |
| `pnpm build` / `pnpm run build:web` | Production build |
| `pnpm run supabase:start` | Boots local Supabase |
| `pnpm run supabase:reset` | Reapplies migrations + seed |
| `pnpm run recipes:import -- --area=Afghan` | Import recipes (requires provider key) |
| `pnpm run recipes:validate` / `pnpm run recipes:export` | Validate / export the canonical recipe JSON |
| `pnpm run backup:database` / `pnpm run backup:media` | Encrypted off-site backups |
| `pnpm run mobile:icons` | Regenerate mobile PNG icons from the SVG mark |
| `pnpm backup:database` / `pnpm backup:media` | Encrypted off-site backups |

## Where to look next

- Architecture — [`docs/architecture.md`](./docs/architecture.md)
- Data model — [`docs/data-model.md`](./docs/data-model.md)
- Recommendation engine — [`docs/recommendation-engine.md`](./docs/recommendation-engine.md)
- Recipe sourcing & licensing — [`docs/recipe-sourcing-and-licensing.md`](./docs/recipe-sourcing-and-licensing.md)
- Afghan content review workflow — [`docs/afghan-content-review.md`](./docs/afghan-content-review.md)
- Offline & sync — [`docs/offline-and-sync.md`](./docs/offline-and-sync.md)
- Security & privacy — [`docs/security-and-privacy.md`](./docs/security-and-privacy.md)
- Backup & restore — [`docs/backup-and-restore.md`](./docs/backup-and-restore.md)
- Web deployment — [`docs/web-deployment.md`](./docs/web-deployment.md)
- Mobile release — [`docs/mobile-release.md`](./docs/mobile-release.md)
