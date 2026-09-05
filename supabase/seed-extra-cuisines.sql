-- Extra cuisines the archive dataset needs but CLAUDE.md §30 didn't
-- explicitly list. Bangladeshi is a natural neighbor to Indian/Pakistani;
-- Indo-Chinese (labeled "Fusion" in the dataset) is the well-known
-- South-Asian-adapted Chinese food category (Manchurian, Hakka noodles,
-- chilli chicken, etc.).
--
-- Idempotent. Safe to re-run.

insert into public.countries (code, name_en) values
  ('bd', 'Bangladesh')
on conflict (code) do nothing;

with c as (select code, id from public.countries)
insert into public.cuisines (slug, name_en, primary_country_id)
select v.slug, v.name_en, c.id
from (values
  ('bangladeshi',  'Bangladeshi',           'bd'),
  ('indo-chinese', 'Indo-Chinese (Fusion)', 'in')
) as v(slug, name_en, country_code)
left join c on c.code = v.country_code
on conflict (slug) do nothing;

select slug, name_en from public.cuisines where slug in ('bangladeshi', 'indo-chinese');
