const CACHE_NAME = 'meinspect-v3';
const STATIC_CACHE = 'meinspect-static-v3';
const DYNAMIC_CACHE = 'meinspect-dynamic-v3';

// Static assets to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/meinspect-logo.png',
  '/manifest.json',
];

// Install — cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch — offline-first strategy for field inspectors
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API requests: network-first with short timeout, fallback to cache
  // This allows inspectors to submit data when back online
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstWithTimeout(request, 5000)
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  // These don't change often and are critical for offline use
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|ico)$/)
  ) {
    event.respondWith(
      cacheFirst(request)
    );
    return;
  }

  // Navigation requests: network-first with cache fallback
  // Ensures the app shell is always available offline
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstWithCache(request)
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    networkFirstWithTimeout(request, 3000)
  );
});

// Cache-first: serve from cache, fall back to network and cache the response
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline and not cached — return a basic offline response
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first with cache fallback (for navigation/API)
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return cached index.html for navigation requests (SPA routing)
    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first with timeout (for API calls)
async function networkFirstWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    // Cache successful API responses for offline access
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    // Network failed or timed out — try cache
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No network connection. Data will sync when back online.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
