const cacheName = 'tempest-v2';
const assets = ['./index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  console.log('[SW] Installing service worker');
  e.waitUntil(
    caches.open(cacheName)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return cache.addAll(assets);
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[SW] Activating service worker');
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== cacheName) {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;
  
  // Skip WebSocket and external requests
  if (e.request.url.startsWith('wss://') || 
      e.request.url.includes('weatherflow.com') ||
      e.request.url.includes('googleapis.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(e.request)
          .then((fetchResponse) => {
            // Don't cache if not a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            return fetchResponse;
          })
          .catch((err) => {
            console.error('[SW] Fetch failed:', err);
            return new Response('Offline - network unavailable', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
      })
  );
});