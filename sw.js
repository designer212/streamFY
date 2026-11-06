const CACHE_NAME = 'streamfy-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './config.js',
  './app.js',
  './css/styles.css'
];

// Install Service Worker and cache app assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch cached assets or fallback to network
self.addEventListener('fetch', event => {
  // Bypass caching for TMDB API calls and video iframes so data stays fresh
  if (event.request.url.includes('api.themoviedb.org') || event.request.url.includes('embed') || event.request.url.includes('vidsrc') || event.request.url.includes('vidlink')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});