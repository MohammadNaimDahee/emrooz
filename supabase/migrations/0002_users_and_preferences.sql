-- Emrooz user profile and preference tables. Rows are 1:1 with auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  display_name text,
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_self_upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_staff_read" on public.profiles
  for select using (public.is_staff());

-- User preferences captured during onboarding.
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  language text not null default 'en',
  household_size int not null default 2 check (household_size between 1 and 20),
  max_cook_minutes int check (max_cook_minutes is null or max_cook_minutes > 0),
  preferred_difficulty recipe_difficulty,
  reminder_enabled boolean not null default false,
  reminder_time time,
  cuisine_ids uuid[] not null default '{}',
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  disliked_ingredient_ids uuid[] not null default '{}',
  pantry_seed_ingredient_ids uuid[] not null default '{}',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_touch_updated_at
before update on public.user_preferences
for each row execute function public.touch_updated_at();

alter table public.user_preferences enable row level security;

create policy "prefs_self" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
