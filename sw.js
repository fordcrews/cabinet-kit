/* Cabinet Kit service worker — network-first, cache fallback */
const CACHE = "cabinet-kit-v0.18";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./css/11up.css",
  "./css/arcade.css",
  "./css/patience.css",
  "./css/match.css",
  "./css/slot.css",
  "./css/chrome.css",
  "./css/feel.css",
  "./css/pieces.css",
  "./svg/card-back.svg",
  "./svg/disc-dark.svg",
  "./svg/disc-light.svg",
  "./svg/hoops-ball.svg",
  "./svg/hoops-rim.svg",
  "./svg/legal-pip.svg",
  "./svg/mug-foam.svg",
  "./svg/pieces-sprite.svg",
  "./svg/pip-club.svg",
  "./svg/pip-diamond.svg",
  "./svg/pip-heart.svg",
  "./svg/pip-spade.svg",
  "./svg/quiz-plate.svg",
  "./js/app.js",
  "./js/engine.js",
  "./js/solitaire.js",
  "./js/play-ui.js",
  "./js/11up.js",
  "./js/yacht.js",
  "./js/arcade.js",
  "./js/app-quiznight.js",
  "./js/match.js",
  "./js/feel-engine.js",
  "./js/feel-ui.js",
  "./js/highscore.js",
  "./js/sfx.js",
  "./js/slot.js",
  "./js/app-a.js",
  "./js/app-b.js",
  "./manifest.webmanifest",
  "./games/index.json",
  "./games/run21.json",
  "./games/zip21.json",
  "./games/chug21.json",
  "./games/elevenup.json",
  "./games/solitaire.json",
  "./games/freecell.json",
  "./games/spider.json",
  "./games/yacht.json",
  "./games/sudoku6.json",
  "./games/sudoku9.json",
  "./games/reversi.json",
  "./games/hoops.json",
  "./games/orbit.json",
  "./games/orbit/game.js",
  "./games/quiznight.json",
  "./games/blast.json",
  "./games/triple.json",
  "./games/chime.json",
  "./icons/grain.svg",
  "./icons/marquee-lamps.svg",
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
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
