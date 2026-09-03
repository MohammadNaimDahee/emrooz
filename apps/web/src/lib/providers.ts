import 'server-only';
import { TheMealDbProvider } from '@emrooz/recipe-providers';

/**
 * Server-only factory for external recipe providers. Uses env vars that must
 * NEVER be inlined into the client bundle:
 *
 *  - THEMEALDB_API_KEY: TheMealDB key. "1" (public test key) is fine for dev,
 *    but a paid supporter key is required before shipping to app stores.
 *
 * All provider proxy route handlers must go through this factory so we
 * centralise credential handling and keep a single audit trail.
 */
export function getTheMealDbProvider(): TheMealDbProvider {
  const apiKey = process.env.THEMEALDB_API_KEY;
  return new TheMealDbProvider(apiKey);
}

/**
 * Handy summary of every configured provider for the admin routes. When a
 * provider has no credentials, `hasCredentials` is false and callers should
 * render a "set the key" instruction rather than a broken health status.
 */
export function listProviders(): Array<{
  key: string;
  displayName: string;
  hasCredentials: boolean;
  storageMode: string;
  rateLimit: { requestsPerMinute: number | null; requestsPerDay: number | null };
}> {
  const provider = getTheMealDbProvider();
  return [
    {
      key: provider.key,
      displayName: provider.displayName,
      hasCredentials: provider.hasCredentials(),
      storageMode: provider.storageMode,
      rateLimit: provider.rateLimit,
    },
  ];
}
