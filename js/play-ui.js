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

  function applyMode(ui, type) {
    const columnsPlay = type === "columns21" || type === "runlanes";
    const eleven = type === "elevenup";
    const power = type === "powersol";
    const hideRun = columnsPlay || eleven || power;
    ui.playRun.classList.toggle("hidden", hideRun);
    ui.playColumns.classList.toggle("hidden", !columnsPlay);
    if (ui.playEleven) ui.playEleven.classList.toggle("hidden", !eleven);
    if (ui.playPower) ui.playPower.classList.toggle("hidden", !power);
    ui.hit.classList.toggle("hidden", hideRun);
    ui.stay.classList.toggle("hidden", hideRun);
    ui.skip.classList.toggle("hidden", !columnsPlay);
    if (ui.next) ui.next.classList.toggle("hidden", !eleven);
    if (ui.take) ui.take.classList.toggle("hidden", !eleven);
    if (type === "columns21") ui.deal.classList.add("hidden");
    else if (type === "runlanes") {
      ui.hit.classList.add("hidden");
      ui.stay.classList.add("hidden");
    } else if (eleven) ui.deal.classList.add("hidden");
    else if (power) ui.deal.classList.remove("hidden");
    else {
      ui.skip.classList.add("hidden");
      if (ui.next) ui.next.classList.add("hidden");
      if (ui.take) ui.take.classList.add("hidden");
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
      ui.banner.textContent = copy("won", "All 132 home. Power complete.") + " · " + snap.score;
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
  }

  window.CabinetPlay = {
    cardNode: cardNode,
    applyMode: applyMode,
    renderEleven: renderEleven,
    renderPower: renderPower,
    attachUi: function (ui) {
      ui.playEleven = $("play-eleven");
      ui.playPower = $("play-power");
      ui.elevenGrid = $("eleven-grid");
      ui.powerFoundations = $("power-foundations");
      ui.powerStocks = $("power-stocks");
      ui.powerTableau = $("power-tableau");
      ui.next = $("btn-next");
      ui.take = $("btn-take");
    },
  };
})();
