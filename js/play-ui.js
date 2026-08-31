/**
 * 11 Up + Klondike / FreeCell / Spider player views. Loaded after engine/solitaire, before or with app.
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
    const power = type === "klondike" || type === "freecell" || type === "spider" || type === "powersol";
    const yacht = type === "yacht";
    const sudoku = type === "sudoku6";
    const reversi = type === "reversi";
    const hoops = type === "hoops";
    const quiz = type === "quiznight";
    const match = type === "blast" || type === "triple" || type === "chime";
    const hideRun = columnsPlay || eleven || power || yacht || sudoku || reversi || hoops || quiz || match;
    ui.playRun.classList.toggle("hidden", hideRun);
    ui.playColumns.classList.toggle("hidden", !columnsPlay);
    if (ui.playEleven) ui.playEleven.classList.toggle("hidden", !eleven);
    if (ui.playPower) ui.playPower.classList.toggle("hidden", !power);
    if (ui.playYacht) ui.playYacht.classList.toggle("hidden", !yacht);
    if (ui.playSudoku) ui.playSudoku.classList.toggle("hidden", !sudoku);
    if (ui.playReversi) ui.playReversi.classList.toggle("hidden", !reversi);
    if (ui.playHoops) ui.playHoops.classList.toggle("hidden", !hoops);
    if (ui.playQuiz) ui.playQuiz.classList.toggle("hidden", !quiz);
    if (ui.playMatch) ui.playMatch.classList.toggle("hidden", !match);
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
    } else if (sudoku || reversi || hoops || quiz || match) {
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

  function runSelected(sel, col, index) {
    if (!sel || sel.kind !== "tableau" || sel.col !== col) return false;
    const start = sel.index == null ? index : sel.index;
    return index >= start;
  }

  function renderPower(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotPatience(session);
    const label = ctx.label, copy = ctx.copy;
    const type = snap.type;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    if (type === "spider") {
      ui.hudRound.textContent = label("runs", "RUNS") + " " + snap.completed + "/" + snap.runs;
      ui.hudDeck.textContent = label("stock", "STOCK") + " " + snap.stockCount;
    } else {
      ui.hudRound.textContent = label("home", "HOME") + " " + snap.home + "/" + snap.total;
      ui.hudDeck.textContent = type === "klondike"
        ? label("stock", "STOCK") + " " + snap.stockCount
        : "";
    }
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.remove("hidden");
    ui.back.textContent = label("back", "CABINET");
    const sel = snap.selected;
    const playing = snap.status === "playing";
    if (ui.playPower) {
      ui.playPower.classList.toggle("is-klondike", type === "klondike");
      ui.playPower.classList.toggle("is-freecell", type === "freecell");
      ui.playPower.classList.toggle("is-spider", type === "spider");
    }
    const showFound = type === "klondike" || type === "freecell";
    const showCells = type === "freecell";
    const showStocks = type === "klondike" || type === "spider";
    const showDone = type === "spider";
    if (ui.powerFoundations) ui.powerFoundations.classList.toggle("hidden", !showFound);
    if (ui.powerCells) ui.powerCells.classList.toggle("hidden", !showCells);
    if (ui.powerStocks) ui.powerStocks.classList.toggle("hidden", !showStocks);
    if (ui.powerCompleted) ui.powerCompleted.classList.toggle("hidden", !showDone);

    if (showFound && ui.powerFoundations) {
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
    }

    if (showCells && ui.powerCells) {
      ui.powerCells.replaceChildren();
      (snap.cells || []).forEach(function (c, i) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "power-well cell-well" + (selMatch(sel, "cell", "i", i) ? " is-selected" : "");
        btn.dataset.pcell = String(i);
        btn.disabled = !playing;
        if (c) {
          btn.appendChild(cardNode(c, false, selMatch(sel, "cell", "i", i)));
        } else {
          const empty = document.createElement("span");
          empty.className = "power-empty";
          empty.textContent = label("cell", "CELL");
          btn.appendChild(empty);
        }
        ui.powerCells.appendChild(btn);
      });
    }

    if (showStocks && ui.powerStocks) {
      ui.powerStocks.replaceChildren();
      if (type === "klondike") {
        const stockBtn = document.createElement("button");
        stockBtn.type = "button";
        stockBtn.className = "power-well stock-well";
        stockBtn.dataset.stock = "stock";
        stockBtn.disabled = !playing;
        if (snap.stockCount) {
          const back = cardNode({ rank: "", suit: "", faceUp: false }, false, false);
          stockBtn.appendChild(back);
        } else {
          const empty = document.createElement("span");
          empty.className = "power-empty";
          empty.textContent = snap.wasteCount ? "↺" : "—";
          stockBtn.appendChild(empty);
        }
        const sm = document.createElement("span");
        sm.className = "power-meta";
        sm.textContent = String(snap.stockCount);
        stockBtn.appendChild(sm);
        ui.powerStocks.appendChild(stockBtn);

        const wasteBtn = document.createElement("button");
        wasteBtn.type = "button";
        wasteBtn.className = "power-well stock-well" + (sel && sel.kind === "waste" ? " is-selected" : "");
        wasteBtn.dataset.stock = "waste";
        wasteBtn.disabled = !playing || !snap.wasteCount;
        if (snap.waste && snap.waste.top) {
          wasteBtn.appendChild(cardNode(snap.waste.top, false, sel && sel.kind === "waste"));
        } else {
          const empty = document.createElement("span");
          empty.className = "power-empty";
          empty.textContent = label("waste", "WASTE");
          wasteBtn.appendChild(empty);
        }
        ui.powerStocks.appendChild(wasteBtn);
      } else {
        const stockBtn = document.createElement("button");
        stockBtn.type = "button";
        stockBtn.className = "power-well stock-well";
        stockBtn.dataset.stock = "stock";
        stockBtn.disabled = !playing;
        if (snap.stockCount) {
          stockBtn.appendChild(cardNode({ rank: "", suit: "", faceUp: false }, false, false));
        } else {
          const empty = document.createElement("span");
          empty.className = "power-empty";
          empty.textContent = "—";
          stockBtn.appendChild(empty);
        }
        const sm = document.createElement("span");
        sm.className = "power-meta";
        sm.textContent = String(snap.stockCount);
        stockBtn.appendChild(sm);
        ui.powerStocks.appendChild(stockBtn);
      }
    }

    if (showDone && ui.powerCompleted) {
      ui.powerCompleted.replaceChildren();
      for (let i = 0; i < (snap.runs || 8); i++) {
        const slot = document.createElement("div");
        slot.className = "power-well completed-well" + (i < snap.completed ? " is-filled" : "");
        slot.dataset.completed = String(i);
        if (i < snap.completed) {
          slot.appendChild(cardNode({ rank: "K", suit: "♠", faceUp: true }, true, false));
        } else {
          const empty = document.createElement("span");
          empty.className = "power-empty";
          empty.textContent = "K–A";
          slot.appendChild(empty);
        }
        ui.powerCompleted.appendChild(slot);
      }
    }

    ui.powerTableau.replaceChildren();
    ui.powerTableau.style.setProperty("--cols", String(snap.tableau.length));
    snap.tableau.forEach(function (col, i) {
      const wrap = document.createElement("div");
      wrap.className = "power-col" + (selMatch(sel, "tableau", "col", i) ? " is-selected" : "");
      wrap.dataset.pcol = String(i);
      if (!col.length) {
        const emptyBtn = document.createElement("button");
        emptyBtn.type = "button";
        emptyBtn.className = "power-empty-col";
        emptyBtn.dataset.pcol = String(i);
        emptyBtn.disabled = !playing;
        emptyBtn.textContent = type === "klondike" ? "K" : "—";
        wrap.appendChild(emptyBtn);
      } else {
        col.forEach(function (c, n) {
          const isTop = n === col.length - 1;
          const picked = runSelected(sel, i, n) && c.faceUp !== false;
          const node = cardNode(c, !isTop, picked);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "power-card-btn" + (isTop ? "" : " stacked") + (picked ? " is-selected" : "");
          btn.dataset.pcol = String(i);
          btn.dataset.idx = String(n);
          btn.disabled = !playing || c.faceUp === false;
          if (!isTop) btn.classList.add("is-stacked");
          btn.appendChild(node);
          if (!isTop) node.classList.add("stacked");
          wrap.appendChild(btn);
        });
      }
      ui.powerTableau.appendChild(wrap);
    });

    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "won") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("won", "Cleared.") + " · " + snap.score;
    } else if (ev && ev.kind === "foundation") {
      ui.banner.classList.add("run");
      ui.banner.textContent = "+" + ev.points + " · " + copy("foundation", "Home.");
    } else if (ev && ev.kind === "complete") {
      ui.banner.classList.add("run");
      ui.banner.textContent = "+" + ev.points + " · " + copy("complete", "Run off.");
    } else if (ev && ev.kind === "illegal") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("illegal", "That pile won't take it.");
    } else if (ev && ev.kind === "move") {
      ui.banner.textContent = copy("move", "Card placed.");
    } else if (ev && ev.kind === "draw") {
      ui.banner.textContent = copy("draw", "Flipped to waste.");
    } else if (ev && ev.kind === "recycle") {
      ui.banner.textContent = copy("recycle", "Waste back to stock.");
    } else if (ev && ev.kind === "deal") {
      ui.banner.textContent = copy("deal", "Row dealt.");
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


  function renderMatch(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotMatch(session);
    const label = ctx.label, copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("moves", "MOVES") + " " + snap.movesLeft;
    ui.hudDeck.textContent = "";
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.toggle("hidden", snap.status !== "done");
    ui.back.textContent = label("back", "CABINET");
    const playing = snap.status === "playing";
    const popped = {};
    const ev = snap.lastEvent || {};
    (ev.popped || []).forEach(function (i) {
      popped[i] = true;
    });
    const illegal = {};
    if (ev.kind === "illegal") {
      if (ev.a != null) illegal[ev.a] = true;
      if (ev.b != null) illegal[ev.b] = true;
      if (ev.index != null) illegal[ev.index] = true;
    }
    if (ev.kind === "small" && ev.index != null) illegal[ev.index] = true;
    ui.matchGrid.replaceChildren();
    ui.matchGrid.style.setProperty("--cols", String(snap.cols));
    ui.matchGrid.className = "match-grid match-" + snap.type;
    snap.grid.forEach(function (color, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "match-cell" +
        (color ? " match-c" + color : " is-empty") +
        (snap.selected === i ? " is-selected" : "") +
        (illegal[i] ? " is-illegal" : "") +
        (popped[i] ? " just-pop" : "");
      btn.dataset.cell = String(i);
      btn.disabled = !playing;
      btn.setAttribute("aria-label", color ? "color " + color : "empty");
      ui.matchGrid.appendChild(btn);
    });
    ui.banner.className = "banner";
    if (snap.status === "done") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("done", "Sitting over.") + " · " + snap.score;
    } else if (ev.kind === "pop") {
      ui.banner.classList.add("run");
      const size = ev.size != null ? ev.size : (ev.popped ? ev.popped.length : 0);
      ui.banner.textContent =
        copy("pop", "Pop.") +
        " " +
        size +
        (ev.points ? " · +" + ev.points : "") +
        (ev.shuffle ? " · " + copy("shuffle", "Board restacked.") : "");
    } else if (ev.kind === "swap") {
      ui.banner.classList.add("run");
      ui.banner.textContent =
        copy("swap", "Clear.") +
        (ev.combo > 1 ? " ×" + ev.combo : "") +
        (ev.points ? " · +" + ev.points : "");
    } else if (ev.kind === "slide") {
      ui.banner.textContent = copy("slide", "Line slides.");
    } else if (ev.kind === "illegal") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("illegal", "That swap makes no three.");
    } else if (ev.kind === "small") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("small", "Need two or more.");
    } else {
      ui.banner.textContent = copy("playing", "Tap the grid.");
    }
    notePlayHigh(ctx, snap.score, snap);
  }

  window.CabinetPlay = {
    cardNode: cardNode,
    notePlayHigh: notePlayHigh,
    applyMode: applyMode,
    renderEleven: renderEleven,
    renderPower: renderPower,
    renderPatience: renderPower,
    renderSudoku: renderSudoku,
    renderReversi: renderReversi,
    renderHoops: renderHoops,
    paintHoops: paintHoops,
    renderQuiz: renderQuiz,
    renderMatch: renderMatch,
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
      ui.powerCells = $("power-cells");
      ui.powerCompleted = $("power-completed");
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
      ui.playMatch = $("play-match");
      ui.matchGrid = $("match-grid");
      ui.next = $("btn-next");
      ui.take = $("btn-take");
      ui.roll = $("btn-roll");
      ui.shoot = $("btn-shoot");
    },
  };
})();
