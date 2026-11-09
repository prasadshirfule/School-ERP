// School ERP — Progressive Web App Service Worker
const CACHE_NAME = "schoolerp-v1.0.0";

const PRECACHE_ASSETS = [
  "/",
  "/login",
  "/manifest.json",
  "/offline-fallback.html",
];

// Install: Cache critical offline shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Some assets failed to precache during install:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Cleanup obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Bypass all non-GET requests and API/Auth endpoints (Network only)
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return;
  }

  // 2. Cache-First for static assets (images, fonts, stylesheets, scripts)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".css")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Network-First with Cache Fallback for Page Navigations
  // SECURITY REQUIREMENT: Never cache authenticated portal pages or student PII offline
  if (request.mode === "navigate") {
    const isSensitivePortalRoute =
      url.pathname.startsWith("/admin") ||
      url.pathname.startsWith("/parent") ||
      url.pathname.startsWith("/teacher") ||
      url.pathname.startsWith("/super-admin") ||
      url.pathname.startsWith("/account");

    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache public unauthenticated pages (e.g. /login, /register, home)
          if (!isSensitivePortalRoute && response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // If offline and sensitive route, immediately serve generic offline fallback to prevent PII exposure
          if (isSensitivePortalRoute) {
            const fallback = await caches.match("/offline-fallback.html");
            if (fallback) return fallback;
          }
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("/offline-fallback.html");
          if (fallback) return fallback;
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><title>Offline — School ERP</title>
            <style>body{font-family:sans-serif;text-align:center;padding:48px;color:#1e3a8a}</style>
            </head>
            <body>
              <h2>You are currently offline</h2>
              <p>School ERP requires an active connection to synchronize your records.</p>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
  }
});
