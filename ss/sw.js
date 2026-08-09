/* S&S Coach service worker — offline-first app-shell precache.
   All URLs are relative to the SW's own location so any base path works. */
const CACHE = "ss-coach-mslhbvlp";
const PRECACHE = ["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/apple-touch-icon.png","assets/index-C6iC-jKf.css","assets/index-C2rWApKp.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          ...new Set(PRECACHE.map((p) => new URL(p, self.registration.scope).href)),
        ])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations fall back to the cached shell so the app opens offline.
  if (req.mode === "navigate") {
    event.respondWith(
      caches
        .match(new URL("index.html", self.registration.scope).href)
        .then((hit) => hit || fetch(req))
    );
    return;
  }

  // Cache-first for everything else; fill the cache from the network on miss.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && url.pathname.startsWith(new URL(self.registration.scope).pathname)) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
