import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app',
          '/pantry',
          '/favorites',
          '/planner',
          '/history',
          '/settings',
          '/admin',
          '/auth',
        ],
      },
    ],
    sitemap: 'https://emroozapp.com/sitemap.xml',
  };
}
