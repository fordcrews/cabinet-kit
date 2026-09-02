  function renderRunLanes() {
    const snap = E.snapshotRunLanes(session);
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score) + " / " + snap.perfect;
    let roundLine = label("skips", "SKIPS") + " " + snap.skipsLeft;
    if (snap.rounds > 0) {
      roundLine += " · " + label("session", "SESSION") + " " + snap.sessionScore;
    }
    ui.hudRound.textContent = roundLine;
    ui.hudDeck.textContent = label("deck", "DECK") + " " + snap.deckCount;
    ui.incomingLabel.textContent = label("incoming", "NEXT");
    ui.skip.textContent = label("skip", "SKIP") + " " + snap.skipsLeft;
    ui.skip.disabled = !snap.canSkip;
    ui.skip.classList.toggle("is-ready", !!snap.canSkip);
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.toggle("hidden", snap.status !== "done");
    ui.back.textContent = label("back", "CABINET");
    ui.incoming.replaceChildren();
    ui.incoming.classList.toggle("is-live", !!snap.incoming);
    if (ui.incoming.parentElement) {
      ui.incoming.parentElement.classList.toggle("is-live", !!snap.incoming);
    }
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
      place.tabIndex = col.locked ? -1 : 0;
      if (snap.status === "playing" && snap.incoming && !col.locked) {
        const preview = col.cards.concat(snap.incoming);
        if (E.handValue(preview, snap.target) > snap.target) {
          wrap.classList.add("would-bust");
        }
      }
      const evLane = snap.lastEvent;
      if (evLane && evLane.column === i && (evLane.kind === "bust" || evLane.kind === "run" || evLane.kind === "21")) {
        wrap.classList.add(evLane.kind === "bust" ? "just-bust" : "just-clear");
      }
      const stack = document.createElement("div");
      stack.className = "column-stack";
      col.cards.forEach(function (c) {
        stack.appendChild(pieceNode(c, true));
      });
      const tot = document.createElement("div");
      tot.className = "column-total";
      if (col.outcome === "bust") {
        tot.textContent = "0";
      } else {
        tot.textContent = col.cards.length ? String(col.total) : "0";
      }
      place.appendChild(stack);
      place.appendChild(tot);
      const stayBtn = document.createElement("button");
      stayBtn.type = "button";
      stayBtn.className = "column-stay-btn";
      stayBtn.dataset.stay = String(i);
      if (col.locked) {
        stayBtn.classList.add("is-outcome");
        if (col.outcome === "bust") stayBtn.textContent = label("bust", "BUST");
        else if (col.outcome === "run") stayBtn.textContent = label("run", "RUN");
        else if (col.outcome === "21") stayBtn.textContent = label("complete", "21");
        else stayBtn.textContent = label("stay", "STAY");
        stayBtn.disabled = true;
        stayBtn.tabIndex = -1;
      } else {
        stayBtn.textContent = label("stay", "STAY");
        stayBtn.disabled = snap.status !== "playing";
      }
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
    ui.deal.classList.remove("ghost", "is-reset");
    ui.skip.classList.remove("is-ready");
    if (ui.shoot) ui.shoot.classList.remove("is-hot");
    ui.brand.textContent = gameDef.title || "Game";
    ui.sub.textContent = gameDef.tagline || "";
    ui.scoreBlock.hidden = false;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.back.textContent = label("back", "CABINET");
    const ctx = playCtx();
    if (isColumns()) {
      setMode("columns21");
      renderColumns();
    } else if (isRunLanes()) {
      setMode("runlanes");
      renderRunLanes();
    } else if (isEleven()) {
      setMode("elevenup");
      window.CabinetPlay.renderEleven(ctx);
    } else if (isPower()) {
      setMode(gameType());
      window.CabinetPlay.renderPower(ctx);
    } else if (isYacht()) {
      setMode("yacht");
      window.CabinetPlay.renderYacht(ctx);
    } else if (isSudoku()) {
      setMode(gameType());
      window.CabinetPlay.renderSudoku(ctx);
    } else if (isReversi()) {
      setMode("reversi");
      window.CabinetPlay.renderReversi(ctx);
    } else if (isHoops()) {
      setMode("hoops");
      window.CabinetPlay.renderHoops(ctx);
      startHoopsLoop();
    } else if (isQuiz()) {
      setMode("quiznight");
      window.CabinetPlay.renderQuiz(ctx);
    } else if (isMatch()) {
      setMode(gameType());
      window.CabinetPlay.renderMatch(ctx);
    } else {
      setMode("run21");
      renderRun();
    }
    const high = noteHigh(ctx);
    if (window.CabinetSfx) {
      window.CabinetSfx.fromEvent(session.lastEvent, {
        status: session.status,
        session: session,
        isNew: !!(high && high.isNew),
        outcome: session.lastOutcome,
      });
    }
  }
  function playCtx() {
    return { E: E, ui: ui, session: session, gameDef: gameDef, label: label, copy: copy };
  }
  let hoopsRaf = 0;
  function stopHoopsLoop() {
    if (hoopsRaf) cancelAnimationFrame(hoopsRaf);
    hoopsRaf = 0;
  }
  function startHoopsLoop() {
    stopHoopsLoop();
    function frame(t) {
      if (!session || !isHoops() || session.status !== "playing") {
        hoopsRaf = 0;
        return;
      }
      E.hoopsTick(session, t);
      if (window.CabinetPlay.paintHoops) window.CabinetPlay.paintHoops(ui, session);
      hoopsRaf = requestAnimationFrame(frame);
    }
    hoopsRaf = requestAnimationFrame(frame);
  }
  function openCabinet() {
    stopHoopsLoop();
    session = null;
    gameDef = null;
    show("cabinet");
    ui.brand.textContent = "Cabinet";
    ui.sub.textContent = "Card kit · offline";
    ui.scoreBlock.hidden = true;
  }
  function startGame(def) {
    const PLAYABLE = {
      run21: 1,
      columns21: 1,
      runlanes: 1,
      elevenup: 1,
      klondike: 1,
      freecell: 1,
      spider: 1,
      yacht: 1,
      sudoku6: 1,
      sudoku9: 1,
      reversi: 1,
      hoops: 1,
      quiznight: 1,
      blast: 1,
      triple: 1,
      chime: 1,
    };
    if (!def || !PLAYABLE[def.type]) {
      ui.list.innerHTML =
        '<li class="status-error">This kit plays type "runlanes", "columns21", "elevenup", "klondike", "freecell", "spider", "yacht", "sudoku6", "sudoku9", "reversi", "hoops", "quiznight", "blast", "triple", "chime", and "run21". See README.</li>';
      openCabinet();
      return;
    }
    stopHoopsLoop();
    gameDef = def;
    if (def.type === "columns21") {
      session = E.createColumnsSession(def);
    } else if (def.type === "runlanes") {
      session = E.createRunLanesSession(def);
    } else if (def.type === "elevenup") {
      session = E.createElevenSession(def);
    } else if (def.type === "klondike" || def.type === "freecell" || def.type === "spider") {
      session = E.createPatienceSession(def);
    } else if (def.type === "yacht") {
      session = E.createYachtSession(def);
    } else if (def.type === "sudoku6" || def.type === "sudoku9") {
      session = E.createSudokuSession(def);
    } else if (def.type === "reversi") {
      session = E.createReversiSession(def);
    } else if (def.type === "hoops") {
      session = E.createHoopsSession(def);
    } else if (def.type === "quiznight") {
      session = E.createQuizSession(def);
    } else if (def.type === "blast") {
      session = E.createBlastSession(def);
    } else if (def.type === "triple") {
      session = E.createTripleSession(def);
    } else if (def.type === "chime") {
      session = E.createChimeSession(def);
    } else {
      session = E.createSession(def);
    }
    show("game");
    if (window.CabinetSfx) {
      window.CabinetSfx.play("deal");
      if (session.lastEvent && session.lastEvent.kind === "deal") {
        session._sfxSeen = session.lastEvent;
      }
    }
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
    const groups =
      Array.isArray(data.categories) && data.categories.length
        ? data.categories
        : [{ id: "all", title: "", games: Array.isArray(data.games) ? data.games : [] }];
    const fileCache = new Map();
    async function loadFile(file) {
      if (fileCache.has(file)) return fileCache.get(file);
      const gRes = await fetch("games/" + file);
      if (!gRes.ok) {
        fileCache.set(file, null);
        return null;
      }
      const def = await gRes.json();
      def.file = file;
      gamesById.set(def.id || file.replace(/\.json$/, ""), { file: file, def: def });
      fileCache.set(file, def);
      return def;
    }
    function addGameButton(def) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = '<span class="title"></span><span class="tagline"></span>';
      btn.querySelector(".title").textContent = def.title || def.id;
      btn.querySelector(".tagline").textContent = def.tagline || def.blurb || "";
      const high = window.CabinetScores ? window.CabinetScores.get(def.id) : 0;
      if (high > 0) {
        const best = document.createElement("span");
        best.className = "best";
        best.textContent = "BEST " + high;
        btn.appendChild(best);
      }
      btn.addEventListener("click", function () {
        location.hash = "#/play/" + encodeURIComponent(def.id);
      });
      li.appendChild(btn);
      ui.list.appendChild(li);
    }
    ui.list.replaceChildren();
    let any = false;
    for (const cat of groups) {
      const files = Array.isArray(cat.games) ? cat.games : [];
      const defs = [];
      for (const file of files) {
        const def = await loadFile(file);
        if (def) defs.push(def);
      }
      if (!defs.length) continue;
      if (cat.title) {
        const head = document.createElement("li");
        head.className = "cat-head";
        head.textContent = cat.title;
        ui.list.appendChild(head);
      }
      defs.forEach(function (def) {
        any = true;
        addGameButton(def);
      });
    }
    if (!any) {
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
    if (!session || usesColumnsPlayfield() || isEleven() || isPower() || isYacht() || isArcadePlay() || isMatch() || session.status !== "playing") return;
    E.hit(session);
    renderGame();
  });
  ui.stay.addEventListener("click", function () {
    if (!session || usesColumnsPlayfield() || isEleven() || isPower() || isYacht() || isArcadePlay() || isMatch() || session.status !== "playing") return;
    E.stay(session);
    renderGame();
  });
  function sfxNewSitting(sess) {
    if (!window.CabinetSfx || !sess) return;
    window.CabinetSfx.play("deal");
    if (sess.lastEvent && sess.lastEvent.kind === "deal") {
      sess._sfxSeen = sess.lastEvent;
    } else {
      sess._sfxSeen = null;
    }
  }
  ui.deal.addEventListener("click", function () {
    if (!session) return;
    if (isColumns()) return;
    if (isRunLanes()) {
      if (session.status !== "done") return;
      E.dealRunLanes(session);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    if (isEleven()) {
      session = E.createElevenSession(gameDef);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    if (isPower()) {
      session = E.createPatienceSession(gameDef);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    if (isYacht()) {
      if (session.status !== "done") return;
      session = E.createYachtSession(gameDef);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    if (isSudoku()) {
      E.dealSudoku(session);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    if (isReversi()) {
      session = E.createReversiSession(gameDef);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    if (isHoops()) {
      session = E.createHoopsSession(gameDef);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    if (isQuiz()) {
      session = E.createQuizSession(gameDef);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    if (isMatch()) {
      if (session.status !== "done") return;
      if (gameType() === "blast") session = E.createBlastSession(gameDef);
      else if (gameType() === "triple") session = E.createTripleSession(gameDef);
      else session = E.createChimeSession(gameDef);
      sfxNewSitting(session);
      renderGame();
      return;
    }
    E.deal(session);
    sfxNewSitting(session);
    renderGame();
  });
  ui.next.addEventListener("click", function () {
    if (!session || session.status !== "playing") return;
    if (isQuiz()) {
      E.quizNext(session);
      renderGame();
      return;
    }
    if (!isEleven()) return;
    if (!E.snapshotEleven(session).canNext) return;
    E.nextEleven(session);
    renderGame();
  });
  ui.take.addEventListener("click", function () {
    if (!session) return;
    if (isQuiz()) {
      E.takeQuiz(session);
      renderGame();
      return;
    }
    if (!isEleven() || session.status !== "playing") return;
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
  function patienceTargetFromEvent(ev) {
    const foundation = ev.target.closest("[data-foundation]");
    if (foundation) return { kind: "foundation", suit: foundation.getAttribute("data-foundation") };
    const cell = ev.target.closest("[data-pcell]");
    if (cell) return { kind: "cell", i: Number(cell.getAttribute("data-pcell")) };
    const stock = ev.target.closest("[data-stock]");
    if (stock) {
      const kind = stock.getAttribute("data-stock");
      if (kind === "waste") return { kind: "waste" };
      return { kind: "stock" };
    }
    const card = ev.target.closest("[data-idx]");
    if (card) {
      const out = {
        kind: "tableau",
        col: Number(card.getAttribute("data-pcol")),
        index: Number(card.getAttribute("data-idx")),
      };
      return out;
    }
    const col = ev.target.closest("[data-pcol]");
    if (col) return { kind: "tableau", col: Number(col.getAttribute("data-pcol")) };
    return null;
  }
  function onPatienceClick(ev) {
    if (!session || !isPower() || session.status !== "playing") return;
    const target = patienceTargetFromEvent(ev);
    if (!target) return;
    E.tapPatience(session, target);
    renderGame();
  }
  if (ui.playPower) ui.playPower.addEventListener("click", onPatienceClick);
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
  if (ui.roll) {
    ui.roll.addEventListener("click", function () {
      if (!session || !isYacht() || session.status !== "playing") return;
      if (session.rollsLeft <= 0) return;
      E.rollYacht(session);
      renderGame();
    });
  }
  if (ui.yachtDice) {
    ui.yachtDice.addEventListener("click", function (ev) {
      if (!session || !isYacht() || session.status !== "playing") return;
      const die = ev.target.closest("[data-die]");
      if (!die) return;
      E.toggleHold(session, Number(die.getAttribute("data-die")));
      renderGame();
    });
  }
  if (ui.yachtCard) {
    ui.yachtCard.addEventListener("click", function (ev) {
      if (!session || !isYacht() || session.status !== "playing") return;
      const row = ev.target.closest("[data-cat]");
      if (!row || row.disabled) return;
      try {
        E.scoreYacht(session, row.getAttribute("data-cat"));
      } catch (err) {
        return;
      }
      renderGame();
    });
  }
  if (ui.sudokuGrid) {
    ui.sudokuGrid.addEventListener("click", function (ev) {
      if (!session || !isSudoku() || session.status !== "playing") return;
      const cell = ev.target.closest("[data-sudoku]");
      if (!cell) return;
      E.tapSudokuCell(session, Number(cell.getAttribute("data-sudoku")));
      renderGame();
    });
  }
  if (ui.sudokuPad) {
    ui.sudokuPad.addEventListener("click", function (ev) {
      if (!session || !isSudoku() || session.status !== "playing") return;
      const btn = ev.target.closest("[data-digit]");
      if (!btn) return;
      E.setSudokuDigit(session, Number(btn.getAttribute("data-digit")));
      renderGame();
    });
  }
  window.addEventListener("keydown", function (ev) {
    if (!session || !isSudoku() || session.status !== "playing") return;
    if (ev.key === "Backspace" || ev.key === "Delete" || ev.key === "0") {
      E.setSudokuDigit(session, 0);
      renderGame();
      return;
    }
    const d = Number(ev.key);
    const max = (session.size || 6);
    if (d >= 1 && d <= max) {
      E.setSudokuDigit(session, d);
      renderGame();
    }
  });
  if (ui.reversiBoard) {
    ui.reversiBoard.addEventListener("click", function (ev) {
      if (!session || !isReversi() || session.status !== "playing") return;
      if (session.thinking || session.turn !== 1) return;
      const cell = ev.target.closest("[data-rev]");
      if (!cell) return;
      E.playReversi(session, Number(cell.getAttribute("data-rev")));
      function runAi() {
        if (!session || !isReversi() || session.status !== "playing") return;
        if (session.turn !== 2) {
          session.thinking = false;
          renderGame();
          return;
        }
        const pick = E.aiReversiPick(session);
        if (pick < 0) {
          session.thinking = false;
          renderGame();
          return;
        }
        E.playReversi(session, pick);
        if (session.turn === 2 && session.status === "playing") {
          session.thinking = true;
          renderGame();
          setTimeout(runAi, 450);
          return;
        }
        session.thinking = false;
        renderGame();
      }
      if (session.turn === 2 && session.status === "playing") {
        session.thinking = true;
        renderGame();
        setTimeout(runAi, 450);
      } else {
        session.thinking = false;
        renderGame();
      }
    });
  }
  if (ui.shoot) {
    ui.shoot.addEventListener("click", function () {
      if (!session || !isHoops() || session.status !== "playing") return;
      E.hoopsShoot(session);
      renderGame();
    });
  }
  if (ui.quizChoices) {
    ui.quizChoices.addEventListener("click", function (ev) {
      if (!session || !isQuiz() || session.status !== "playing") return;
      const btn = ev.target.closest("[data-choice]");
      if (!btn) return;
      E.answerQuiz(session, Number(btn.getAttribute("data-choice")));
      renderGame();
    });
  }
  if (ui.matchGrid) {
    ui.matchGrid.addEventListener("click", function (ev) {
      if (!session || !isMatch() || session.status !== "playing") return;
      const cell = ev.target.closest("[data-cell]");
      if (!cell) return;
      const i = Number(cell.getAttribute("data-cell"));
      const t = gameType();
      if (t === "blast") E.tapBlast(session, i);
      else if (t === "triple") E.tapTriple(session, i);
      else E.tapChime(session, i);
      renderGame();
    });
  }
  ui.back.addEventListener("click", function () {
    location.hash = "#/";
  });
  function paintSfx() {
    const btn = ui.sfx;
    if (!btn) return;
    const isOff = window.CabinetSfx ? window.CabinetSfx.isMuted() : false;
    btn.setAttribute("aria-pressed", isOff ? "true" : "false");
    btn.textContent = isOff ? "MUTED" : "SOUND";
    btn.classList.toggle("is-muted", isOff);
  }
  if (ui.sfx) {
    ui.sfx.addEventListener("click", function () {
      if (!window.CabinetSfx) return;
      const nowMuted = window.CabinetSfx.toggle();
      paintSfx();
      if (!nowMuted) window.CabinetSfx.play("tap");
    });
  }
  if (window.CabinetSfx) {
    window.CabinetSfx.onMuteChange(paintSfx);
    paintSfx();
    document.addEventListener("pointerdown", window.CabinetSfx.unlock, { once: false });
    document.addEventListener("touchstart", window.CabinetSfx.unlock, { once: false, passive: true });
  }
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
