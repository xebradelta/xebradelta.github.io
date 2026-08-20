// Strike Map service worker — deliberately dumb.
//
// It caches the app shell and nothing else. Map tiles, radar frames and the
// lightning socket are cross-origin and pass straight through: caching them
// would bloat storage and serve stale weather.
//
// BUMP THIS VERSION ON EVERY DEPLOY or installed phones will run old code.
const CACHE = "strikemap-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/app.js",
  "./js/config.js",
  "./js/geo.js",
  "./js/lzw.js",
  "./js/feed.js",
  "./js/map.js",
  "./js/radar.js",
  "./js/hotspots.js",
  "./js/alerts.js",
  "./js/settings.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch((err) => console.warn("[sw] precache failed", err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Cross-origin (tiles, radar, CDN, websocket upgrade): untouched.
  if (url.origin !== self.location.origin) return;
  // The optional collector output must stay fresh.
  if (url.pathname.endsWith("/data/hotspots.json")) return;

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
