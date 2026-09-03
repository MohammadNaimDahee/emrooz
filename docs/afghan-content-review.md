# Afghan content review workflow

Afghan cuisine is Emrooz's flagship curated collection at launch. This is a content strategy, not a product identity — Emrooz remains a global cooking app. See CLAUDE.md §29.

## Workflow

1. Draft recipe (from a family submission, community contributor, or written in-house).
2. Store in `recipes` with `editorial_state = 'draft'` and `authenticity_review = 'unreviewed'`.
3. Move to `needs_review` when the entry has structured ingredients, ordered steps, provenance, and images.
4. A reviewer with domain knowledge (family / community / expert) updates `authenticity_review`.
5. When both editorial and authenticity checks are complete, an admin moves the recipe to `published`.

Only `editorial_state = 'published'` recipes are visible to end users. Recipes remain owned by Emrooz for editing purposes even when authenticity relies on external reviewers — the workflow supports honoring reviewer preferences without giving up editorial control.

## What we never do

- Claim that one household's version of a recipe is the only authentic version.
- Publish an unreviewed Afghan recipe as authoritative.
- Fabricate cultural authority. Regional and household variations are welcomed and labeled.
