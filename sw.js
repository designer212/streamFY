const CACHE_NAME = 'streamfy-v2';
const IMG_CACHE = 'streamfy-img-v1';
const MAX_IMAGES = 150;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './js/config.js',
  './js/app.js',
  './css/styles.css',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache app files one by one so a single missing file can't break the install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(ASSETS_TO_CACHE.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Activate: remove old caches and take control of open pages
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== IMG_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Keep the image cache from growing forever
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  
  const url = req.url;
  
  // Never cache API calls or video players, so data and streams stay fresh
  if (
    url.includes('api.themoviedb.org') ||
    url.includes('embed') ||
    url.includes('vidsrc') ||
    url.includes('vidlink') ||
    url.includes('youtube')
  ) return;
  
  const sameOrigin = new URL(url).origin === self.location.origin;
  
  // Posters and backdrops: cache-first, saved as you browse
  if (url.includes('image.tmdb.org')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            cache.put(req, res.clone()).then(() => trimCache(IMG_CACHE, MAX_IMAGES));
          }
          return res;
        }))
      )
    );
    return;
  }
  
  // App files: network-first, so updates always show; cache is the offline fallback
  if (sameOrigin) {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() =>
        caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
    );
  }
  // Everything else (fonts, icons CDN) is left to the browser
});
