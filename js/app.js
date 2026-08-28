/**
 * Cabinet Kit player: menu from games/index.json, hash routes, JSON-driven copy.
 * v0.2 plays run21 (HIT/STAY) and columns21 (Zip / Chug).
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
    playRun: $("play-run21"),
    playColumns: $("play-columns"),
    hand: $("hand"),
    total: $("total"),
    totalLabel: $("total-label"),
    banner: $("banner"),
    incoming: $("incoming"),
    incomingLabel: $("incoming-label"),
    columns: $("columns"),
    hit: $("btn-hit"),
    stay: $("btn-stay"),
    deal: $("btn-deal"),
    skip: $("btn-skip"),
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

  function isColumns() {
    return !!(gameDef && gameDef.type === "columns21");
  }

  function cardNode(card, mini) {
    const el = document.createElement("article");
    const red = card.suit === "♥" || card.suit === "♦";
    el.className = "card" + (red ? " card-red" : " card-black") + (mini ? " card-mini" : "");
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

  function mugNode(card, mini) {
    const el = document.createElement("article");
    el.className = "mug" + (mini ? " mug-mini" : " mug-lg");
    el.setAttribute("aria-label", "Mug " + card.rank);
    el.innerHTML = '<span class="mug-rank">' + card.rank + "</span>";
    return el;
  }

  function pieceNode(card, mini) {
    const piece = (session && session.config && session.config.piece) || (gameDef && gameDef.piece) || "card";
    if (piece === "mug") return mugNode(card, mini);
    return cardNode(card, mini);
  }

  function renderHand(snap) {
    ui.hand.replaceChildren();
    snap.hand.forEach(function (c) {
      ui.hand.appendChild(cardNode(c, false));
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

  function setMode(type) {
    const columns = type === "columns21";
    ui.playRun.classList.toggle("hidden", columns);
    ui.playColumns.classList.toggle("hidden", !columns);
    ui.skip.classList.toggle("hidden", !columns);
    if (columns) {
      ui.hit.classList.add("hidden");
      ui.stay.classList.add("hidden");
      ui.deal.classList.add("hidden");
    } else {
      ui.skip.classList.add("hidden");
    }
  }

  function renderColumns() {
    const snap = E.snapshotColumns(session);
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("skips", "SKIPS") + " " + snap.skipsLeft;
    ui.hudDeck.textContent = label("deck", "DECK") + " " + snap.deckCount;
    ui.incomingLabel.textContent = label("incoming", "NEXT");
    ui.skip.textContent = label("skip", "SKIP");
    ui.skip.disabled = snap.status !== "playing" || snap.skipsLeft <= 0;
    ui.back.textContent = label("back", "CABINET");

    ui.incoming.replaceChildren();
    if (snap.incoming) {
      ui.incoming.appendChild(pieceNode(snap.incoming, false));
    }

    ui.columns.style.setProperty("--cols", String(snap.columns.length));
    ui.columns.replaceChildren();
    snap.columns.forEach(function (col, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "column-well";
      btn.dataset.col = String(i);
      btn.disabled = snap.status !== "playing";
      if (snap.status === "playing" && snap.incoming) {
        const preview = col.cards.concat(snap.incoming);
        if (E.handValue(preview, snap.target) > snap.target) {
          btn.classList.add("would-bust");
        }
      }
      const stack = document.createElement("div");
      stack.className = "column-stack";
      col.cards.forEach(function (c) {
        stack.appendChild(pieceNode(c, true));
      });
      const tot = document.createElement("div");
      tot.className = "column-total";
      tot.textContent = col.cards.length ? String(col.total) : "0";
      btn.appendChild(stack);
      btn.appendChild(tot);
      ui.columns.appendChild(btn);
    });

    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      let line = copy("done", "Shoe empty.");
      if (ev && ev.kind === "clear") {
        ui.banner.classList.add("run");
        line = label("clear", "CLEAR") + " +" + ev.points + " · " + line;
      } else if (ev && ev.kind === "bust") {
        ui.banner.classList.add("bust");
        line = label("bust", "BUST") + " " + ev.points + " · " + line;
      }
      ui.banner.textContent = line + " · " + snap.score;
    } else if (ev && ev.kind === "clear") {
      ui.banner.classList.add("run");
      ui.banner.textContent =
        label("clear", "CLEAR") + " +" + ev.points + " · " + copy("clear", "Lane cleared.");
    } else if (ev && ev.kind === "bust") {
      ui.banner.classList.add("bust");
      ui.banner.textContent =
        label("bust", "BUST") + " " + ev.points + " · " + copy("bust", "Over the target.");
    } else if (ev && ev.kind === "skip") {
      ui.banner.textContent = copy("skip", "Skipped.");
    } else {
      ui.banner.textContent = copy("playing", "Place the incoming piece.");
    }
  }

  function renderRun() {
    const snap = E.snapshot(session);
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

  function renderGame() {
    if (!session || !gameDef) return;
    ui.brand.textContent = gameDef.title || "Game";
    ui.sub.textContent = gameDef.tagline || "";
    ui.scoreBlock.hidden = false;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.back.textContent = label("back", "CABINET");
    if (isColumns()) {
      setMode("columns21");
      renderColumns();
      return;
    }
    setMode("run21");
    renderRun();
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
    if (!def || (def.type !== "run21" && def.type !== "columns21")) {
      ui.list.innerHTML =
        '<li class="status-error">This kit plays type "run21" and "columns21". See README.</li>';
      openCabinet();
      return;
    }
    gameDef = def;
    if (def.type === "columns21") {
      session = E.createColumnsSession(def);
    } else {
      session = E.createSession(def);
    }
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
    if (!session || isColumns() || session.status !== "playing") return;
    E.hit(session);
    renderGame();
  });
  ui.stay.addEventListener("click", function () {
    if (!session || isColumns() || session.status !== "playing") return;
    E.stay(session);
    renderGame();
  });
  ui.deal.addEventListener("click", function () {
    if (!session || isColumns()) return;
    E.deal(session);
    renderGame();
  });
  ui.skip.addEventListener("click", function () {
    if (!session || !isColumns() || session.status !== "playing") return;
    if (session.skipsLeft <= 0) return;
    E.skipColumn(session);
    renderGame();
  });
  ui.columns.addEventListener("click", function (ev) {
    const well = ev.target.closest("[data-col]");
    if (!well || !session || !isColumns() || session.status !== "playing") return;
    const i = Number(well.getAttribute("data-col"));
    E.placeColumn(session, i);
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
