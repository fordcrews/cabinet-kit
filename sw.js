/* Cabinet Kit service worker — cache-first static player */
const CACHE = "cabinet-kit-v0.7";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/engine.js",
  "./js/solitaire.js",
  "./js/play-ui.js",
  "./js/yacht.js",
  "./js/arcade.js",
  "./js/app-a.js",
  "./js/app-b.js",
  "./manifest.webmanifest",
  "./games/index.json",
  "./games/run21.json",
  "./games/zip21.json",
  "./games/chug21.json",
  "./games/elevenup.json",
  "./games/powersol.json",
  "./games/yacht.json",
  "./games/sudoku6.json",
  "./games/reversi.json",
  "./games/hoops.json",
  "./games/quiznight.json",
  "./icons/icon.svg",
  "./favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
