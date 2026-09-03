-- Emrooz schema — extensions, enums, and shared helpers.
-- All application data lives in the `public` schema. RLS is enabled per-table.
create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "uuid-ossp";

-- Editorial state controls whether content is visible to the public.
do $$ begin
  create type editorial_state as enum (
    'draft', 'imported', 'needs_review', 'reviewed', 'published', 'rejected', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type authenticity_review_state as enum (
    'unreviewed', 'family_reviewed', 'community_reviewed', 'expert_reviewed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ownership_type as enum (
    'emrooz_owned', 'licensed', 'open_license', 'provider_hosted', 'external_link_only'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type storage_permission as enum (
    'permanent', 'subscription_only', 'temporary_cache', 'metadata_only', 'not_permitted'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recipe_difficulty as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_kind as enum (
    'looks_good', 'not_today', 'do_not_like', 'too_difficult', 'takes_too_long'
  );
exception when duplicate_object then null; end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Membership helper for admin checks. Populated per-environment.
create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'reviewer')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff(role_names text[] default array['admin', 'editor', 'reviewer'])
returns boolean language sql stable as $$
  select exists (
    select 1 from public.staff_members s
    where s.user_id = auth.uid() and s.role = any(role_names)
  );
$$;
