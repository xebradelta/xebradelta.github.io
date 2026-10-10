"use strict";
const VERSION = "1.0.0-f54cb33c8023",
  CACHE = "flip-party-" + VERSION,
  FILES = ["index.html","style.css","data.js","engine.js","gesture.js","storage.js","ui.js","offline.js","manifest.webmanifest","icons/icon.svg","icons/icon-192.png","icons/icon-512.png"],
  base = new URL("./", self.location.href);
const urls = FILES.map((path) => new URL(path, base).href),
  marker = new URL("__complete__", base).href;
async function download(target) {
  const cache = await caches.open(target);
  try {
    await cache.addAll(
      urls.map((url) => new Request(url, { cache: "reload" })),
    );
    await cache.put(marker, new Response(VERSION));
    return cache;
  } catch (error) {
    await caches.delete(target);
    throw error;
  }
}
async function ready() {
  const cache = await caches.open(CACHE);
  if (!(await cache.match(marker))) return false;
  for (const url of urls) if (!(await cache.match(url))) return false;
  return true;
}
self.addEventListener("install", (event) => event.waitUntil(download(CACHE)));
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      if (!(await ready())) throw new Error("Incomplete cache");
      await self.clients.claim();
      for (const name of await caches.keys())
        if (name.startsWith("flip-party-") && name !== CACHE)
          await caches.delete(name);
    })(),
  ),
);
self.addEventListener("message", (event) => {
  const reply = (value) => event.ports[0]?.postMessage(value);
  if (event.data?.type === "STATUS")
    event.waitUntil(
      ready().then((ready) => reply({ ready, version: VERSION })),
    );
  if (event.data?.type === "ACTIVATE")
    event.waitUntil(
      ready().then((ok) => (ok ? self.skipWaiting() : undefined)),
    );
  if (event.data?.type === "REFRESH")
    event.waitUntil(
      (async () => {
        const temporary = CACHE + "-refresh";
        try {
          const complete = await download(temporary);
          const current = await caches.open(CACHE);
          for (const request of await complete.keys())
            await current.put(request, await complete.match(request));
          await caches.delete(temporary);
          reply({ ok: await ready() });
        } catch {
          reply({ ok: false });
        }
      })(),
    );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(event.request, { ignoreSearch: true });
      if (hit) return hit;
      if (event.request.mode === "navigate") {
        const shell = await cache.match(new URL("index.html", base).href);
        if (shell) return shell;
      }
      return fetch(event.request);
    })(),
  );
});
