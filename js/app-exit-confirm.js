  let exitConfirmOpen = false;
  let exitBypass = false;
  let playHashGuard = "";
  function rememberPlayHash(hash) {
    const h = hash || "";
    if (/^#\/play\//.test(h) || /^#\/set\//.test(h)) playHashGuard = h;
  }
  function shouldGateExit() {
    if (exitBypass) return false;
    if (!(ui.game && ui.game.classList.contains("active"))) return false;
    return !!(gameDef || session || patienceOpts || setPlay);
  }
  function quietRestorePlayHash() {
    if (!playHashGuard) return;
    try {
      history.replaceState(null, "", location.pathname + location.search + playHashGuard);
    } catch (e) {}
  }
  function ensureExitOverlay() {
    let el = document.getElementById("exit-confirm");
    if (el) return el;
    el = document.createElement("div");
    el.id = "exit-confirm";
    el.className = "exit-confirm hidden";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "exit-confirm-title");
    el.innerHTML =
      '<div class="exit-confirm-card">' +
      '<p class="exit-confirm-title" id="exit-confirm-title">Are you sure you want to exit?</p>' +
      '<p class="exit-confirm-sub">Stay keeps this sitting as it is.</p>' +
      '<div class="exit-confirm-actions">' +
      '<button type="button" class="btn stay" id="exit-confirm-stay">STAY</button>' +
      '<button type="button" class="btn ghost exit-leave" id="exit-confirm-leave">EXIT</button>' +
      "</div></div>";
    const host = document.querySelector(".cabinet") || document.body;
    host.appendChild(el);
    return el;
  }
  function requestExitConfirm(onLeave) {
    if (!shouldGateExit()) {
      if (typeof onLeave === "function") onLeave();
      return;
    }
    if (exitConfirmOpen) return;
    const overlay = ensureExitOverlay();
    exitConfirmOpen = true;
    overlay.classList.remove("hidden");
    overlay.removeAttribute("hidden");
    const stayBtn = document.getElementById("exit-confirm-stay");
    const leaveBtn = document.getElementById("exit-confirm-leave");
    function finish(leave) {
      stayBtn.removeEventListener("click", onStay);
      leaveBtn.removeEventListener("click", onExit);
      overlay.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      overlay.classList.add("hidden");
      overlay.setAttribute("hidden", "");
      exitConfirmOpen = false;
      if (leave && typeof onLeave === "function") onLeave();
    }
    function onStay() {
      finish(false);
    }
    function onExit() {
      finish(true);
    }
    function onBackdrop(ev) {
      if (ev.target === overlay) onStay();
    }
    function onKey(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        onStay();
      }
    }
    stayBtn.addEventListener("click", onStay);
    leaveBtn.addEventListener("click", onExit);
    overlay.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    try {
      stayBtn.focus();
    } catch (e) {}
  }
  function confirmLeaveToCabinet() {
    requestExitConfirm(function () {
      exitBypass = true;
      if (typeof clearSet === "function") clearSet();
      else setPlay = null;
      if ((location.hash || "#/") === "#/" || location.hash === "" || location.hash === "#") {
        exitBypass = false;
        openCabinet();
      } else {
        location.hash = "#/";
      }
    });
  }
