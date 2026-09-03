# Data model

Emrooz stores its own canonical copy of every recipe. External providers are ingestion sources; the runtime source of truth is the Emrooz Postgres database.

## Recipe

- `id` UUID
- `slug` unique kebab-case slug
- `title` localized (`title_en`; `recipe_translations` for other locales)
- `alternative_names` per locale (e.g. Qabuli Palaw / Kabuli Pulao)
- `description` optional localized
- `origin_country_id`, `cuisine_ids`, `region_ids`
- `prep_minutes`, `cook_minutes`, `total_minutes` (constraint: total > 0)
- `difficulty` enum (easy | medium | hard)
- `meal_types` string array
- `servings`
- Structured `recipe_ingredients` with `ingredient_id`, `quantity`, `unit`, optional `note`, `optional`, `group`
- Ordered `recipe_steps` with translations
- Dietary tags and allergen arrays
- Provenance and licensing block (CLAUDE.md §31)
- Editorial state (draft / imported / needs_review / reviewed / published / rejected / archived)
- Authenticity review state (unreviewed / family_reviewed / community_reviewed / expert_reviewed)
- Version number + immutable `recipe_versions` audit table

## Ingredient

Canonical name + per-locale translations + alias table. Aliases include colloquial and regional spellings ("cilantro" / "coriander leaves", "aubergine" / "eggplant" / "brinjal"). Category, common units, allergens, and dietary compatibility JSON (per dietary tag => compatible | incompatible | unknown) allow the recommendation engine to make safety decisions without guessing.

## User private data

`profiles`, `user_preferences`, `pantry_items`, `favorites`, `cooking_history`, `recommendation_feedback`, `recommendation_impressions`, `meal_plan_entries`, `shopping_list_items` — all owner-only via RLS.

## Importers

`providers`, `provider_terms_reviews`, `import_batches`, `import_candidates`, `import_errors` back the admin review interface.

See `supabase/migrations/` for the full SQL and the RLS policies enforcing these rules.
