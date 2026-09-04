// Emrooz PWA shell cache.
// App-shell caching with a network-first fallback for HTML and a stale-while-revalidate
// fallback for static assets. On failure the shell page is served offline.
//
// Bump the cache version any time the shell URL list changes so old clients
// evict their stale caches on next activation. Currently v2 (added PNG
// icon fallbacks for older browsers + iOS Safari home-screen).
const CACHE = 'emrooz-shell-v2';
const SHELL = [
  '/',
  '/app',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-16.png',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((r) => {
          caches.open(CACHE).then((c) => c.put(req, r.clone()));
          return r;
        })
        .catch(() => caches.match(req).then((c) => c ?? caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((r) => {
          caches.open(CACHE).then((c) => c.put(req, r.clone()));
          return r;
        })
        .catch(() => cached);
      return cached ?? fetchPromise;
    }),
  );
});
