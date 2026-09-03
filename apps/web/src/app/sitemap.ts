import type { MetadataRoute } from 'next';
import { getData } from '../lib/data';

const SITE = 'https://emroozapp.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = getData();
  const [recipes, cuisines] = await Promise.all([
    data.recipes.listSummaries({ limit: 1000 }),
    data.cuisines.all(),
  ]);
  const staticPages: MetadataRoute.Sitemap = ['', '/discover', '/cuisines', '/privacy', '/terms', '/imprint'].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));
  return [
    ...staticPages,
    ...cuisines.map((c) => ({ url: `${SITE}/cuisines/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...recipes.map((r) => ({ url: `${SITE}/recipes/${r.slug}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
