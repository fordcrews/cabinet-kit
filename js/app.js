/**
 * Cabinet Kit player: menu from games/index.json, hash routes, JSON-driven copy.
 */
(function () {
  "use strict";

  const E = window.CabinetEngine;
  const $ = (id) => document.getElementById(id);

  const ui = {
    cabinet: $("view-cabinet"),
    game: $("view-game"),
    list: $("game-list"),
    brand: $("marquee-brand"),
    sub: $("marquee-sub"),
    scoreBlock: $("score-block"),
    scoreLabel: $("score-label"),
    scoreValue: $("score-value"),
    hudRound: $("hud-round"),
    hudDeck: $("hud-deck"),
    hand: $("hand"),
    total: $("total"),
    totalLabel: $("total-label"),
    banner: $("banner"),
    hit: $("btn-hit"),
    stay: $("btn-stay"),
    deal: $("btn-deal"),
    back: $("btn-back"),
  };

  const gamesById = new Map();
  let session = null;
  let gameDef = null;

  function label(key, fallback) {
    const labels = (gameDef && gameDef.labels) || {};
    return labels[key] || fallback;
  }

  function copy(key, fallback) {
    const src = (gameDef && gameDef.copy) || {};
    return src[key] || fallback;
  }

  function show(view) {
    ui.cabinet.classList.toggle("active", view === "cabinet");
    ui.game.classList.toggle("active", view === "game");
  }

  function cardNode(card) {
    const el = document.createElement("article");
    const red = card.suit === "♥" || card.suit === "♦";
    el.className = "card" + (red ? " card-red" : " card-black");
    el.setAttribute("aria-label", card.rank + " " + card.suit);
    el.innerHTML =
      '<span class="card-rank">' +
      card.rank +
      '</span><span class="card-suit">' +
      card.suit +
      '</span><span class="card-suit-lg">' +
      card.suit +
      "</span>";
    return el;
  }

  function renderHand(snap) {
    ui.hand.replaceChildren();
    snap.hand.forEach(function (c) {
      ui.hand.appendChild(cardNode(c));
    });
    ui.total.textContent = snap.hand.length ? String(snap.total) : "—";
  }

  function setPlaying(playing) {
    ui.hit.classList.toggle("hidden", !playing);
    ui.stay.classList.toggle("hidden", !playing);
    ui.deal.classList.toggle("hidden", playing);
    ui.hit.disabled = !playing;
    ui.stay.disabled = !playing;
  }

  function renderGame() {
    if (!session || !gameDef) return;
    const snap = E.snapshot(session);
    ui.brand.textContent = gameDef.title || "Game";
    ui.sub.textContent = gameDef.tagline || "";
    ui.scoreBlock.hidden = false;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("round", "ROUND") + " " + snap.rounds;
    ui.hudDeck.textContent = label("deck", "DECK") + " " + snap.deckCount;
    ui.totalLabel.textContent = label("total", "HAND");
    ui.hit.textContent = label("hit", "HIT");
    ui.stay.textContent = label("stay", "STAY");
    ui.deal.textContent = snap.status === "idle" ? label("deal", "DEAL") : label("again", "DEAL AGAIN");
    ui.back.textContent = label("back", "CABINET");
    renderHand(snap);

    ui.banner.className = "banner";
    if (snap.status === "idle") {
      ui.banner.textContent = copy("idle", "Deal to start a round.");
      setPlaying(false);
    } else if (snap.status === "playing") {
      ui.banner.textContent = copy("playing", "Hit or stay.");
      setPlaying(true);
    } else if (snap.status === "bust") {
      ui.banner.classList.add("bust");
      ui.banner.textContent =
        label("bust", "BUST") + " · " + copy("bust", "Over the target. Zero this round.");
      setPlaying(false);
    } else if (snap.status === "run") {
      ui.banner.classList.add("run");
      ui.banner.textContent =
        label("run", "RUN") +
        " +" +
        snap.lastRoundScore +
        " · " +
        copy("run", "Two-card Run! Target plus bonus.");
      setPlaying(false);
    } else if (snap.status === "stay") {
      ui.banner.textContent =
        label("stayOk", "STAY") +
        " +" +
        snap.lastRoundScore +
        " · " +
        copy("stay", "Locked in.");
      setPlaying(false);
    }
  }

  function openCabinet() {
    session = null;
    gameDef = null;
    show("cabinet");
    ui.brand.textContent = "Cabinet";
    ui.sub.textContent = "Card kit · offline";
    ui.scoreBlock.hidden = true;
  }

  function startGame(def) {
    if (!def || def.type !== "run21") {
      ui.list.innerHTML =
        '<li class="status-error">This kit only plays type "run21" in v0. See README.</li>';
      openCabinet();
      return;
    }
    gameDef = def;
    session = E.createSession(def);
    show("game");
    renderGame();
  }

  async function loadGame(id) {
    const meta = gamesById.get(id);
    if (!meta) {
      location.hash = "#/";
      return;
    }
    const res = await fetch("games/" + meta.file);
    if (!res.ok) throw new Error("Could not load " + meta.file);
    const def = await res.json();
    startGame(def);
  }

  async function loadCatalog() {
    const res = await fetch("games/index.json");
    if (!res.ok) throw new Error("Missing games/index.json");
    const data = await res.json();
    const files = Array.isArray(data.games) ? data.games : [];
    const defs = [];
    for (const file of files) {
      const gRes = await fetch("games/" + file);
      if (!gRes.ok) continue;
      const def = await gRes.json();
      def.file = file;
      defs.push(def);
      gamesById.set(def.id || file.replace(/\.json$/, ""), { file: file, def: def });
    }
    ui.list.replaceChildren();
    defs.forEach(function (def) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML =
        '<span class="title"></span><span class="tagline"></span>';
      btn.querySelector(".title").textContent = def.title || def.id;
      btn.querySelector(".tagline").textContent = def.tagline || def.blurb || "";
      btn.addEventListener("click", function () {
        location.hash = "#/play/" + encodeURIComponent(def.id);
      });
      li.appendChild(btn);
      ui.list.appendChild(li);
    });
    if (!defs.length) {
      ui.list.innerHTML = '<li class="status-error">No games in games/index.json</li>';
    }
  }

  function route() {
    const hash = location.hash || "#/";
    const play = hash.match(/^#\/play\/([^/]+)/);
    if (play) {
      loadGame(decodeURIComponent(play[1])).catch(function (err) {
        ui.list.innerHTML = '<li class="status-error"></li>';
        ui.list.querySelector("li").textContent = String(err.message || err);
        location.hash = "#/";
      });
      return;
    }
    openCabinet();
  }

  ui.hit.addEventListener("click", function () {
    if (!session || session.status !== "playing") return;
    E.hit(session);
    renderGame();
  });
  ui.stay.addEventListener("click", function () {
    if (!session || session.status !== "playing") return;
    E.stay(session);
    renderGame();
  });
  ui.deal.addEventListener("click", function () {
    if (!session) return;
    E.deal(session);
    renderGame();
  });
  ui.back.addEventListener("click", function () {
    location.hash = "#/";
  });

  function registerSw() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  loadCatalog()
    .then(function () {
      window.addEventListener("hashchange", route);
      route();
      registerSw();
    })
    .catch(function (err) {
      ui.list.innerHTML = '<li class="status-error"></li>';
      ui.list.querySelector("li").textContent = String(err.message || err);
    });
})();
