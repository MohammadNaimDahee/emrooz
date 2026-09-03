# Backup and restore

Emrooz applies defense in depth (CLAUDE.md §42):

1. Supabase managed backups (production).
2. Automated logical Postgres dumps via `pnpm backup:database`.
3. Encrypted off-site storage separate from the main Supabase project.
4. Separate backup of Supabase Storage files via `pnpm backup:media`.
5. Version-controlled migrations in `supabase/migrations/`.
6. Portable JSON export of Emrooz-owned recipes via `pnpm recipes:export`.
7. Documented restore procedure (below).
8. Backup-failure monitoring alerts (wire up per environment).
9. Quarterly restore drills.

## Recommended policy

- Daily database backup
- Weekly full recipe + media export
- Monthly long-term snapshot
- At least one backup stored with a different provider than Supabase

## Restore procedure

1. Provision a new Supabase project (or another Postgres).
2. Apply migrations: `pnpm supabase:reset` or replay `supabase/migrations/*.sql` in order.
3. Restore the most recent logical dump.
4. Restore Storage buckets from the media backup.
5. Verify: cuisine index loads, published recipes appear, RLS blocks anonymous access to private tables.
6. Rotate any exposed credentials.

## Data portability

`pnpm recipes:export` writes provider-neutral JSON containing recipes, translations, ingredients, aliases, ingredient links, instructions, cuisine and region metadata, dietary and allergen data, and provenance. This is the format used to migrate Emrooz off Supabase if ever necessary.

## Deleted users and backups

Account deletion (via `POST /api/account/delete`, wired to the Settings page on both platforms) drops every user-scoped row and the `auth.users` record for that user at the moment the request completes. **Existing backups taken before that moment still contain the user's data** — that is unavoidable and expected.

Retention policy (V1):

- Daily database backups are kept for **30 days**, then rotated out.
- Weekly full backups are kept for **90 days**.
- Monthly long-term snapshots are kept for **13 months**.

Practical consequence: a deletion request is fully honored across all backups no later than **13 months** after the request. This is disclosed in the privacy notice; deletion requests do not accelerate backup rotation.

If a regulator or the user requires earlier purging (e.g. GDPR erasure with immediate effect across archives), the operator must:

1. Identify every backup file containing the user's `auth.users` id.
2. Either restore each backup, delete the user's rows again, and re-encrypt/re-upload; or destroy the affected backup file if losing the whole snapshot is acceptable.
3. Log the action against the deletion request record.

This process is manual today. Automating it is future work; if you need it before then, contact the operator via the details in `apps/web/src/app/imprint/page.tsx`.
