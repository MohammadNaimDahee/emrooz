# Architecture

Emrooz is a pnpm + Turborepo monorepo with a strong separation between framework-agnostic domain logic and the presentation layers.

```
apps/mobile          Expo React Native (iOS, Android)
apps/web             Next.js App Router (web + PWA + admin)
packages/types       Shared domain types
packages/validation  Zod schemas mirroring the types
packages/i18n        English + German + Dari + Pashto translations, RTL metadata
packages/core        Framework-agnostic domain services (dates, seeded PRNG,
                     ingredient alias index, scaling, dietary safety, pantry match)
packages/recommendations
                     Weighted recommendation engine + explainable score breakdown
packages/database    Repository contracts + in-memory demo adapter + seed data
packages/recipe-providers
                     Provider interface + TheMealDB adapter
packages/recipe-import
                     Ingestion, normalization, dedup, staging pipeline
supabase/migrations  Versioned Postgres schema + RLS policies
```

## Runtime data flow (mobile & web)

1. Presentation layer creates a repository set via `createDemoData()` (or a Supabase adapter once configured).
2. Screens fetch data via TanStack Query.
3. The `@emrooz/recommendations` engine runs entirely on-device, using the loaded recipe set, ingredients, pantry, favorites, history, feedback, and impressions to produce today's picks.
4. Guest identity is stored locally (AsyncStorage on mobile, localStorage on web). Preferences persist alongside.
5. When Supabase credentials are configured, the same repository interface is implemented against Supabase and the app's business logic remains unchanged.

## Why this shape

- **Portability**: nothing in `packages/*` depends on React, React Native, Next.js, or Supabase. This satisfies CLAUDE.md §43 — Emrooz can move to another Postgres provider without rewriting business logic.
- **Explainability**: the recommendation engine returns a `ScoreBreakdown` and a human-readable reason, so the UI can show *why* it's suggesting a recipe.
- **Safety by construction**: dietary and allergy filters live in `@emrooz/core/dietary` and are applied before scoring. There is no code path that can produce a recommendation which fails safety.

See also: [`data-model.md`](./data-model.md), [`recommendation-engine.md`](./recommendation-engine.md), [`recipe-sourcing-and-licensing.md`](./recipe-sourcing-and-licensing.md).
