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
    } else if (isSlot()) {
      setMode("slot");
      if (window.CabinetSlot) {
        window.CabinetSlot.render(ui, gameDef);
        if (session) {
          session.score = window.CabinetSlot.getScore();
          session.status = window.CabinetSlot.getStatus();
        }
        ui.scoreValue.textContent = String(window.CabinetSlot.getScore());
        paintBest(gameDef.id);
      }
    } else {
      setMode("run21");
      renderRun();
    }
    const high = noteHigh(ctx);
    noteSetLegIfNeeded();
    if (inSet()) applySetChrome();
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
    if (window.CabinetSlot) window.CabinetSlot.unmount();
    session = null;
    gameDef = null;
    clearSet();
    show("cabinet");
    ui.brand.textContent = "Cabinet";
    ui.sub.textContent = "Card kit · offline";
    ui.scoreBlock.hidden = true;
    ensureSetStrip();
    paintSetStrip();
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
      slot: 1,
    };
    if (!def || !PLAYABLE[def.type]) {
      ui.list.innerHTML =
