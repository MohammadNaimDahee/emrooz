-- Per-user private data: pantry, favorites, cooking history, feedback,
-- meal plan entries, shopping list. Only the owner can read or write.

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric,
  unit text,
  added_at timestamptz not null default now(),
  unique (user_id, ingredient_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  favorited_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create table if not exists public.cooking_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  cooked_on date not null,
  servings int not null check (servings > 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  feedback feedback_kind not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  shown_at timestamptz not null default now(),
  context text not null default 'today'
);

create table if not exists public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner')),
  servings int not null check (servings > 0),
  created_at timestamptz not null default now(),
  unique (user_id, date, meal)
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete set null,
  label text,
  quantity numeric,
  unit text,
  source_recipe_ids uuid[] not null default '{}',
  checked boolean not null default false,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ingredient_id is not null or (label is not null and length(label) > 0))
);

create trigger shopping_list_items_touch_updated_at
before update on public.shopping_list_items
for each row execute function public.touch_updated_at();

create index if not exists pantry_items_user_idx on public.pantry_items (user_id);
create index if not exists favorites_user_idx on public.favorites (user_id);
create index if not exists cooking_history_user_idx on public.cooking_history (user_id);
create index if not exists cooking_history_recent_idx on public.cooking_history (user_id, cooked_on desc);
create index if not exists meal_plan_range_idx on public.meal_plan_entries (user_id, date);
create index if not exists shopping_list_user_idx on public.shopping_list_items (user_id);
create index if not exists impressions_user_idx on public.recommendation_impressions (user_id, shown_at desc);

alter table public.pantry_items enable row level security;
alter table public.favorites enable row level security;
alter table public.cooking_history enable row level security;
alter table public.recommendation_feedback enable row level security;
alter table public.recommendation_impressions enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.shopping_list_items enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'pantry_items', 'favorites', 'cooking_history',
    'recommendation_feedback', 'recommendation_impressions',
    'meal_plan_entries', 'shopping_list_items'
  ] loop
    execute format($f$create policy "%1$s_owner" on public.%1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id);$f$, tbl);
  end loop;
end $$;
