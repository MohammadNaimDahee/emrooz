-- Minimal safe development seed.
-- The demo dataset lives in @emrooz/database/seed and is loaded at runtime
-- when Supabase credentials are missing. When Supabase is configured, run
-- `pnpm supabase:reset` and then use `pnpm recipes:import` or the admin
-- interface to populate published content.

insert into public.allergens (code, name_en) values
  ('gluten', 'Gluten'), ('wheat', 'Wheat'), ('dairy', 'Dairy'), ('egg', 'Egg'),
  ('peanut', 'Peanut'), ('tree_nut', 'Tree nut'), ('soy', 'Soy'), ('sesame', 'Sesame'),
  ('fish', 'Fish'), ('shellfish', 'Shellfish'), ('mustard', 'Mustard'), ('celery', 'Celery'),
  ('sulphite', 'Sulphite'), ('lupin', 'Lupin'), ('mollusc', 'Mollusc')
on conflict (code) do nothing;

insert into public.dietary_tags (code, name_en) values
  ('vegetarian', 'Vegetarian'), ('vegan', 'Vegan'), ('pescatarian', 'Pescatarian'),
  ('halal', 'Halal'), ('kosher', 'Kosher'),
  ('gluten_free', 'Gluten-free'), ('dairy_free', 'Dairy-free'),
  ('egg_free', 'Egg-free'), ('nut_free', 'Nut-free'),
  ('low_carb', 'Low-carb'), ('high_protein', 'High-protein')
on conflict (code) do nothing;
