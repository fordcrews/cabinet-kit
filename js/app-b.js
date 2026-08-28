  function renderRunLanes() {
    const snap = E.snapshotRunLanes(session);
    ui.scoreLabel.textContent = label("score", "SCORE") + " / " + snap.perfect;
    ui.scoreValue.textContent = String(snap.score);
    let roundLine = label("skips", "SKIPS") + " " + snap.skipsLeft;
    if (snap.rounds > 0) {
      roundLine += " · " + label("session", "SESSION") + " " + snap.sessionScore;
    }
    ui.hudRound.textContent = roundLine;
    ui.hudDeck.textContent = label("deck", "DECK") + " " + snap.deckCount;
    ui.incomingLabel.textContent = label("incoming", "NEXT");
    ui.skip.textContent = label("skip", "SKIP");
    ui.skip.disabled = snap.status !== "playing" || snap.skipsLeft <= 0;
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.toggle("hidden", snap.status !== "done");
    ui.back.textContent = label("back", "CABINET");
    ui.incoming.replaceChildren();
    if (snap.incoming) {
      ui.incoming.appendChild(pieceNode(snap.incoming, false));
    }
    ui.columns.style.setProperty("--cols", String(snap.columns.length));
    ui.columns.replaceChildren();
    snap.columns.forEach(function (col, i) {
      const wrap = document.createElement("div");
      wrap.className = "column-well";
      wrap.dataset.col = String(i);
      if (col.outcome === "bust") wrap.classList.add("is-bust");
      if (col.outcome === "21") wrap.classList.add("is-21");
      if (col.outcome === "run") wrap.classList.add("is-run");
      if (col.outcome === "stay") wrap.classList.add("is-stay");
      if (col.locked) wrap.classList.add("is-locked");
      const place = document.createElement("button");
      place.type = "button";
      place.className = "column-place";
      place.dataset.col = String(i);
      place.disabled = snap.status !== "playing" || col.locked;
      if (snap.status === "playing" && snap.incoming && !col.locked) {
        const preview = col.cards.concat(snap.incoming);
        if (E.handValue(preview, snap.target) > snap.target) {
          wrap.classList.add("would-bust");
        }
      }
      const stack = document.createElement("div");
      stack.className = "column-stack";
      col.cards.forEach(function (c) {
        stack.appendChild(pieceNode(c, true));
      });
      const tot = document.createElement("div");
      tot.className = "column-total";
      if (col.outcome === "bust") {
        tot.textContent = label("bust", "BUST");
      } else if (col.outcome === "run") {
        tot.textContent = label("run", "RUN");
      } else {
        tot.textContent = col.cards.length ? String(col.total) : "0";
      }
      place.appendChild(stack);
      place.appendChild(tot);
      const stayBtn = document.createElement("button");
      stayBtn.type = "button";
      stayBtn.className = "column-stay-btn";
      stayBtn.dataset.stay = String(i);
      stayBtn.textContent = label("stay", "STAY");
      stayBtn.disabled = snap.status !== "playing" || col.locked;
      wrap.appendChild(place);
      wrap.appendChild(stayBtn);
      ui.columns.appendChild(wrap);
    });
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      let line = copy("done", "All lanes locked.");
      if (snap.score >= snap.perfect) {
        ui.banner.classList.add("run");
        line = copy("perfect", "Perfect 105.") + " · " + line;
      } else if (ev && ev.kind === "bust") {
        ui.banner.classList.add("bust");
      } else if (ev && (ev.kind === "run" || ev.kind === "21")) {
        ui.banner.classList.add("run");
      }
      ui.banner.textContent = line + " · " + snap.score + " / " + snap.perfect;
    } else if (ev && ev.kind === "bust") {
      ui.banner.classList.add("bust");
      ui.banner.textContent =
        label("bust", "BUST") + " · " + copy("bust", "Over 21. That lane is locked at zero.");
    } else if (ev && ev.kind === "run") {
      ui.banner.classList.add("run");
      ui.banner.textContent =
        label("run", "RUN") + " · " + copy("run", "Two-card 21. Lane locked.");
    } else if (ev && ev.kind === "21") {
      ui.banner.classList.add("run");
      ui.banner.textContent =
        label("complete", "21") + " · " + copy("complete", "Lane locked at 21.");
    } else if (ev && ev.kind === "stay") {
      ui.banner.textContent =
        label("stayOk", "STAY") + " · " + copy("stay", "Lane locked.");
    } else if (ev && ev.kind === "skip") {
      ui.banner.textContent = copy("skip", "Skipped.");
    } else {
      ui.banner.textContent = copy("playing", "Place the incoming card.");
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
    if (isRunLanes()) {
      setMode("runlanes");
      renderRunLanes();
      return;
    }
    if (isEleven()) {
      setMode("elevenup");
      window.CabinetPlay.renderEleven(playCtx());
      return;
    }
    if (isPower()) {
      setMode("powersol");
      window.CabinetPlay.renderPower(playCtx());
      return;
    }
    setMode("run21");
    renderRun();
  }
  function playCtx() {
    return { E: E, ui: ui, session: session, gameDef: gameDef, label: label, copy: copy };
  }
  function openCabinet() {
    session = null;
    gameDef = null;
    show("cabinet");
    ui.brand.textContent = "Cabinet";
    ui.sub.textContent = "Card kit \u00b7 offline";
    ui.scoreBlock.hidden = true;
  }
  function startGame(def) {
    const PLAYABLE = { run21: 1, columns21: 1, runlanes: 1, elevenup: 1, powersol: 1 };
    if (!def || !PLAYABLE[def.type]) {
      ui.list.innerHTML =
        '<li class="status-error">This kit plays type "runlanes", "columns21", "elevenup", "powersol", and "run21". See README.</li>';
      openCabinet();
      return;
    }
    gameDef = def;
    if (def.type === "columns21") {
      session = E.createColumnsSession(def);
    } else if (def.type === "runlanes") {
      session = E.createRunLanesSession(def);
    } else if (def.type === "elevenup") {
      session = E.createElevenSession(def);
    } else if (def.type === "powersol") {
      session = E.createPowerSession(def);
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
    if (!session || usesColumnsPlayfield() || isEleven() || isPower() || session.status !== "playing") return;
    E.hit(session);
    renderGame();
  });
  ui.stay.addEventListener("click", function () {
    if (!session || usesColumnsPlayfield() || isEleven() || isPower() || session.status !== "playing") return;
    E.stay(session);
    renderGame();
  });
  ui.deal.addEventListener("click", function () {
    if (!session) return;
    if (isColumns()) return;
    if (isRunLanes()) {
      if (session.status !== "done") return;
      E.dealRunLanes(session);
      renderGame();
      return;
    }
    if (isEleven()) {
      session = E.createElevenSession(gameDef);
      renderGame();
      return;
    }
    if (isPower()) {
      session = E.createPowerSession(gameDef);
      renderGame();
      return;
    }
    E.deal(session);
    renderGame();
  });
  ui.next.addEventListener("click", function () {
    if (!session || !isEleven() || session.status !== "playing") return;
    if (!E.snapshotEleven(session).canNext) return;
    E.nextEleven(session);
    renderGame();
  });
  ui.take.addEventListener("click", function () {
    if (!session || !isEleven() || session.status !== "playing") return;
    E.takeEleven(session);
    renderGame();
  });
  ui.elevenGrid.addEventListener("click", function (ev) {
    if (!session || !isEleven() || session.status !== "playing") return;
    const cell = ev.target.closest("[data-cell]");
    if (!cell) return;
    E.tapEleven(session, Number(cell.getAttribute("data-cell")));
    renderGame();
  });
  ui.powerFoundations.addEventListener("click", function (ev) {
    if (!session || !isPower() || session.status !== "playing") return;
    const well = ev.target.closest("[data-foundation]");
    if (!well) return;
    E.tapPower(session, { kind: "foundation", suit: well.getAttribute("data-foundation") });
    renderGame();
  });
  ui.powerStocks.addEventListener("click", function (ev) {
    if (!session || !isPower() || session.status !== "playing") return;
    const well = ev.target.closest("[data-stock]");
    if (!well) return;
    E.tapPower(session, { kind: "stock", pile: Number(well.getAttribute("data-stock")) });
    renderGame();
  });
  ui.powerTableau.addEventListener("click", function (ev) {
    if (!session || !isPower() || session.status !== "playing") return;
    const col = ev.target.closest("[data-pcol]");
    if (!col) return;
    E.tapPower(session, { kind: "tableau", col: Number(col.getAttribute("data-pcol")) });
    renderGame();
  });
  ui.skip.addEventListener("click", function () {
    if (!session || !usesColumnsPlayfield() || session.status !== "playing") return;
    if (session.skipsLeft <= 0) return;
    if (isRunLanes()) {
      E.skipRunLane(session);
    } else {
      E.skipColumn(session);
    }
    renderGame();
  });
  ui.columns.addEventListener("click", function (ev) {
    if (!session || !usesColumnsPlayfield() || session.status !== "playing") return;
    const stayBtn = ev.target.closest("[data-stay]");
    if (stayBtn) {
      if (!isRunLanes()) return;
      const stayIndex = Number(stayBtn.getAttribute("data-stay"));
      const stayLane = session.columns[stayIndex];
      if (!stayLane || stayLane.locked) return;
      E.stayRunLane(session, stayIndex);
      renderGame();
      return;
    }
    const well = ev.target.closest("[data-col]");
    if (!well) return;
    const i = Number(well.getAttribute("data-col"));
    if (isRunLanes()) {
      const lane = session.columns[i];
      if (!lane || lane.locked) return;
      E.placeRunLane(session, i);
    } else {
      E.placeColumn(session, i);
    }
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
