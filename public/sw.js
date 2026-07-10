// public/sw.js - Service Worker para PWA FarmaTurno Chile
const CACHE_NAME = 'farmaturno-v2';
const ASSETS = [
  '/favicon.svg',
  '/favicon.ico',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar el Service Worker y almacenar en caché solo los assets estáticos del shell (no HTML)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Limpiar cachés antiguas en la activación
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Navegación (HTML): red primero, caché solo como respaldo offline.
// Assets estáticos propios: caché primero. Nunca interceptar orígenes externos (Leaflet/MINSAL).
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
