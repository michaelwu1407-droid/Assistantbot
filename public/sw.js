const CACHE_NAME = 'pj-buddy-v1';

// Assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/offline', // We should create this page eventually
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Attempt to cache static assets, but don't fail if some are missing
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
  // Skip cross-origin requests and API calls (for now)
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== 'GET') return;

  // Network-first for API calls and Server Actions (don't cache stale data)
  if (event.request.url.includes('/api/') || event.request.url.includes('_rsc=')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If offline, try to return cached response if available
          return caches.match(event.request);
        })
    );
    return;
  }

  // Stale-while-revalidate for static assets and pages
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Clone response to store in cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch((err) => {
        // Network failed
        console.log('SW: Fetch failed', err);
      });

      // Return cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
