-- External recipe providers and import pipeline audit tables.
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger providers_touch_updated_at
before update on public.providers
for each row execute function public.touch_updated_at();

create table if not exists public.provider_terms_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  reviewer text not null,
  reviewed_at timestamptz not null default now(),
  terms_url text not null,
  terms_version text,
  allows_storage boolean not null,
  allows_modification boolean not null,
  allows_commercial_use boolean not null,
  requires_attribution boolean not null,
  notes text
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  requested_by uuid references public.profiles(id),
  parameters jsonb not null default '{}'::jsonb,
  totals jsonb not null default '{}'::jsonb
);

create table if not exists public.import_candidates (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  provider_recipe_id text not null,
  raw jsonb not null,
  canonical jsonb,
  matched_recipe_id uuid references public.recipes(id),
  status text not null default 'staged'
    check (status in ('staged', 'normalized', 'duplicate', 'rejected', 'accepted', 'error')),
  reason text,
  created_at timestamptz not null default now(),
  unique (batch_id, provider_recipe_id)
);

create table if not exists public.import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  candidate_id uuid references public.import_candidates(id) on delete set null,
  message text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.providers enable row level security;
alter table public.provider_terms_reviews enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_candidates enable row level security;
alter table public.import_errors enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'providers', 'provider_terms_reviews', 'import_batches',
    'import_candidates', 'import_errors'
  ] loop
    execute format($f$create policy "%1$s_staff" on public.%1$s for all using (public.is_staff()) with check (public.is_staff(array['admin', 'editor']));$f$, tbl);
  end loop;
end $$;
