// Mrudhula Chitti Fund — service worker
// Caches the app shell so the tracker keeps working offline once it has
// loaded successfully at least once from its hosted URL.

var CACHE_NAME = 'chitti-fund-shell-v1';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .catch(function () { /* first install without network — ignore, will cache on next load */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networkFetch = fetch(event.request).then(function (response) {
        if (response && (response.status === 200 || response.type === 'opaque')) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () { return cached; });
      // app-shell files: prefer cache first (fast, works offline); everything else: network first
      var isShellRequest = APP_SHELL.some(function (path) { return event.request.url.indexOf(path.replace('./', '')) !== -1; });
      return isShellRequest ? (cached || networkFetch) : networkFetch;
    })
  );
});
