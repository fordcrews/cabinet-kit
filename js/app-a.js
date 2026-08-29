(function () {
  "use strict";
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch (e) {}
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
    scoreBest: $("score-best"),
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
    next: $("btn-next"),
    take: $("btn-take"),
    playEleven: $("play-eleven"),
    playPower: $("play-power"),
    playYacht: $("play-yacht"),
    elevenGrid: $("eleven-grid"),
    powerFoundations: $("power-foundations"),
    powerStocks: $("power-stocks"),
    powerTableau: $("power-tableau"),
    yachtDice: $("yacht-dice"),
    yachtCard: $("yacht-card"),
    playSudoku: $("play-sudoku"),
    playReversi: $("play-reversi"),
    playHoops: $("play-hoops"),
    playQuiz: $("play-quiz"),
    sudokuGrid: $("sudoku-grid"),
    sudokuPad: $("sudoku-pad"),
    reversiBoard: $("reversi-board"),
    hoopsCourt: $("hoops-court"),
    hoopsRim: $("hoops-rim"),
    hoopsBall: $("hoops-ball"),
    quizQ: $("quiz-q"),
    quizChoices: $("quiz-choices"),
    roll: $("btn-roll"),
    shoot: $("btn-shoot"),
    back: $("btn-back"),
  };
  if (window.CabinetPlay) window.CabinetPlay.attachUi(ui);
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
  function gameType() {
    return (gameDef && gameDef.type) || "";
  }
  function isColumns() {
    return gameType() === "columns21";
  }
  function isRunLanes() {
    return gameType() === "runlanes";
  }
  function isEleven() {
    return gameType() === "elevenup";
  }
  function isPower() {
    return gameType() === "powersol";
  }
  function isYacht() {
    return gameType() === "yacht";
  }
  function isSudoku() {
    return gameType() === "sudoku6";
  }
  function isReversi() {
    return gameType() === "reversi";
  }
  function isHoops() {
    return gameType() === "hoops";
  }
  function isQuiz() {
    return gameType() === "quiznight";
  }
  function isArcadePlay() {
    return isSudoku() || isReversi() || isHoops() || isQuiz();
  }
  function usesColumnsPlayfield() {
    const t = gameType();
    return t === "columns21" || t === "runlanes";
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
    window.CabinetPlay.applyMode(ui, type);
  }
  function paintBest(id) {
    const el = ui.scoreBest || $("score-best");
    if (!el) return;
    const high = window.CabinetScores ? window.CabinetScores.get(id) : 0;
    el.textContent = high > 0 ? "BEST " + high : "";
  }
  function sittingScore() {
    const type = gameType();
    if (type === "yacht") return E.snapshotYacht(session).total;
    if (type === "reversi") return E.snapshotReversi(session).dark;
    if (type === "runlanes") return E.snapshotRunLanes(session).score;
    if (type === "columns21") return E.snapshotColumns(session).score;
    if (type === "elevenup") return E.snapshotEleven(session).score;
    if (type === "powersol") return E.snapshotPower(session).score;
    if (type === "sudoku6") return E.snapshotSudoku(session).score;
    if (type === "hoops") return E.snapshotHoops(session).score;
    if (type === "quiznight") return E.snapshotQuiz(session).score;
    return Number(session && session.score) || 0;
  }
  function shouldRecordHigh() {
    const type = gameType();
    const status = session && session.status;
    if (type === "reversi") return status === "done";
    if (type === "runlanes" || type === "columns21" || type === "elevenup") {
      return status === "done";
    }
    if (type === "run21") {
      return status === "bust" || status === "run" || status === "stay";
    }
    return true;
  }
  function applyNewHighBanner(isNew) {
    if (!isNew || !ui.banner) return;
    const t = ui.banner.textContent || "";
    if (t.indexOf("NEW HIGH") >= 0) return;
    ui.banner.textContent = t ? t + " · NEW HIGH" : "NEW HIGH";
  }
  function noteHigh(playCtxObj) {
    if (!session || !gameDef) return;
    if (window.CabinetScores) paintBest(gameDef.id);
    let result = playCtxObj && playCtxObj.highResult;
    if (!result && window.CabinetScores && shouldRecordHigh()) {
      result = window.CabinetScores.record(gameDef.id, sittingScore());
    }
    if (window.CabinetScores) paintBest(gameDef.id);
    applyNewHighBanner(result && result.isNew);
  }
  function renderColumns() {
    const snap = E.snapshotColumns(session);
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("skips", "SKIPS") + " " + snap.skipsLeft;
    ui.hudDeck.textContent = label("deck", "DECK") + " " + snap.deckCount;
    ui.incomingLabel.textContent = label("incoming", "NEXT");
    ui.skip.textContent = label("skip", "SKIP") + " " + snap.skipsLeft;
    ui.skip.disabled = !snap.canSkip;
    ui.skip.classList.toggle("is-ready", !!snap.canSkip);
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
    const ev = snap.lastEvent;
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
      if (ev && ev.kind === "bust" && ev.column === i) {
        btn.classList.add("just-bust");
      }
      if (ev && ev.kind === "clear" && ev.column === i) {
        btn.classList.add("just-clear");
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
        label("bust", "BUST") + " · " + copy("bust", "Over the target.");
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
