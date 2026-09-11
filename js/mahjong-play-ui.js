(function () {
  "use strict";
  function renderMahjong(ctx) {
    const E = ctx.E, ui = ctx.ui, session = ctx.session;
    const snap = E.snapshotMahjong(session);
    const label = ctx.label, copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent = label("tiles", "TILES") + " " + snap.remaining;
    const mins = Math.floor(snap.elapsedSec / 60);
    const secs = snap.elapsedSec % 60;
    ui.hudDeck.textContent =
      label("time", "TIME") +
      " " +
      mins +
      ":" +
      (secs < 10 ? "0" : "") +
      secs;
    ui.deal.textContent = label("again", "DEAL AGAIN");
    ui.deal.classList.toggle("hidden", snap.status === "playing");
    ui.back.textContent = label("back", "CABINET");
    if (ui.undo) {
      ui.undo.classList.toggle("hidden", !snap.undo);
      ui.undo.textContent = label("undo", "UNDO");
      ui.undo.disabled = !snap.canUndo;
      ui.undo.classList.toggle("is-ready", !!snap.canUndo);
    }
    if (ui.hint) {
      ui.hint.classList.toggle("hidden", snap.status !== "playing");
      ui.hint.textContent = label("hint", "HINT");
      ui.hint.disabled = snap.status !== "playing";
    }
    const board = ui.mahjongBoard;
    if (board) {
      board.style.setProperty("--mj-w", String(snap.bounds.w));
      board.style.setProperty("--mj-h", String(snap.bounds.h));
      if (!board.style.getPropertyValue("--mj-tw")) board.style.setProperty("--mj-tw", "36");
      if (!board.style.getPropertyValue("--mj-th")) board.style.setProperty("--mj-th", "48");
      board.replaceChildren();
      const hint = {};
      if (snap.hint) {
        hint[snap.hint[0]] = 1;
        hint[snap.hint[1]] = 1;
      }
      const matched = {};
      if (snap.lastMatch && snap.lastEvent && snap.lastEvent.kind === "pair") {
        matched[snap.lastMatch[0]] = 1;
        matched[snap.lastMatch[1]] = 1;
      }
      const playing = snap.status === "playing";
      snap.tiles.forEach(function (t) {
        if (t.removed && !matched[t.id]) return;
        const btn = document.createElement("button");
        btn.type = "button";
        let state = t.free ? "is-free" : "is-blocked";
        if (snap.selected === t.id) state = "is-selected";
        if (hint[t.id]) state += " is-hint";
        if (matched[t.id]) state += " just-match";
        btn.className = "mj-tile " + state;
        btn.style.setProperty("--mx", String(t.x));
        btn.style.setProperty("--my", String(t.y));
        btn.style.setProperty("--mz", String(t.z));
        btn.dataset.mj = String(t.id);
        btn.disabled = !playing || (!t.free && snap.selected !== t.id) || !!t.removed;
        const labelText = E.faceLabelMahjong ? E.faceLabelMahjong(t.face) : t.face;
        btn.setAttribute("aria-label", labelText);
        const face = document.createElement("span");
        face.className = "mj-face " + t.face;
        btn.appendChild(face);
        board.appendChild(btn);
      });
    }
    ui.banner.className = "banner";
    const ev = snap.lastEvent || {};
    if (snap.status === "won") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("won", "Turtle clear.") + " · " + snap.score;
    } else if (snap.status === "stuck") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("stuck", "No free pairs left.") + " · " + snap.score;
    } else if (ev.kind === "pair") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("pair", "Pair cleared.") + " · +" + ev.points;
    } else if (ev.kind === "blocked") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("blocked", "That tile is blocked.");
    } else if (ev.kind === "mismatch") {
      ui.banner.textContent = copy("mismatch", "Those do not match. New selection.");
    } else if (ev.kind === "hint") {
      ui.banner.textContent = copy("hint", "One free pair highlighted.");
    } else if (ev.kind === "undo") {
      ui.banner.textContent = copy("undo", "Went back one pair.");
    } else if (ev.kind === "select") {
      ui.banner.textContent = copy("select", "Tile selected — tap a match.");
    } else {
      ui.banner.textContent = copy("playing", "Tap a free tile, then its match.");
    }
    if (ctx && ctx.gameDef && window.CabinetScores) {
      var n = Number(snap.score);
      ctx.highResult = window.CabinetScores.record(ctx.gameDef.id, Number.isFinite(n) ? n : 0);
    }
  }

  var P = window.CabinetPlay;
  if (!P) return;
  P.renderMahjong = renderMahjong;
  var _apply = P.applyMode;
  P.applyMode = function (ui, type) {
    if (typeof _apply === "function") _apply(ui, type);
    var mahjong = type === "mahjong";
    if (ui.playMahjong) ui.playMahjong.classList.toggle("hidden", !mahjong);
    if (!mahjong) {
      if (ui.hint) ui.hint.classList.add("hidden");
      return;
    }
    if (ui.playRun) ui.playRun.classList.add("hidden");
    if (ui.playColumns) ui.playColumns.classList.add("hidden");
    if (ui.hit) ui.hit.classList.add("hidden");
    if (ui.stay) ui.stay.classList.add("hidden");
    if (ui.skip) ui.skip.classList.add("hidden");
    if (ui.next) ui.next.classList.add("hidden");
    if (ui.take) ui.take.classList.add("hidden");
    if (ui.roll) ui.roll.classList.add("hidden");
    if (ui.shoot) ui.shoot.classList.add("hidden");
    if (ui.deal) ui.deal.classList.add("hidden");
    if (ui.undo) ui.undo.classList.remove("hidden");
    if (ui.hint) ui.hint.classList.remove("hidden");
  };
})();
