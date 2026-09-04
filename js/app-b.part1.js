        '<li class="status-error">This kit plays type "runlanes", "columns21", "elevenup", "klondike", "freecell", "spider", "yacht", "sudoku6", "sudoku9", "reversi", "hoops", "quiznight", "blast", "triple", "chime", "slot", and "run21". See README.</li>';
      openCabinet();
      return;
    }
    stopHoopsLoop();
    if (window.CabinetSlot) window.CabinetSlot.unmount();
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
    } else if (def.type === "slot") {
      session = { type: "slot", status: "playing", score: 0, lastEvent: { kind: "deal" } };
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
    if (def.type === "slot" && window.CabinetSlot) {
      setMode("slot");
      window.CabinetSlot.mount(def, ui).then(function () {
        if (session) {
          session.score = window.CabinetSlot.getScore();
          session.status = window.CabinetSlot.getStatus();
        }
        renderGame();
      }).catch(function (err) {
        ui.banner.className = "banner bust";
        ui.banner.textContent = String(err.message || err);
      });
      return;
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
    if (!session || usesColumnsPlayfield() || isEleven() || isPower() || isYacht() || isArcadePlay() || isMatch() || isSlot() || session.status !== "playing") return;
    E.hit(session);
    renderGame();
  });
  ui.stay.addEventListener("click", function () {
    if (!session || usesColumnsPlayfield() || isEleven() || isPower() || isYacht() || isArcadePlay() || isMatch() || isSlot() || session.status !== "playing") return;
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
    if (isColumns()) {
      if (session.status !== "done") return;
      session = E.createColumnsSession(gameDef);
      sfxNewSitting(session);
      renderGame();
      return;
    }
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
    if (isSlot()) {
      if (window.CabinetSlot && window.CabinetSlot.getStatus() !== "done") return;
      if (window.CabinetSlot) {
        window.CabinetSlot.reset().then(function () {
          session = { type: "slot", status: "playing", score: 0, lastEvent: { kind: "deal" } };
          sfxNewSitting(session);
          renderGame();
        });
      }
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
