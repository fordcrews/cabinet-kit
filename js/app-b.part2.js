      renderGame();
      return;
    }
    if (!isEleven() || session.status !== "playing") return;
    E.takeEleven(session);
    renderGame();
  });
  if (ui.elevenStocks) {
    ui.elevenStocks.addEventListener("click", function () {
      if (!session || !isEleven() || session.status !== "playing") return;
      if (!E.snapshotEleven(session).canNext) return;
      E.nextEleven(session);
      renderGame();
    });
  }
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
    clearSet();
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
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      if (reg.update) reg.update();
    }).catch(function () {});
  }
  loadParity()
    .then(function () {
      return loadCatalog();
    })
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
