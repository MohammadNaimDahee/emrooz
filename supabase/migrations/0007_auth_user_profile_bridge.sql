-- Bridge auth.users → public.profiles so every authenticated user (including
-- anonymous ones from supabase.auth.signInAnonymously()) has a profile row and
-- RLS `auth.uid()` checks work uniformly.

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, language)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'language', 'en'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Keep email in sync when the user upgrades from anonymous to a real account.
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles set email = new.email, updated_at = now()
  where id = new.id and (email is distinct from new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email on auth.users
for each row execute function public.sync_profile_email();
