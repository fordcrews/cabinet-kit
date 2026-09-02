/**
 * Play-feel UI hooks. Wraps CabinetPlay renders after they exist.
 */
(function () {
  "use strict";
  var Play = window.CabinetPlay;
  if (!Play) return;

  function wrap(name, after) {
    var orig = Play[name];
    if (typeof orig !== "function") return;
    Play[name] = function (ctx) {
      orig(ctx);
      try {
        after(ctx);
      } catch (e) {}
    };
  }

  wrap("renderEleven", function (ctx) {
    var ui = ctx.ui;
    var snap = ctx.E.snapshotEleven(ctx.session);
    ui.next.classList.remove("skip-act");
    ui.next.classList.add("next-act");
    ui.take.classList.add("cash-out");
    if (snap.lastEvent && snap.lastEvent.kind === "illegal" && snap.lastEvent.cells) {
      snap.lastEvent.cells.forEach(function (n) {
        var btn = ui.elevenGrid.querySelector('[data-cell="' + n + '"]');
        if (btn) btn.classList.add("is-illegal");
      });
    }
  });

  wrap("renderPower", function (ctx) {
    var ui = ctx.ui;
    var snap = ctx.E.snapshotPatience(ctx.session);
    var playing = snap.status === "playing";
    ui.deal.classList.toggle("ghost", playing);
    ui.deal.classList.toggle("is-reset", playing);
    var hint = snap.type === "klondike" ? ctx.label("empty", "KING") : ctx.label("empty", "ANY");
    ui.powerTableau.querySelectorAll(".power-empty-col").forEach(function (el) {
      el.classList.add("is-hint");
      el.textContent = hint;
    });
    if (snap.lastEvent && snap.lastEvent.kind === "illegal") {
      ui.playPower.classList.add("is-illegal");
    } else if (ui.playPower) {
      ui.playPower.classList.remove("is-illegal");
    }
  });

  wrap("renderSudoku", function (ctx) {
    var ui = ctx.ui;
    var snap = ctx.E.snapshotSudoku(ctx.session);
    ui.deal.textContent = ctx.label("nextPuzzle", "NEXT PUZZLE");
    ui.deal.classList.remove("ghost");
    var n = snap.size || 6;
    var boxC = snap.boxC || 3;
    var boxR = snap.boxR || (n === 9 ? 3 : 2);
    ui.sudokuGrid.querySelectorAll(".sudoku-cell").forEach(function (btn, i) {
      var r = Math.floor(i / n);
      var c = i % n;
      if (!snap.given[i]) btn.classList.add("is-entry");
      if (c % boxC === 0) btn.classList.add("box-left");
      if (r % boxR === 0) btn.classList.add("box-top");
    });
    var selVal = snap.selected != null ? snap.grid[snap.selected] : 0;
    var ink = snap.ink || 0;
    ui.sudokuPad.querySelectorAll(".sudoku-digit").forEach(function (btn) {
      var d = Number(btn.getAttribute("data-digit"));
      btn.classList.toggle("is-current", (ink === d || selVal === d) && d > 0);
    });
  });

  wrap("renderReversi", function (ctx) {
    var ui = ctx.ui;
    var session = ctx.session;
    var snap = ctx.E.snapshotReversi(session);
    var label = ctx.label;
    var thinking = !!(session && session.thinking) || snap.turn === 2;
    ui.scoreLabel.textContent = label("dark", "DARK") + " · " + label("light", "LIGHT");
    ui.hudRound.textContent =
      snap.status !== "playing"
        ? label("done", "DONE")
        : snap.turn === 1
          ? label("yourTurn", "YOUR TURN")
          : label("cpuTurn", "CPU …");
    ui.hudDeck.textContent =
      label("dark", "D") + " " + snap.dark + "  " + label("light", "L") + " " + snap.light;
    ui.deal.classList.remove("ghost");
    ui.reversiBoard.querySelectorAll(".reversi-cell").forEach(function (btn, i) {
      var v = snap.board[i];
      var legal = snap.legal.indexOf(i) >= 0;
      btn.disabled =
        snap.status !== "playing" || snap.turn !== 1 || thinking || !legal;
      if (!v && legal && snap.turn === 1 && snap.status === "playing" && !btn.querySelector(".reversi-hint")) {
        var hint = document.createElement("span");
        hint.className = "reversi-hint";
        hint.setAttribute("aria-hidden", "true");
        btn.appendChild(hint);
      }
    });
    if (snap.status === "playing" && (snap.turn === 2 || thinking)) {
      ui.banner.textContent = ctx.copy("cpu", "CPU …");
    }
  });

  var origPaint = Play.paintHoops;
  Play.paintHoops = function (ui, session) {
    if (typeof origPaint === "function") origPaint(ui, session);
    if (!session) return;
    var lined =
      session.aimX >= session.rimX - session.rimW &&
      session.aimX <= session.rimX + session.rimW;
    if (ui.hoopsCourt) ui.hoopsCourt.classList.toggle("is-lined-up", !!lined && session.status === "playing");
    if (ui.shoot) ui.shoot.classList.toggle("is-hot", !!lined && session.status === "playing");
  };

  wrap("renderHoops", function (ctx) {
    var ui = ctx.ui;
    var snap = ctx.E.snapshotHoops(ctx.session);
    ui.hudDeck.textContent = snap.linedUp ? ctx.label("now", "NOW") : "";
    if (ui.shoot) ui.shoot.classList.toggle("is-hot", !!snap.linedUp && snap.status === "playing");
  });

  wrap("renderQuiz", function (ctx) {
    var ui = ctx.ui;
    var snap = ctx.E.snapshotQuiz(ctx.session);
    var kindName = snap.kind === "jumble" ? ctx.label("jumble", "JUMBLE") : ctx.label("trivia", "TRIVIA");
    ui.hudDeck.textContent = kindName;
    ui.next.classList.add("skip-act");
    ui.next.classList.remove("next-act");
    ui.take.classList.add("cash-out");
    ui.deal.classList.remove("ghost");
    ui.quizQ.setAttribute("data-kind", kindName);
    if (ui.playQuiz) ui.playQuiz.classList.toggle("is-jumble", snap.kind === "jumble");
    if (snap.status === "done") {
      ui.banner.textContent = ctx.copy("done", "Sitting over.") + " · " + snap.score;
    }
  });

  if (typeof Play.renderYacht === "function") {
    wrap("renderYacht", function (ctx) {
      var ui = ctx.ui;
      var snap = ctx.E.snapshotYacht(ctx.session);
      ui.hudDeck.textContent = ctx.label("rolls", "ROLLS") + " " + snap.rollsLeft;
      ui.yachtDice.querySelectorAll(".yacht-die").forEach(function (btn, i) {
        if (snap.held[i] && !btn.querySelector(".hold-tag")) {
          var tag = document.createElement("span");
          tag.className = "hold-tag";
          tag.textContent = "HOLD";
          btn.appendChild(tag);
        }
      });
    });
  }
})();
