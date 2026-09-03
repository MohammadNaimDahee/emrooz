-- Countries, regions, cuisines, ingredients and their translations.

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name_en text not null,
  created_at timestamptz not null default now(),
  unique (country_id, name_en)
);

create table if not exists public.cuisines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  primary_country_id uuid references public.countries(id),
  created_at timestamptz not null default now()
);

-- Master ingredient catalogue.
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  category text not null default 'other',
  common_units text[] not null default '{}',
  allergens text[] not null default '{}',
  dietary_compatibility jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ingredients_touch_updated_at
before update on public.ingredients
for each row execute function public.touch_updated_at();

-- One-to-many aliases per (ingredient, locale).
create table if not exists public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  locale text not null default 'en',
  alias text not null,
  created_at timestamptz not null default now(),
  unique (ingredient_id, locale, alias)
);

create table if not exists public.ingredient_translations (
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  locale text not null,
  name text not null,
  primary key (ingredient_id, locale)
);

create table if not exists public.allergens (
  code text primary key,
  name_en text not null
);

create table if not exists public.dietary_tags (
  code text primary key,
  name_en text not null
);

-- These taxonomy tables are world-readable, staff-writable.
alter table public.countries enable row level security;
alter table public.regions enable row level security;
alter table public.cuisines enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.ingredient_translations enable row level security;
alter table public.allergens enable row level security;
alter table public.dietary_tags enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'countries', 'regions', 'cuisines', 'ingredients',
    'ingredient_aliases', 'ingredient_translations', 'allergens', 'dietary_tags'
  ] loop
    execute format($f$create policy "%1$s_public_read" on public.%1$s for select using (true);$f$, tbl);
    execute format($f$create policy "%1$s_staff_write" on public.%1$s for all using (public.is_staff(array['admin', 'editor'])) with check (public.is_staff(array['admin', 'editor']));$f$, tbl);
  end loop;
end $$;

create index if not exists ingredients_slug_idx on public.ingredients (slug);
create index if not exists ingredients_category_idx on public.ingredients (category);
