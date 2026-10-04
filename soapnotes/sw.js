'use strict';
const CACHE='wfa-shell-v1';
const ROOT=new URL('./',self.location.href).href;
const ASSETS=[ROOT,new URL('index.html',ROOT).href,new URL('manifest.webmanifest',ROOT).href,new URL('icon.svg',ROOT).href,new URL('apple-touch-icon.png',ROOT).href,new URL('icon-192.png',ROOT).href,new URL('icon-512.png',ROOT).href,new URL('guide.html',ROOT).href];
// Other apps on this origin delete caches they don't own, so the shell may vanish after install; the page asks for a refill.
async function cacheShell(){const cache=await caches.open(CACHE);await cache.addAll(ASSETS);for(const client of await self.clients.matchAll())client.postMessage('OFFLINE_READY')}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage('OFFLINE_READY')})()));
self.addEventListener('message',event=>{if(event.data==='CACHE_SHELL')event.waitUntil(cacheShell().catch(()=>{}))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate'){return (await cache.match(event.request,{ignoreSearch:true}))||(await cache.match(ROOT))||fetch(event.request)}return (await cache.match(event.request,{ignoreSearch:true}))||fetch(event.request)})())});
