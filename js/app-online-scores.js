  let onlineBoardOpen = false;
  function ensureOnlineBoardOverlay() {
    let el = document.getElementById("online-board");
    if (el) return el;
    el = document.createElement("div");
    el.id = "online-board";
    el.className = "exit-confirm online-board hidden";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "online-board-title");
    el.innerHTML =
      '<div class="exit-confirm-card online-board-card">' +
      '<p class="exit-confirm-title" id="online-board-title">Boards</p>' +
      '<p class="exit-confirm-sub" id="online-board-sub">Online · fail-soft if offline</p>' +
      '<div class="online-board-tabs">' +
      '<button type="button" class="btn ghost online-tab is-on" data-online-tab="friends">FRIENDS</button>' +
      '<button type="button" class="btn ghost online-tab" data-online-tab="game">GAME TOP 10</button>' +
      "</div>" +
      '<div class="online-board-body" id="online-board-body"><p class="online-board-status">Loading…</p></div>' +
      '<div class="exit-confirm-actions">' +
      '<button type="button" class="btn stay" id="online-board-close">CLOSE</button>' +
      "</div></div>";
    const host = document.querySelector(".cabinet") || document.body;
    host.appendChild(el);
    return el;
  }
  function ensureBoardsChip() {
    const view = ui.cabinet;
    if (!view) return null;
    let chip = document.getElementById("boards-chip");
    if (chip) return chip;
    chip = document.createElement("div");
    chip.id = "boards-chip";
    chip.className = "boards-chip";
    chip.innerHTML =
      '<button type="button" class="boards-chip-btn" id="boards-chip-btn" aria-label="Open online boards">' +
      '<span class="boards-chip-label">ONLINE</span>' +
      '<span class="boards-chip-title">BOARDS</span>' +
      "</button>";
    const player = document.getElementById("player-chip");
    if (player && player.parentNode === view) {
      view.insertBefore(chip, player.nextSibling);
    } else {
      const lede = view.querySelector(".lede");
      if (lede && lede.parentNode === view) view.insertBefore(chip, lede.nextSibling);
      else view.insertBefore(chip, view.firstChild);
    }
    const btn = document.getElementById("boards-chip-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        openOnlineBoard({ tab: "friends" });
      });
    }
    return chip;
  }
  function paintOnlineBoardRows(rows, mode) {
    const body = document.getElementById("online-board-body");
    if (!body) return;
    if (!rows || !rows.length) {
      body.innerHTML = '<p class="online-board-status">No scores yet.</p>';
      return;
    }
    const ul = document.createElement("ul");
    ul.className = "online-board-list";
    rows.forEach(function (row, i) {
      const li = document.createElement("li");
      li.className = "online-board-row";
      if (mode === "friends") {
        li.innerHTML =
          '<span class="obr-rank">' +
          (i + 1) +
          "</span>" +
          '<span class="obr-name"></span>' +
          '<span class="obr-meta"></span>';
        li.querySelector(".obr-name").textContent = row.player_name || "—";
        li.querySelector(".obr-meta").textContent =
          "Σ " +
          (row.total_score != null ? row.total_score : 0) +
          " · best " +
          (row.best_score != null ? row.best_score : 0) +
          " · " +
          (row.games_played != null ? row.games_played : 0) +
          " games";
      } else {
        li.innerHTML =
          '<span class="obr-rank">' +
          (i + 1) +
          "</span>" +
          '<span class="obr-name"></span>' +
          '<span class="obr-meta"></span>';
        li.querySelector(".obr-name").textContent = row.player_name || "—";
        li.querySelector(".obr-meta").textContent = String(row.score != null ? row.score : 0);
      }
      ul.appendChild(li);
    });
    body.replaceChildren(ul);
  }
  function openOnlineBoard(opts) {
    opts = opts || {};
    const tab = opts.tab || "friends";
    const gameId = opts.gameId || (gameDef && gameDef.id) || "";
    const overlay = ensureOnlineBoardOverlay();
    const title = document.getElementById("online-board-title");
    const sub = document.getElementById("online-board-sub");
    const body = document.getElementById("online-board-body");
    const closeBtn = document.getElementById("online-board-close");
    onlineBoardOpen = true;
    overlay.classList.remove("hidden");
    overlay.removeAttribute("hidden");
    overlay.querySelectorAll("[data-online-tab]").forEach(function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute("data-online-tab") === tab);
    });
    if (title) title.textContent = tab === "friends" ? "Friend board" : "Game top 10";
    if (sub) {
      sub.textContent =
        tab === "friends"
          ? "Totals across games · from this cabinet cloud"
          : gameId
            ? "Top scores for " + gameId
            : "Pick a game or open from a sitting";
    }
    if (body) body.innerHTML = '<p class="online-board-status">Loading…</p>';
    function finish() {
      closeBtn.removeEventListener("click", onClose);
      overlay.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      overlay.querySelectorAll("[data-online-tab]").forEach(function (btn) {
        btn.removeEventListener("click", onTab);
      });
      overlay.classList.add("hidden");
      overlay.setAttribute("hidden", "");
      onlineBoardOpen = false;
    }
    function onClose() {
      finish();
    }
    function onBackdrop(ev) {
      if (ev.target === overlay) onClose();
    }
    function onKey(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        onClose();
      }
    }
    function onTab(ev) {
      const btn = ev.currentTarget;
      const next = btn.getAttribute("data-online-tab");
      openOnlineBoard({ tab: next, gameId: gameId });
    }
    closeBtn.addEventListener("click", onClose);
    overlay.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    overlay.querySelectorAll("[data-online-tab]").forEach(function (btn) {
      btn.addEventListener("click", onTab);
    });
    if (!window.CabinetOnline) {
      if (body) body.innerHTML = '<p class="online-board-status">Online module missing.</p>';
      return;
    }
    const p =
      tab === "friends"
        ? window.CabinetOnline.friendBoard(20)
        : gameId
          ? window.CabinetOnline.topScores(gameId, 10)
          : Promise.resolve([]);
    p.then(function (rows) {
      if (!onlineBoardOpen) return;
      paintOnlineBoardRows(rows, tab === "friends" ? "friends" : "game");
    });
    try {
      closeBtn.focus();
    } catch (e) {}
  }
  function submitOnlineIfPossible(id, score) {
    if (!window.CabinetOnline || !window.CabinetScores) return;
    const name = window.CabinetScores.getPlayerName
      ? window.CabinetScores.getPlayerName()
      : "";
    if (!name) return;
    const val = Number(score);
    if (!(val > 0) || !id) return;
    try {
      window.CabinetOnline.submitScore(id, name, val);
    } catch (e) {}
  }
  function ensureOnlineOnCabinet() {
    ensureBoardsChip();
  }
