-- Emrooz launch taxonomy: countries + cuisines from CLAUDE.md §30.
-- Safe to re-run — every insert is `on conflict do nothing`.
--
-- Run against local Supabase:
--   docker exec -i supabase_db_emrooz psql -U postgres -d postgres \
--     < supabase/seed-launch-cuisines.sql
--
-- Run against a hosted project:
--   psql "$DATABASE_URL" -f supabase/seed-launch-cuisines.sql

begin;

-- Countries whose cuisines Emrooz ships at launch. ISO alpha-2 code as slug.
insert into public.countries (code, name_en) values
  ('af', 'Afghanistan'),
  ('ir', 'Iran'),
  ('tr', 'Turkey'),
  ('pk', 'Pakistan'),
  ('in', 'India'),
  ('uz', 'Uzbekistan'),      -- central asia
  ('sa', 'Saudi Arabia'),    -- arab / middle east
  ('it', 'Italy'),
  ('fr', 'France'),
  ('es', 'Spain'),
  ('at', 'Austria'),
  ('de', 'Germany'),
  ('gr', 'Greece'),
  ('gb', 'United Kingdom'),
  ('cn', 'China'),
  ('jp', 'Japan'),
  ('kr', 'South Korea'),
  ('th', 'Thailand'),
  ('vn', 'Vietnam'),
  ('mx', 'Mexico'),
  ('br', 'Brazil'),
  ('ma', 'Morocco'),         -- north africa
  ('sn', 'Senegal'),         -- west africa
  ('et', 'Ethiopia'),        -- east africa
  ('us', 'United States'),
  ('pt', 'Portugal')         -- other european
on conflict (code) do nothing;

-- Launch cuisines. `primary_country_id` is looked up by country code so the
-- insert is idempotent even if country UUIDs differ between environments.
with c as (
  select code, id from public.countries
)
insert into public.cuisines (slug, name_en, primary_country_id)
select v.slug, v.name_en, c.id
from (values
  ('afghan',           'Afghan',            'af'),
  ('iranian',          'Iranian',           'ir'),
  ('turkish',          'Turkish',           'tr'),
  ('pakistani',        'Pakistani',         'pk'),
  ('indian',           'Indian',            'in'),
  ('central-asian',    'Central Asian',     'uz'),
  ('arab',             'Arab & Middle Eastern', 'sa'),
  ('italian',          'Italian',           'it'),
  ('french',           'French',            'fr'),
  ('spanish',          'Spanish',           'es'),
  ('austrian',         'Austrian',          'at'),
  ('german',           'German',            'de'),
  ('greek',            'Greek',             'gr'),
  ('british',          'British',           'gb'),
  ('chinese',          'Chinese',           'cn'),
  ('japanese',         'Japanese',          'jp'),
  ('korean',           'Korean',            'kr'),
  ('thai',             'Thai',              'th'),
  ('vietnamese',       'Vietnamese',        'vn'),
  ('mexican',          'Mexican',           'mx'),
  ('brazilian',        'Brazilian',         'br'),
  ('north-african',    'North African',     'ma'),
  ('west-african',     'West African',      'sn'),
  ('east-african',     'East African',      'et'),
  ('american',         'American',          'us'),
  ('portuguese',       'Portuguese',        'pt')
) as v(slug, name_en, country_code)
left join c on c.code = v.country_code
on conflict (slug) do nothing;

commit;

select count(*) as countries_total from public.countries;
select count(*) as cuisines_total from public.cuisines;
