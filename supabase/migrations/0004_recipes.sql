-- Recipes and their translations, ingredients, steps, dietary tags, allergens, media.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  description_en text,
  origin_country_id uuid references public.countries(id),
  prep_minutes int not null check (prep_minutes >= 0),
  cook_minutes int not null check (cook_minutes >= 0),
  total_minutes int not null check (total_minutes > 0),
  difficulty recipe_difficulty not null default 'easy',
  meal_types text[] not null default '{}',
  servings int not null check (servings > 0),
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  editorial_state editorial_state not null default 'draft',
  authenticity_review authenticity_review_state not null default 'unreviewed',

  -- Provenance / licensing
  content_owner text not null,
  ownership_type ownership_type not null default 'emrooz_owned',
  source_provider text,
  source_recipe_id text,
  source_url text,
  source_terms_url text,
  source_terms_version text,
  source_license text,
  source_license_url text,
  attribution_text text,
  attribution_url text,
  storage_permission storage_permission not null default 'permanent',
  image_storage_permission storage_permission,
  imported_at timestamptz,
  last_synced_at timestamptz,
  content_hash text,

  version int not null default 1 check (version > 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recipes_touch_updated_at
before update on public.recipes
for each row execute function public.touch_updated_at();

create index if not exists recipes_editorial_idx on public.recipes (editorial_state);
create index if not exists recipes_difficulty_idx on public.recipes (difficulty);
create index if not exists recipes_total_minutes_idx on public.recipes (total_minutes);
create index if not exists recipes_slug_idx on public.recipes (slug);

-- Cuisine and region cross-links
create table if not exists public.recipe_cuisines (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  cuisine_id uuid not null references public.cuisines(id) on delete cascade,
  primary key (recipe_id, cuisine_id)
);

create table if not exists public.recipe_regions (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  region_id uuid not null references public.regions(id) on delete cascade,
  primary key (recipe_id, region_id)
);

create index if not exists recipe_cuisines_cuisine_idx on public.recipe_cuisines (cuisine_id);
create index if not exists recipe_regions_region_idx on public.recipe_regions (region_id);

-- Structured ingredients per recipe
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  position int not null default 0,
  quantity numeric,
  unit text,
  note_en text,
  optional boolean not null default false,
  group_en text
);

create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- Ordered instruction steps
create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_order int not null,
  text_en text not null,
  duration_minutes int,
  unique (recipe_id, step_order)
);

-- Translations
create table if not exists public.recipe_translations (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  locale text not null,
  title text not null,
  description text,
  alternative_names text[] not null default '{}',
  primary key (recipe_id, locale)
);

create table if not exists public.recipe_step_translations (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_order int not null,
  locale text not null,
  text text not null,
  primary key (recipe_id, step_order, locale)
);

-- Recipe version history — see CLAUDE.md §36.
create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  editor_id uuid references public.profiles(id),
  change_reason text,
  created_at timestamptz not null default now(),
  unique (recipe_id, version)
);

-- Media assets — Emrooz-owned or explicitly licensed. Track image rights per asset.
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes(id) on delete cascade,
  storage_bucket text not null default 'recipe-images',
  storage_path text not null,
  url text,
  license text,
  license_url text,
  attribution text,
  creator text,
  storage_permission storage_permission not null default 'permanent',
  checksum text,
  imported_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS: only published recipes are readable by the public.
alter table public.recipes enable row level security;
alter table public.recipe_cuisines enable row level security;
alter table public.recipe_regions enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_translations enable row level security;
alter table public.recipe_step_translations enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.media_assets enable row level security;

create policy "recipes_public_published" on public.recipes
  for select using (editorial_state = 'published');
create policy "recipes_staff_all" on public.recipes
  for all using (public.is_staff(array['admin', 'editor', 'reviewer']))
  with check (public.is_staff(array['admin', 'editor']));

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'recipe_cuisines', 'recipe_regions', 'recipe_ingredients',
    'recipe_steps', 'recipe_translations', 'recipe_step_translations',
    'media_assets'
  ] loop
    execute format($f$
      create policy "%1$s_public_via_published_recipe" on public.%1$s
      for select using (
        exists (select 1 from public.recipes r
                where r.id = %1$s.recipe_id
                  and r.editorial_state = 'published')
      );
    $f$, tbl);
    execute format($f$
      create policy "%1$s_staff_write" on public.%1$s
      for all using (public.is_staff(array['admin', 'editor']))
      with check (public.is_staff(array['admin', 'editor']));
    $f$, tbl);
  end loop;
end $$;

create policy "recipe_versions_staff_only" on public.recipe_versions
  for all using (public.is_staff()) with check (public.is_staff(array['admin', 'editor']));
