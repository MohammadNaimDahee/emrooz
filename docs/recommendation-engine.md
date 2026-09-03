# Recommendation engine

`@emrooz/recommendations` produces a small ranked list of recipes for today.

## Hard filters (never relaxed)

- Recipes containing any user allergen (contributed by the recipe itself or any of its ingredients).
- Recipes incompatible with a strict dietary restriction. When compatibility cannot be positively verified (ingredient data missing or ambiguous), the recipe is treated as unsafe.
- Recipes containing an ingredient the user marked as disliked.
- Recipes exceeding the explicit maximum cook time (either from user preferences or a quick filter).
- Unpublished, rejected, or archived recipes.

## Scoring (weighted)

- 40% pantry ingredient match
- 25% cuisine preference match
- 20% cooking-history diversity (recently cooked recipes lose ground)
- 15% available-time fit

Layered adjustments (positive and negative) cover favorites, "not today" and "do not like" feedback, household size fit, difficulty fit, meal-type fit, recent exposure penalty, and a bounded daily variation term seeded from `(userId, today)`.

## Explainability

Every recommendation carries a `ScoreBreakdown` (per-component contributions) and a short `reason` string, so the UI can call out the dominant signal — e.g. "Uses 6 of 8 ingredients you already have."

## Stability

The `dailySeed(userId, isoDate)` function ensures identical inputs produce identical results within the same local calendar day. Different days produce different variation, without changing hard-filtered safety behavior.

See `packages/recommendations/tests/engine.test.ts` for the full test matrix.
