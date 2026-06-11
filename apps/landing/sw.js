/* Accelyo service worker — same-origin only, jamais de cache des donnees privees /api/. */
'use strict';

var CACHE = 'accelyo-app-v1';
var SHELL = [
  '/carte',
  '/assets/app.css',
  '/assets/logo.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // addAll best-effort : si une ressource manque, ne bloque pas l'install.
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () { /* ignore */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) { return caches.delete(k); }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') { return; }

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Ignore toute requete cross-origin : on laisse le navigateur la gerer (aucune interception).
  if (url.origin !== self.location.origin) { return; }

  // Donnees privees /api/ : network-first et JAMAIS de mise en cache.
  if (url.pathname.indexOf('/api/') === 0) {
    event.respondWith(
      fetch(req).catch(function () {
        return new Response(
          JSON.stringify({ success: false, error: { message: 'Hors ligne.' } }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Assets statiques same-origin : cache-first, puis mise en cache de la reponse.
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) { return cached; }
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // En dernier recours, sert le shell /carte pour les navigations.
        if (req.mode === 'navigate') { return caches.match('/carte'); }
        return new Response('', { status: 504 });
      });
    })
  );
});
