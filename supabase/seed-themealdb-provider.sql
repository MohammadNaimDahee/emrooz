-- Register TheMealDB as an import provider and log a terms-review row.
-- Both are required before the API + admin UI will run imports (see
-- packages/recipe-providers + apps/web/src/app/api/providers/themealdb).
--
-- Terms URL and permissions reflect TheMealDB's terms as reviewed on the
-- date embedded in CLAUDE.md §26. Re-check the live terms before any
-- public app-store release.
--
-- Idempotent — safe to re-run.

insert into public.providers (key, display_name, enabled) values
  ('themealdb', 'TheMealDB', true)
on conflict (key) do update set
  display_name = excluded.display_name,
  enabled = excluded.enabled,
  updated_at = now();

insert into public.provider_terms_reviews (
  provider_id,
  reviewer,
  terms_url,
  terms_version,
  allows_storage,
  allows_modification,
  allows_commercial_use,
  requires_attribution,
  notes
)
select
  p.id,
  'dev-bootstrap',
  'https://www.themealdb.com/terms_of_use.php',
  '2026-09',
  true,   -- allows_storage:       yes with attribution
  true,   -- allows_modification:  yes
  false,  -- allows_commercial_use: only with paid supporter key; DEV ONLY
  true,   -- requires_attribution: yes
  'Reviewed against the free public dev key ("1"). App-store release requires the paid supporter key per TheMealDB terms.'
from public.providers p
where p.key = 'themealdb'
and not exists (
  select 1 from public.provider_terms_reviews r where r.provider_id = p.id
);

select p.key, p.enabled, r.reviewed_at, r.allows_storage
from public.providers p
left join public.provider_terms_reviews r on r.provider_id = p.id
where p.key = 'themealdb';
