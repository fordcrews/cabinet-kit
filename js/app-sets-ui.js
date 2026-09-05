  function inSet() {
    return !!(setPlay && Array.isArray(setPlay.ids) && setPlay.ids.length);
  }
  function catalogIds() {
    return Array.from(gamesById.keys());
  }
  function sittingEnded() {
    if (!session || !gameDef) return false;
    const type = gameType();
    const status = session.status;
    if (type === "slot") {
      const st = window.CabinetSlot ? window.CabinetSlot.getStatus() : status;
      return st === "done";
    }
    if (type === "klondike" || type === "freecell" || type === "spider") {
      return status === "won";
    }
    if (type === "sudoku6" || type === "sudoku9") {
      return status === "won";
    }
    if (type === "run21") {
      return status === "bust" || status === "run" || status === "stay";
    }
    return status === "done";
  }
  function clearSet() {
    setPlay = null;
  }
  function setHashForLeg() {
    if (!inSet()) return;
    const id = setPlay.ids[setPlay.index];
    location.hash =
      "#/set/" + setPlay.size + "/play/" + encodeURIComponent(id);
  }
  function paintSetStrip() {
    const strip = document.getElementById("set-strip");
    if (!strip || !window.CabinetSets) return;
    [3, 4, 5].forEach(function (size) {
      const ul = strip.querySelector('[data-set-board="' + size + '"]');
      if (!ul) return;
      ul.replaceChildren();
      const list = window.CabinetSets.listBoards(size);
      list.forEach(function (entry, i) {
        const li = document.createElement("li");
        li.textContent = i + 1 + ". " + entry.total;
        ul.appendChild(li);
      });
    });
  }
  function ensureSetStrip() {
    const view = ui.cabinet;
    if (!view) return;
    let strip = document.getElementById("set-strip");
    if (strip) {
      paintSetStrip();
      return strip;
    }
    strip = document.createElement("div");
    strip.id = "set-strip";
    strip.className = "set-strip";
    strip.innerHTML =
      '<p class="set-strip-head">SET</p>' +
      '<div class="set-strip-row">' +
      [3, 4, 5]
        .map(function (n) {
          return (
            '<div class="set-size">' +
            '<button type="button" class="set-size-btn" data-set-size="' +
            n +
            '">SET ' +
            n +
            "</button>" +
            '<ul class="set-board-lines" data-set-board="' +
            n +
            '"></ul>' +
            "</div>"
          );
        })
        .join("") +
      "</div>";
    const list = ui.list;
    if (list && list.parentNode === view) {
      view.insertBefore(strip, list);
    } else {
      view.appendChild(strip);
    }
    strip.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-set-size]");
      if (!btn) return;
      const size = Number(btn.getAttribute("data-set-size"));
      location.hash = "#/set/" + size;
    });
    paintSetStrip();
    return strip;
  }
  function beginSet(size) {
    if (!window.CabinetSets) return;
    const ids = window.CabinetSets.pickSet(size, catalogIds(), Math.random, lastSetOrder);
    if (!ids.length) {
      ui.list.innerHTML =
        '<li class="status-error">Need at least ' + size + " games for a set.</li>";
      location.hash = "#/";
      return;
    }
    lastSetOrder = ids.slice();
    setPlay = {
      size: size,
      ids: ids,
      index: 0,
      parts: [],
      total: 0,
      phase: "playing",
      legRecorded: false,
      setRank: 0,
    };
    const want =
      "#/set/" + setPlay.size + "/play/" + encodeURIComponent(ids[0]);
    if ((location.hash || "") === want) {
      loadGame(ids[0]).catch(function (err) {
        ui.list.innerHTML = '<li class="status-error"></li>';
        ui.list.querySelector("li").textContent = String(err.message || err);
        clearSet();
        location.hash = "#/";
      });
    } else {
      location.hash = want;
    }
  }
  function advanceSetLeg() {
    if (!inSet()) return;
    if (setPlay.index >= setPlay.ids.length - 1) return;
    setPlay.index += 1;
    setPlay.phase = "playing";
    setPlay.legRecorded = false;
    setHashForLeg();
  }
  function restartSetSameSize() {
    if (!setPlay) return;
    const size = setPlay.size;
    clearSet();
    beginSet(size);
  }
  function finishSetBoard() {
    if (!inSet() || !window.CabinetSets) return;
    const entry = {
      total: setPlay.total,
      parts: setPlay.parts.slice(),
      at: new Date().toISOString(),
      size: setPlay.size,
    };
    const result = window.CabinetSets.recordBoard(setPlay.size, entry);
    setPlay.setRank = result.rank || 0;
    setPlay.phase = "setDone";
    paintSetStrip();
  }
  function noteSetLegIfNeeded() {
    if (!inSet() || setPlay.phase === "setDone") return;
    if (setPlay.legRecorded) return;
    if (!sittingEnded()) return;
    const raw = sittingScore();
    const id = gameDef.id;
    const points = window.CabinetSets ? window.CabinetSets.normalize(id, raw) : 0;
    setPlay.parts.push({ id: id, raw: raw, points: points });
    setPlay.total += points;
    setPlay.legRecorded = true;
    const isLast = setPlay.index >= setPlay.ids.length - 1;
    if (isLast) {
      finishSetBoard();
    } else {
      setPlay.phase = "legDone";
    }
    if (ui.banner) {
      ui.banner.className = "banner run";
      if (setPlay.phase === "setDone") {
        let line = "SET DONE · " + setPlay.total;
        if (setPlay.setRank > 0) line += " · #" + setPlay.setRank;
        ui.banner.textContent = line;
      } else {
        ui.banner.textContent = "LEG +" + points + " · SET " + setPlay.total;
      }
    }
  }
  function applySetChrome() {
    if (!inSet()) return;
    const n = setPlay.ids.length;
    const i = setPlay.index + 1;
    const curId = setPlay.ids[setPlay.index];
    const curMeta = gamesById.get(curId);
    const curTitle =
      (gameDef && gameDef.title) ||
      (curMeta && curMeta.def && curMeta.def.title) ||
      curId;
    let nextTitle = "";
    if (setPlay.index < n - 1) {
      const nid = setPlay.ids[setPlay.index + 1];
      const nm = gamesById.get(nid);
      nextTitle = (nm && nm.def && nm.def.title) || nid;
    }
    if (setPlay.phase === "setDone") {
      ui.sub.textContent = "SET DONE · " + setPlay.size + " games";
    } else if (setPlay.phase === "legDone" && nextTitle) {
      ui.sub.textContent = "SET " + i + "/" + n + " · next " + nextTitle;
    } else {
      ui.sub.textContent = "SET " + i + "/" + n + " · " + curTitle;
    }
    ui.scoreBlock.hidden = false;
    ui.scoreLabel.textContent = "SET";
    ui.scoreValue.textContent = String(setPlay.total);
    if (ui.scoreBest) {
      if (setPlay.phase === "setDone" && setPlay.setRank > 0) {
        ui.scoreBest.textContent = "RANK #" + setPlay.setRank;
      } else {
        ui.scoreBest.textContent = "";
      }
    }
    const leg = sittingScore();
    if (ui.hudRound) {
      ui.hudRound.textContent = "LEG " + leg;
    }
    if (setPlay.phase === "legDone") {
      ui.deal.textContent = "NEXT LEG";
      ui.deal.classList.remove("hidden");
      ui.deal.classList.add("is-set-next");
    } else if (setPlay.phase === "setDone") {
      ui.deal.textContent = "SET AGAIN";
      ui.deal.classList.remove("hidden");
      ui.deal.classList.add("is-set-next");
      ui.back.textContent = "CABINET";
    } else {
      ui.deal.classList.remove("is-set-next");
    }
  }
