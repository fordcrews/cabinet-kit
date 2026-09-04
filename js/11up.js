/**
 * 11 Up — own engine + table. Do not share patience stacking CSS/JS.
 */
(function (root, factory) {
  function loadEngine() {
    if (typeof require === "function") {
      try {
        return require("./engine.js");
      } catch (e) {}
    }
    if (typeof window !== "undefined" && window.CabinetEngine) return window.CabinetEngine;
    if (typeof globalThis !== "undefined" && globalThis.CabinetEngine) return globalThis.CabinetEngine;
    throw new Error("CabinetEngine missing");
  }
  const E = loadEngine();
  factory(E);
  if (typeof module === "object" && module.exports) {
    module.exports = E;
  }
  if (typeof window !== "undefined") {
    window.CabinetEngine = E;
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetEngine = E;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (E) {
  "use strict";

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function defaultRng() {
    return Math.random;
  }
  function copyCard(card) {
    return { rank: card.rank, suit: card.suit };
  }
  const shuffle = E.shuffle;
  const createDeck = E.createDeck;

  const DEFAULT_ELEVEN = Object.freeze({
    type: "elevenup",
    pairScore: 11,
    passPenalty: 5,
    clearBonus: 50,
    cells: 12,
    dealCount: 12,
    stacks: 3,
    rounds: 1,
  });

  function configFromElevenGame(game) {
    const src = game && typeof game === "object" ? game : {};
    const stacks = Math.max(1, Math.floor(num(src.stacks, DEFAULT_ELEVEN.stacks)));
    const cells = Math.max(stacks, Math.floor(num(src.cells, DEFAULT_ELEVEN.cells)));
    return {
      type: "elevenup",
      pairScore: num(src.pairScore, DEFAULT_ELEVEN.pairScore),
      passPenalty: num(src.passPenalty, DEFAULT_ELEVEN.passPenalty),
      clearBonus: num(src.clearBonus, DEFAULT_ELEVEN.clearBonus),
      cells: cells,
      dealCount: Math.max(1, Math.floor(num(src.dealCount, DEFAULT_ELEVEN.dealCount))),
      stacks: stacks,
      rounds: Math.max(1, Math.floor(num(src.rounds, DEFAULT_ELEVEN.rounds))),
    };
  }

  function elevenRank(cardOrRank) {
    if (cardOrRank && typeof cardOrRank === "object") return cardOrRank.rank;
    return cardOrRank;
  }
  function elevenIsFace(rank) {
    return rank === "J" || rank === "Q" || rank === "K";
  }
  function elevenValue(cardOrRank) {
    const rank = elevenRank(cardOrRank);
    if (rank === "A") return 1;
    if (elevenIsFace(rank)) return 0;
    return Number(rank);
  }
  function elevenPairLegal(a, b) {
    if (!a || !b) return false;
    const ra = elevenRank(a);
    const rb = elevenRank(b);
    if (!ra || !rb) return false;
    if (elevenIsFace(ra) || elevenIsFace(rb)) {
      return elevenIsFace(ra) && elevenIsFace(rb) && ra === rb;
    }
    return elevenValue(ra) + elevenValue(rb) === 11;
  }
  function emptyElevenGrid(cells) {
    const grid = [];
    for (let i = 0; i < cells; i++) grid.push(null);
    return grid;
  }
  function firstEmptyEleven(session) {
    for (let i = 0; i < session.grid.length; i++) {
      if (session.grid[i] == null) return i;
    }
    return -1;
  }
  function elevenGridEmpty(session) {
    return session.grid.every(function (c) {
      return c == null;
    });
  }
  function dealElevenGrid(session) {
    session.grid = emptyElevenGrid(session.config.cells);
    const n = Math.min(session.config.dealCount, session.stock.length, session.config.cells);
    for (let i = 0; i < n; i++) {
      session.grid[i] = session.stock.pop();
    }
  }
  function createElevenSession(game, rng) {
    const config = configFromElevenGame(game);
    const random = rng || defaultRng();
    const session = {
      config: config,
      rng: random,
      stock: shuffle(createDeck(), random),
      grid: emptyElevenGrid(config.cells),
      selected: null,
      score: 0,
      round: 1,
      status: "playing",
      lastEvent: null,
    };
    dealElevenGrid(session);
    return session;
  }
  function tapEleven(session, index) {
    if (session.status !== "playing") throw new Error("tap only while playing");
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= session.grid.length) throw new Error("bad cell");
    const card = session.grid[i];
    if (!card) {
      session.selected = null;
      session.lastEvent = { kind: "deselect" };
      return session;
    }
    if (session.selected == null) {
      session.selected = i;
      session.lastEvent = { kind: "select", cell: i };
      return session;
    }
    if (session.selected === i) {
      session.selected = null;
      session.lastEvent = { kind: "deselect", cell: i };
      return session;
    }
    const first = session.grid[session.selected];
    if (!first) {
      session.selected = i;
      session.lastEvent = { kind: "select", cell: i };
      return session;
    }
    if (elevenPairLegal(first, card)) {
      const a = session.selected;
      session.grid[a] = null;
      session.grid[i] = null;
      session.score += session.config.pairScore;
      session.selected = null;
      if (elevenGridEmpty(session)) {
        session.score += session.config.clearBonus;
        session.lastEvent = {
          kind: "clear",
          cells: [a, i],
          points: session.config.pairScore + session.config.clearBonus,
        };
        if (session.stock.length) dealElevenGrid(session);
        return session;
      }
      session.lastEvent = { kind: "pair", cells: [a, i], points: session.config.pairScore };
      return session;
    }
    session.selected = null;
    session.lastEvent = { kind: "illegal" };
    return session;
  }
  function nextEleven(session) {
    if (session.status !== "playing") throw new Error("next only while playing");
    if (!session.stock.length) throw new Error("empty stock");
    const i = firstEmptyEleven(session);
    if (i < 0) throw new Error("grid full");
    session.grid[i] = session.stock.pop();
    session.score -= session.config.passPenalty;
    session.selected = null;
    session.lastEvent = { kind: "next", cell: i, points: -session.config.passPenalty };
    return session;
  }
  function takeEleven(session) {
    if (session.status !== "playing") throw new Error("take only while playing");
    const cleared = elevenGridEmpty(session);
    let bonus = 0;
    if (cleared && (!session.lastEvent || session.lastEvent.kind !== "clear")) {
      bonus = session.config.clearBonus;
      session.score += bonus;
    }
    session.selected = null;
    if (session.round < session.config.rounds) {
      session.round += 1;
      session.stock = shuffle(createDeck(), session.rng);
      dealElevenGrid(session);
      session.status = "playing";
      session.lastEvent = { kind: "round", points: bonus, round: session.round, cleared: cleared };
      return session;
    }
    session.status = "done";
    session.lastEvent = { kind: cleared ? "clear" : "take", points: bonus, cleared: cleared };
    return session;
  }
  function snapshotEleven(session) {
    const emptyAt = firstEmptyEleven(session);
    return {
      type: session.config.type,
      status: session.status,
      score: session.score,
      stockCount: session.stock.length,
      grid: session.grid.map(function (c) {
        return c ? copyCard(c) : null;
      }),
      selected: session.selected,
      lastEvent: session.lastEvent,
      pairScore: session.config.pairScore,
      passPenalty: session.config.passPenalty,
      clearBonus: session.config.clearBonus,
      round: session.round || 1,
      rounds: session.config.rounds || 1,
      stacks: session.config.stacks || 3,
      canNext: session.status === "playing" && session.stock.length > 0 && emptyAt >= 0,
      cleared: elevenGridEmpty(session),
    };
  }

  function cardNode(card, mini, selected) {
    if (window.CabinetPlay && window.CabinetPlay.cardNode) {
      return window.CabinetPlay.cardNode(card, mini, selected);
    }
    const el = document.createElement("article");
    el.className = "card";
    el.textContent = card && card.rank ? card.rank + " " + card.suit : "";
    return el;
  }

  function renderEleven(ctx) {
    const snap = E.snapshotEleven(ctx.session);
    const ui = ctx.ui;
    const label = ctx.label;
    const copy = ctx.copy;
    ui.scoreLabel.textContent = label("score", "SCORE");
    ui.scoreValue.textContent = String(snap.score);
    ui.hudRound.textContent =
      (snap.rounds > 1 ? label("round", "ROUND") + " " + snap.round + "/" + snap.rounds + " · " : "") +
      label("stock", "STOCK") +
      " " +
      snap.stockCount;
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
    const n = snap.grid.length;
    const stacks = snap.stacks || (n % 3 === 0 ? 3 : 4);
    const depth = Math.max(1, Math.floor(n / stacks));
    if (ui.elevenStocks) {
      ui.elevenStocks.replaceChildren();
      const left = snap.stockCount || 0;
      for (let s = 0; s < 3; s++) {
        const pile = document.createElement("div");
        pile.className = "eleven-stock";
        const share = Math.floor(left / 3) + (s < left % 3 ? 1 : 0);
        const show = Math.min(4, share);
        for (let k = 0; k < show; k++) {
          pile.appendChild(cardNode({ rank: "", suit: "", faceUp: false }, false, false));
        }
        const meta = document.createElement("span");
        meta.className = "eleven-stock-meta";
        meta.textContent = String(share);
        pile.appendChild(meta);
        ui.elevenStocks.appendChild(pile);
      }
    }
    ui.elevenGrid.replaceChildren();
    ui.elevenGrid.style.gridTemplateColumns = "repeat(" + stacks + ", minmax(0, 1fr))";
    for (let col = 0; col < stacks; col++) {
      const wrap = document.createElement("div");
      wrap.className = "eleven-col";
      for (let row = 0; row < depth; row++) {
        const i = col * depth + row;
        const c = snap.grid[i];
        const btn = document.createElement("button");
        btn.type = "button";
        const sel = snap.selected === i;
        const isTop = row === depth - 1 || !snap.grid[i + 1];
        btn.className =
          "eleven-cell" +
          (c ? "" : " is-empty") +
          (sel ? " is-selected" : "") +
          (c && !isTop ? " is-stacked" : "");
        btn.dataset.cell = String(i);
        btn.disabled = !playing || !c;
        btn.style.zIndex = String(row + 1);
        if (c) btn.appendChild(cardNode(c, false, sel));
        wrap.appendChild(btn);
      }
      ui.elevenGrid.appendChild(wrap);
    }
    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      if (ev && ev.kind === "clear") {
        ui.banner.classList.add("run");
        ui.banner.textContent = copy("clear", "Table clear. Bonus banked.") + " · " + snap.score;
      } else {
        ui.banner.textContent = copy("done", "Sitting over. Deal again.") + " · " + snap.score;
      }
    } else if (ev && ev.kind === "clear") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("clear", "Table clear. Bonus. New layout.") + " · +" + ev.points;
    } else if (ev && ev.kind === "round") {
      ui.banner.classList.add("run");
      ui.banner.textContent = copy("round", "Next round. Fresh deck.") + " · " + snap.score;
    } else if (ev && ev.kind === "pair") {
      ui.banner.classList.add("run");
      ui.banner.textContent = "+" + ev.points + " · " + copy("pair", "Pair off.");
    } else if (ev && ev.kind === "illegal") {
      ui.banner.classList.add("bust");
      ui.banner.textContent = copy("illegal", "Those two don't make 11.");
    } else if (ev && ev.kind === "next") {
      ui.banner.textContent = copy("next", "Pass. Card on the table.") + " " + ev.points;
    } else if (!snap.canNext && playing && snap.stockCount > 0) {
      ui.banner.textContent = copy("full", "Table full. Pair or take score.");
    } else {
      ui.banner.textContent = copy("playing", "Tap two open cards that make 11.");
    }
    if (window.CabinetPlay && window.CabinetPlay.notePlayHigh) {
      window.CabinetPlay.notePlayHigh(ctx, snap.score, snap);
    }
  }

  E.DEFAULT_ELEVEN = DEFAULT_ELEVEN;
  E.configFromElevenGame = configFromElevenGame;
  E.createElevenSession = createElevenSession;
  E.tapEleven = tapEleven;
  E.nextEleven = nextEleven;
  E.takeEleven = takeEleven;
  E.snapshotEleven = snapshotEleven;
  E.elevenValue = elevenValue;
  E.elevenPairLegal = elevenPairLegal;

  if (typeof window !== "undefined") {
    window.ElevenUpPlay = { render: renderEleven };
    if (window.CabinetPlay) window.CabinetPlay.renderEleven = renderEleven;
  }
});
