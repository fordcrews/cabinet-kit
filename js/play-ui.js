/**
 * 11 Up + Power Solitaire player views. Loaded after engine/solitaire, before or with app.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  function cardNode(card, mini, selected) {
    const el = document.createElement("article");
    const faceDown = card && card.faceUp === false;
    const red = card && (card.suit === "♥" || card.suit === "♦");
    el.className =
      "card" +
      (faceDown ? " card-back" : red ? " card-red" : " card-black") +
      (mini ? " card-mini" : "") +
      (selected ? " selected" : "");
    if (faceDown) {
      el.setAttribute("aria-label", "Facedown");
      el.innerHTML = '<span class="card-back-mark">◆</span>';
      return el;
    }
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

  function notePlayHigh(ctx, score, snap) {
    if (!ctx || !ctx.gameDef || !window.CabinetScores) return;
    const type = ctx.gameDef.type;
    const status = snap && snap.status;
    if (type === "reversi" && status !== "done") return;
    if (type === "elevenup" && status !== "done") return;
    const n = Number(score);
    const val = Number.isFinite(n) ? n : 0;
    ctx.highResult = window.CabinetScores.record(ctx.gameDef.id, val);
  }

  function applyMode(ui, type) {
    const columnsPlay = type === "columns21" || type === "runlanes";
    const eleven = type === "elevenup";
    const power = type === "powersol";
    const yacht = type === "yacht";
    const sudoku = type === "sudoku6";
    const reversi = type === "reversi";
    const hoops = type === "hoops";
    const quiz = type === "quiznight";
    const hideRun = columnsPlay || eleven || power || yacht || sudoku || reversi || hoops || quiz;
    ui.playRun.classList.toggle("hidden", hideRun);
    ui.playColumns.classList.toggle("hidden", !columnsPlay);
    if (ui.playEleven) ui.playEleven.classList.toggle("hidden", !eleven);
    if (ui.playPower) ui.playPower.classList.toggle("hidden", !power);
    if (ui.playYacht) ui.playYacht.classList.toggle("hidden", !yacht);
    if (ui.playSudoku) ui.playSudoku.classList.toggle("hidden", !sudoku);
    if (ui.playReversi) ui.playReversi.classList.toggle("hidden", !reversi);
    if (ui.playHoops) ui.playHoops.classList.toggle("hidden", !hoops);
    if (ui.playQuiz) ui.playQuiz.classList.toggle("hidden", !quiz);
    ui.hit.classList.toggle("hidden", hideRun);
    ui.stay.classList.toggle("hidden", hideRun);
    ui.skip.classList.toggle("hidden", !columnsPlay);
    if (ui.next) ui.next.classList.toggle("hidden", !(eleven || quiz));
    if (ui.take) ui.take.classList.toggle("hidden", !(eleven || quiz));
    if (ui.roll) ui.roll.classList.toggle("hidden", !yacht);
    if (ui.shoot) ui.shoot.classList.toggle("hidden", !hoops);
    if (type === "columns21") ui.deal.classList.add("hidden");
    else if (type === "runlanes") {
      ui.hit.classList.add("hidden");
      ui.stay.classList.add("hidden");
    } else if (eleven) ui.deal.classList.add("hidden");
    else if (power) ui.deal.classList.remove("hidden");
    else if (yacht) {
      ui.deal.classList.add("hidden");
      ui.hit.classList.add("hidden");
      ui.stay.classList.add("hidden");
    } else if (sudoku || reversi || hoops || quiz) {
      ui.deal.classList.add("hidden");
      ui.hit.classList.add("hidden");
      ui.stay.classList.add("hidden");
    } else {
      ui.skip.classList.add("hidden");
      if (ui.next) ui.next.classList.add("hidden");
      if (ui.take) ui.take.classList.add("hidden");
      if (ui.roll) ui.roll.classList.add("hidden");
      if (ui.shoot) ui.shoot.classList.add("hidden");
    }
  }

  function renderEleven(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotEleven(session);
    const label = ctx.label, copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("stock", "STOCK") + " " + snap.stockCount;
    ui.hudDeck.textContent = "";
    ui.next.textContent = label("next", "NEXT CARD");
    ui.take.textContent = label("take", "TAKE SCORE");
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.back.textContent = label("back", "CABINET");
    const playing = snap.status === "playing";
    ui.next.classList.toggle("hidden", !playing);
    ui.take.classList.toggle("hidden", !playing);
    ui.deal.classList.toggle("hidden", playing);
    ui.next.disabled = !snap.canNext;
    ui.take.disabled = !playing;
    ui.elevenGrid.replaceChildren();
    snap.grid.forEach(function (c, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      const sel = snap.selected === i;
      btn.className = "eleven-cell" + (c ? "" : " is-empty") + (sel ? " is-selected" : "");
      btn.dataset.cell = String(i);
      btn.disabled = !playing;
      if (c) btn.appendChild(cardNode(c, false, sel));
      ui.elevenGrid.appendChild(btn);
    });
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      if (ev && ev.kind === "clear") {
        ui.banner.classList.add("run");
        ui.banner.textContent = copy("clear", "Table clear. Bonus banked.") + " · " + snap.score;
      } else {
        ui.banner.textContent = copy("done", "Sitting over. Deal again.") + " · " + snap.score;
      }
    } else if (ev && ev.kind === "pair") {
      ui.banner.classList.add("run");
      ui.banner.textContent = "+" + ev.points + " · " + copy("pair", "Pair off.");
    } else if (ev && ev.kind === "illegal") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("illegal", "Those two don't make 11.");
    } else if (ev && ev.kind === "next") {
      ui.banner.textContent = copy("next", "New card on the table.") + " " + ev.points;
    } else if (!snap.canNext && playing && snap.stockCount > 0) {
      ui.banner.textContent = copy("full", "No empty cell. Take score or peel a pair.");
    } else {
      ui.banner.textContent = copy("playing", "Tap two open cards that make 11.");
    }
    notePlayHigh(ctx, snap.score, snap);
  }

  function selMatch(sel, kind, key, value) {
    return sel && sel.kind === kind && sel[key] === value;
  }

  function renderPower(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotPower(session);
    const label = ctx.label, copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("home", "HOME") + " " + snap.home + "/" + snap.total;
    ui.hudDeck.textContent = label("stock", "STOCK") + " " + snap.stockCount;
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.remove("hidden");
    ui.back.textContent = label("back", "CABINET");
    const sel = snap.selected;
    const playing = snap.status === "playing";
    ui.powerFoundations.replaceChildren();
    E.SUITS.forEach(function (suit) {
      const well = snap.foundations[suit];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "power-well foundation-well";
      btn.dataset.foundation = suit;
      btn.disabled = !playing;
      const mark = document.createElement("span");
      mark.className = "power-suit" + (suit === "♥" || suit === "♦" ? " card-red" : "");
      mark.textContent = suit;
      btn.appendChild(mark);
      if (well.top) btn.appendChild(cardNode(well.top, true, false));
      const meta = document.createElement("span");
      meta.className = "power-meta";
      meta.textContent = well.count + "/" + well.max;
      btn.appendChild(meta);
      ui.powerFoundations.appendChild(btn);
    });
    ui.powerStocks.replaceChildren();
    snap.stocks.forEach(function (pile, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "power-well stock-well" + (selMatch(sel, "stock", "pile", i) ? " is-selected" : "");
      btn.dataset.stock = String(i);
      btn.disabled = !playing || pile.count === 0;
      if (pile.top) {
        btn.appendChild(cardNode(pile.top, false, selMatch(sel, "stock", "pile", i)));
      } else {
        const empty = document.createElement("span");
        empty.className = "power-empty";
        empty.textContent = "—";
        btn.appendChild(empty);
      }
      const meta = document.createElement("span");
      meta.className = "power-meta";
      meta.textContent = String(pile.count);
      btn.appendChild(meta);
      ui.powerStocks.appendChild(btn);
    });
    ui.powerTableau.replaceChildren();
    snap.tableau.forEach(function (col, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "power-col" + (selMatch(sel, "tableau", "col", i) ? " is-selected" : "");
      btn.dataset.pcol = String(i);
      btn.disabled = !playing;
      if (!col.length) {
        const empty = document.createElement("span");
        empty.className = "power-empty-col";
        empty.textContent = "J";
        btn.appendChild(empty);
      } else {
        col.forEach(function (c, n) {
          const isTop = n === col.length - 1;
          const node = cardNode(c, !isTop, isTop && selMatch(sel, "tableau", "col", i));
          if (!isTop) node.classList.add("stacked");
          btn.appendChild(node);
        });
      }
      ui.powerTableau.appendChild(btn);
    });
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "won") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("won", "All 44 home. Power complete.") + " · " + snap.score;
    } else if (ev && ev.kind === "foundation") {
      ui.banner.classList.add("run");
      ui.banner.textContent = "+" + ev.points + " · " + copy("foundation", "Home.");
    } else if (ev && ev.kind === "illegal") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("illegal", "That pile won't take it.");
    } else if (ev && ev.kind === "move") {
      ui.banner.textContent = copy("move", "Card placed.");
    } else {
      ui.banner.textContent = copy("playing", "Tap a card, then a destination.");
    }
    notePlayHigh(ctx, snap.score, snap);
  }

  function renderSudoku(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotSudoku(session);
    const label = ctx.label, copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("puzzle", "PUZZLE") + " " + (snap.puzzleIndex + 1);
    ui.hudDeck.textContent = "";
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.toggle("hidden", snap.status !== "won");
    ui.back.textContent = label("back", "CABINET");
    const playing = snap.status === "playing";
    ui.sudokuGrid.replaceChildren();
    snap.grid.forEach(function (v, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      const given = snap.given[i];
      const sel = snap.selected === i;
      const bad = snap.conflicts[i];
      btn.className =
        "sudoku-cell" +
        (given ? " is-given" : "") +
        (sel ? " is-selected" : "") +
        (bad ? " is-conflict" : "");
      btn.dataset.sudoku = String(i);
      btn.disabled = !playing || given;
      btn.textContent = v ? String(v) : "";
      ui.sudokuGrid.appendChild(btn);
    });
    ui.sudokuPad.replaceChildren();
    for (let d = 1; d <= 6; d++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sudoku-digit";
      btn.dataset.digit = String(d);
      btn.textContent = String(d);
      btn.disabled = !playing || snap.selected == null;
      ui.sudokuPad.appendChild(btn);
    }
    const clr = document.createElement("button");
    clr.type = "button";
    clr.className = "sudoku-digit sudoku-clear";
    clr.dataset.digit = "0";
    clr.textContent = label("clear", "CLEAR");
    clr.disabled = !playing || snap.selected == null;
    ui.sudokuPad.appendChild(clr);
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "won") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("won", "Grid clear.") + " · " + snap.score;
    } else if (ev && ev.kind === "locked") {
      ui.banner.textContent = copy("locked", "That cell is given.");
    } else if (snap.conflicts.some(Boolean)) {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("conflict", "Duplicate in a row, column, or box.");
    } else {
      ui.banner.textContent = copy("playing", "Tap a cell, then 1–6. Givens stay put.");
    }
    notePlayHigh(ctx, snap.score, snap);
  }

  function renderReversi(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotReversi(session);
    const label = ctx.label, copy = ctx.copy;
    ui.scoreLabel.textContent = label("dark", "DARK");
    ui.scoreValue.textContent = snap.dark + "–" + snap.light;
    ui.hudRound.textContent =
      snap.turn === 1 ? label("you", "YOU") : label("cpu", "CPU");
    ui.hudDeck.textContent = label("light", "LIGHT") + " " + snap.light;
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.toggle("hidden", snap.status !== "done");
    ui.back.textContent = label("back", "CABINET");
    const legal = {};
    snap.legal.forEach(function (i) {
      legal[i] = true;
    });
    ui.reversiBoard.replaceChildren();
    snap.board.forEach(function (v, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "reversi-cell" +
        (v === 1 ? " is-dark" : "") +
        (v === 2 ? " is-light" : "") +
        (legal[i] ? " is-legal" : "");
      btn.dataset.rev = String(i);
      btn.disabled = snap.status !== "playing" || snap.turn !== 1 || !legal[i];
      if (v) {
        const disc = document.createElement("span");
        disc.className = "reversi-disc";
        btn.appendChild(disc);
      }
      ui.reversiBoard.appendChild(btn);
    });
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      ui.banner.classList.add(snap.dark >= snap.light ? "run" : "bust");
      ui.banner.textContent =
        copy("done", "Both sides stuck. Count the discs.") +
        " · " +
        snap.dark +
        "–" +
        snap.light;
    } else if (ev && ev.kind === "illegal") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("illegal", "Not a legal sandwich.");
    } else if (ev && ev.kind === "pass") {
      ui.banner.textContent = copy("pass", "No move. Pass.");
    } else {
      ui.banner.textContent = copy("playing", "Tap a marked square to place and flip.");
    }
    notePlayHigh(ctx, snap.dark, snap);
  }

  function paintHoops(ui, session) {
    if (!ui.hoopsRim || !session) return;
    ui.hoopsRim.style.left = session.rimX + "%";
    const scale = 0.85 + (session.distance || 1) * 0.12;
    ui.hoopsRim.style.width = Math.max(18, session.rimW * 2.2) + "%";
    ui.hoopsRim.style.transform = "translateX(-50%) scale(" + scale + ")";
    if (ui.hoopsBall) ui.hoopsBall.style.left = session.aimX + "%";
  }

  function renderHoops(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotHoops(session);
    const label = ctx.label, copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("shots", "SHOTS") + " " + snap.shotsTaken + "/" + snap.shots;
    ui.hudDeck.textContent = "";
    if (ui.shoot) {
      ui.shoot.textContent = label("shoot", "SHOOT");
      ui.shoot.classList.toggle("hidden", snap.status !== "playing");
      ui.shoot.disabled = snap.status !== "playing";
    }
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.toggle("hidden", snap.status !== "done");
    ui.back.textContent = label("back", "CABINET");
    paintHoops(ui, session);
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("done", "Ten shots. Deal again.") + " · " + snap.score;
    } else if (ev && ev.kind === "make") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("make", "Make.") + " +" + ev.points;
    } else if (ev && ev.kind === "miss") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("miss", "Miss.");
    } else {
      ui.banner.textContent = copy("playing", "Tap SHOOT when the rim covers the ball.");
    }
    notePlayHigh(ctx, snap.score, snap);
  }

  function renderQuiz(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotQuiz(session);
    const label = ctx.label, copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("q", "Q") + " " + (snap.index + 1) + "/" + snap.total;
    ui.hudDeck.textContent = snap.kind === "jumble" ? "JUMBLE" : "TRIVIA";
    ui.next.textContent = label("next", "NEXT");
    ui.take.textContent = label("take", "TAKE SCORE");
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.back.textContent = label("back", "CABINET");
    const playing = snap.status === "playing";
    ui.next.classList.toggle("hidden", !snap.canNext);
    ui.take.classList.toggle("hidden", !(snap.canTake || snap.status === "done"));
    ui.deal.classList.toggle("hidden", snap.status !== "done");
    ui.next.disabled = !snap.canNext;
    ui.take.disabled = !(snap.canTake || snap.status === "done");
    ui.quizQ.textContent = snap.question || "";
    ui.quizChoices.replaceChildren();
    snap.choices.forEach(function (text, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-choice";
      btn.dataset.choice = String(i);
      btn.textContent = text;
      btn.disabled = !playing || snap.locked;
      if (snap.locked) {
        if (i === snap.answerIndex) btn.classList.add("is-correct");
        if (snap.picked === i && i !== snap.answerIndex) btn.classList.add("is-wrong");
      }
      ui.quizChoices.appendChild(btn);
    });
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("done", "Sitting over. Deal again for a fresh twelve.") + " · " + snap.score;
    } else if (ev && ev.kind === "correct") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("correct", "Correct.") + " +" + ev.points;
    } else if (ev && ev.kind === "wrong") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("wrong", "Not that one.");
    } else {
      ui.banner.textContent = copy("playing", "Pick one of the four.");
    }
    notePlayHigh(ctx, snap.score, snap);
  }

  window.CabinetPlay = {
    cardNode: cardNode,
    notePlayHigh: notePlayHigh,
    applyMode: applyMode,
    renderEleven: renderEleven,
    renderPower: renderPower,
    renderSudoku: renderSudoku,
    renderReversi: renderReversi,
    renderHoops: renderHoops,
    paintHoops: paintHoops,
    renderQuiz: renderQuiz,
    attachUi: function (ui) {
      ui.playEleven = $("play-eleven");
      ui.playPower = $("play-power");
      ui.playYacht = $("play-yacht");
      ui.playSudoku = $("play-sudoku");
      ui.playReversi = $("play-reversi");
      ui.playHoops = $("play-hoops");
      ui.playQuiz = $("play-quiz");
      ui.elevenGrid = $("eleven-grid");
      ui.powerFoundations = $("power-foundations");
      ui.powerStocks = $("power-stocks");
      ui.powerTableau = $("power-tableau");
      ui.yachtDice = $("yacht-dice");
      ui.yachtCard = $("yacht-card");
      ui.sudokuGrid = $("sudoku-grid");
      ui.sudokuPad = $("sudoku-pad");
      ui.reversiBoard = $("reversi-board");
      ui.hoopsCourt = $("hoops-court");
      ui.hoopsRim = $("hoops-rim");
      ui.hoopsBall = $("hoops-ball");
      ui.quizQ = $("quiz-q");
      ui.quizChoices = $("quiz-choices");
      ui.next = $("btn-next");
      ui.take = $("btn-take");
      ui.roll = $("btn-roll");
      ui.shoot = $("btn-shoot");
    },
  };
})();
