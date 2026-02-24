const CACHE_NAME = 'earlymark-v2';

// Assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('SW: Cache addAll failed', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // CRITICAL: Skip navigation requests — let the browser handle page loads and redirects natively.
  // This prevents the "opaqueredirect" error when pages redirect (e.g., /setup → /dashboard).
  if (event.request.mode === 'navigate') return;

  // Skip API calls, Server Actions, and RSC payloads (don't cache stale data)
  if (event.request.url.includes('/api/') || event.request.url.includes('_rsc=')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Stale-while-revalidate for static assets only (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache successful responses
        if (networkResponse && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.log('SW: Fetch failed', err);
      });

      return cachedResponse || fetchPromise;
    })
  );
});
