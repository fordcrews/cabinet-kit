  let playerNameOpen = false;
  function ensurePlayerChip() {
    const view = ui.cabinet;
    if (!view) return null;
    let chip = document.getElementById("player-chip");
    if (chip) return chip;
    chip = document.createElement("div");
    chip.id = "player-chip";
    chip.className = "player-chip";
    chip.innerHTML =
      '<button type="button" class="player-chip-btn" id="player-chip-btn" aria-label="Change player name">' +
      '<span class="player-chip-label">PLAYER</span>' +
      '<span class="player-chip-name" id="player-chip-name">—</span>' +
      '<span class="player-chip-edit">EDIT</span>' +
      "</button>";
    const lede = view.querySelector(".lede");
    if (lede && lede.parentNode === view) {
      view.insertBefore(chip, lede.nextSibling);
    } else {
      const list = ui.list;
      if (list && list.parentNode === view) view.insertBefore(chip, list);
      else view.insertBefore(chip, view.firstChild);
    }
    const btn = document.getElementById("player-chip-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        requestPlayerName({ required: false, editing: true });
      });
    }
    return chip;
  }
  function paintPlayerChip() {
    ensurePlayerChip();
    const nameEl = document.getElementById("player-chip-name");
    if (!nameEl) return;
    const name =
      window.CabinetScores && window.CabinetScores.getPlayerName
        ? window.CabinetScores.getPlayerName()
        : "";
    nameEl.textContent = name || "—";
  }
  function ensurePlayerNameOverlay() {
    let el = document.getElementById("player-name");
    if (el) return el;
    el = document.createElement("div");
    el.id = "player-name";
    el.className = "exit-confirm player-name-modal hidden";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "player-name-title");
    el.innerHTML =
      '<div class="exit-confirm-card player-name-card">' +
      '<p class="exit-confirm-title" id="player-name-title">What\'s your name?</p>' +
      '<p class="exit-confirm-sub" id="player-name-sub">Shown with local high scores on this phone.</p>' +
      '<label class="player-name-label" for="player-name-input">Name</label>' +
      '<input type="text" class="player-name-input" id="player-name-input" maxlength="20" autocomplete="nickname" enterkeyhint="done" autocapitalize="words" spellcheck="false" />' +
      '<p class="player-name-error hidden" id="player-name-error" role="alert">Enter a name to continue.</p>' +
      '<div class="exit-confirm-actions">' +
      '<button type="button" class="btn" id="player-name-save">SAVE</button>' +
      '<button type="button" class="btn ghost player-name-cancel hidden" id="player-name-cancel">CANCEL</button>' +
      "</div></div>";
    const host = document.querySelector(".cabinet") || document.body;
    host.appendChild(el);
    return el;
  }
  function requestPlayerName(opts) {
    opts = opts || {};
    const required = !!opts.required;
    const editing = !!opts.editing;
    if (playerNameOpen) return;
    if (
      !editing &&
      !required &&
      window.CabinetScores &&
      window.CabinetScores.hasPlayerName &&
      window.CabinetScores.hasPlayerName()
    ) {
      paintPlayerChip();
      return;
    }
    if (!window.CabinetScores || !window.CabinetScores.setPlayerName) {
      paintPlayerChip();
      return;
    }
    const overlay = ensurePlayerNameOverlay();
    const input = document.getElementById("player-name-input");
    const saveBtn = document.getElementById("player-name-save");
    const cancelBtn = document.getElementById("player-name-cancel");
    const err = document.getElementById("player-name-error");
    const title = document.getElementById("player-name-title");
    const sub = document.getElementById("player-name-sub");
    playerNameOpen = true;
    overlay.classList.remove("hidden");
    overlay.removeAttribute("hidden");
    if (title) title.textContent = editing ? "Change player name" : "What's your name?";
    if (sub) {
      sub.textContent = editing
        ? "Updates the name used for new local highs."
        : "Shown with local high scores on this phone.";
    }
    if (cancelBtn) {
      if (required && !editing) cancelBtn.classList.add("hidden");
      else cancelBtn.classList.remove("hidden");
    }
    if (err) err.classList.add("hidden");
    if (input) {
      input.value = window.CabinetScores.getPlayerName() || "";
      input.maxLength = window.CabinetScores.MAX_NAME_LEN || 20;
    }
    function finish(saved) {
      saveBtn.removeEventListener("click", onSave);
      if (cancelBtn) cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      if (input) input.removeEventListener("keydown", onInputKey);
      overlay.classList.add("hidden");
      overlay.setAttribute("hidden", "");
      playerNameOpen = false;
      paintPlayerChip();
      if (saved && typeof opts.onSaved === "function") opts.onSaved();
    }
    function onSave() {
      const raw = input ? input.value : "";
      const result = window.CabinetScores.setPlayerName(raw);
      if (!result.ok) {
        if (err) err.classList.remove("hidden");
        try {
          if (input) input.focus();
        } catch (e) {}
        return;
      }
      finish(true);
    }
    function onCancel() {
      if (required && !window.CabinetScores.hasPlayerName()) return;
      finish(false);
    }
    function onBackdrop(ev) {
      if (ev.target !== overlay) return;
      if (required && !window.CabinetScores.hasPlayerName()) return;
      onCancel();
    }
    function onKey(ev) {
      if (ev.key === "Escape") {
        if (required && !window.CabinetScores.hasPlayerName()) {
          ev.preventDefault();
          return;
        }
        ev.preventDefault();
        onCancel();
      }
    }
    function onInputKey(ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        onSave();
      }
    }
    saveBtn.addEventListener("click", onSave);
    if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    if (input) input.addEventListener("keydown", onInputKey);
    try {
      if (input) {
        input.focus();
        input.select();
      }
    } catch (e) {}
  }
  function ensurePlayerNameOnCabinet() {
    paintPlayerChip();
    if (
      window.CabinetScores &&
      window.CabinetScores.hasPlayerName &&
      !window.CabinetScores.hasPlayerName()
    ) {
      requestPlayerName({ required: true, editing: false });
    }
  }
