const STATIC_CACHE = "leave-tracker-static-v1";
const RUNTIME_CACHE = "leave-tracker-runtime";
const urlsToCache = [
  "./",
  "./manifest.json",
  "./style.css",
  "./script.js",
  "./404.html"
];

// ✅ Install: precache static files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ✅ Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ✅ Messages from client
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    })());
  }
});

// ✅ Fetch handler
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 🚫 Bypass cache for admin & version endpoints
  if (url.pathname.endsWith("/version.json") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/version")) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => {
        // When server is offline, return 404 page
        const offlinePage = await caches.match("/404.html");
        return offlinePage || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // 🧭 For navigation requests (page loads)
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch (err) {
          const cached404 = await caches.match("/404.html");
          return cached404 || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // 🧱 For static assets (CSS, JS, etc.)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
              return response;
            })
            .catch(async () => {
              const fallback = await caches.match("/404.html");
              return fallback || new Response("Offline", { status: 503 });
            })
      )
    );
    return;
  }

  // 🌐 External (e.g. Google APIs)
  event.respondWith(
    fetch(request).catch(async () => {
      const fallback = await caches.match("/404.html");
      return fallback || new Response("Offline", { status: 503 });
    })
  );
});

