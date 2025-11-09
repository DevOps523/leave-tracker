const CACHE_NAME = "v1_cache_leave_tracker";
    urlsToCache = [
        "https://script.google.com/macros/s/AKfycbyJfWsXAPaYox0y84sEfOHZrqYqA8gNKposgC3yO8Whh-S99o2tGJtE2WoX4nhBg_rk/exec",
        "./manifest.json",
    ];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches
        .open(CACHE_NAME)
        .then((cache) => {
            return cache.addAll(urlsToCache).then(() => self.skipWaiting());
        })
        .catch((err) => "Registration failed cache", err)
    );
});

self.addEventListener("activate", (e) => {
    const cacheWithList = [CACHE_NAME];

    e.waitUntil(
        caches.keys().then((cachesNames) =>
        cachesNames.map((cacheName) => {
            if(cacheName.indexOf(cacheName) === -1) {
                return caches.delete(cacheName);
            }
        })
        )
    );
});

self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            if(res){
                return res;
            }
            return fetch(e.request);
        })
    );
});