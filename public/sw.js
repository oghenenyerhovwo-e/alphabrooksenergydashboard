/*
 * Alpha Brooks Energy — minimal service worker.
 *
 * Purpose: make the app installable and show a friendly offline page.
 *
 * Deliberately does NOT cache pages, API responses or anything from an
 * authenticated session — this is an internal operations platform, so
 * stale or shared data must never be served from a cache.
 *
 * It also never touches /api/* or /teams/*, so the Microsoft sign-in
 * flow (both normal and the Teams popup) behaves exactly as before.
 */
const CACHE = "ab-pwa-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
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

  // Only page navigations, only GET.
  if (req.method !== "GET" || req.mode !== "navigate") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Leave auth, APIs and the Teams flow completely alone.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/teams/")) {
    return;
  }

  // Network-first. Only if the network fails do we show the offline page.
  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || Response.error();
    })
  );
});
