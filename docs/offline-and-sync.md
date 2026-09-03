# Offline and synchronization

## Mobile

- The demo adapter ships bundled recipes for use offline.
- Guest identity persists to AsyncStorage.
- Preferences persist to AsyncStorage.
- TanStack Query cache defaults to a 60-second stale time; screens are safe to open without a network.
- When Supabase is configured, the same repository interface will be implemented against Supabase, and writes will be optimistic + retried when connectivity returns.

## Web (PWA)

- `public/sw.js` caches the app shell + explicit assets.
- HTML requests are network-first with a shell fallback; static assets are stale-while-revalidate.
- An `OfflineBanner` component surfaces `navigator.onLine === false` in a non-intrusive way.

## Conflict policy

- Per-user private data uses last-write-wins with server-side timestamps once Supabase is wired.
- Guest-to-account migration merges local data into the newly created account and is idempotent so repeated attempts do not duplicate history entries.
