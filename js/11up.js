/**
 * 11 Up — three pyramids like Megatouch (not vertical columns, not patience stacks).
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

  const ROW_WIDTHS = [1, 2, 3];
  const PYR_SIZE = 6;

  const DEFAULT_ELEVEN = Object.freeze({
    type: "elevenup",
    pairScore: 11,
    passPenalty: 5,
    clearBonus: 50,
    stacks: 3,
    pyramidRows: 3,
    cells: 18,
    dealCount: 18,
    feltSlots: 6,
    rounds: 1,
  });

  function pyramidSize(rows) {
    let n = 0;
    for (let r = 0; r < rows; r++) n += r + 1;
    return n;
  }

  function configFromElevenGame(game) {
    const src = game && typeof game === "object" ? game : {};
    const stacks = Math.max(1, Math.floor(num(src.stacks, DEFAULT_ELEVEN.stacks)));
    const pyramidRows = Math.max(2, Math.floor(num(src.pyramidRows, DEFAULT_ELEVEN.pyramidRows)));
    const per = pyramidSize(pyramidRows);
    const feltSlots = Math.max(0, Math.floor(num(src.feltSlots, DEFAULT_ELEVEN.feltSlots)));
    const pyramidCells = stacks * per;
    return {
      type: "elevenup",
      pairScore: num(src.pairScore, DEFAULT_ELEVEN.pairScore),
      passPenalty: num(src.passPenalty, DEFAULT_ELEVEN.passPenalty),
      clearBonus: num(src.clearBonus, DEFAULT_ELEVEN.clearBonus),
      stacks: stacks,
      pyramidRows: pyramidRows,
      feltSlots: feltSlots,
      pyramidCells: pyramidCells,
      cells: pyramidCells + feltSlots,
      dealCount: pyramidCells,
      rounds: Math.max(1, Math.floor(num(src.rounds, DEFAULT_ELEVEN.rounds))),
    };
  }

  function pyramidCellsOf(session) {
    return session.config.pyramidCells || session.config.stacks * pyramidSize(session.config.pyramidRows);
  }

  function isFeltIndex(session, i) {
    return i >= pyramidCellsOf(session);
  }

  function locOf(session, i) {
    const per = pyramidSize(session.config.pyramidRows);
    const p = Math.floor(i / per);
    let o = i % per;
    let row = 0;
    while (row < session.config.pyramidRows && o >= row + 1) {
      o -= row + 1;
      row += 1;
    }
    return { pyramid: p, row: row, col: o };
  }

  function indexOf(session, p, row, col) {
    const per = pyramidSize(session.config.pyramidRows);
    let o = 0;
    for (let r = 0; r < row; r++) o += r + 1;
    return p * per + o + col;
  }

  function coveringIndexes(session, i) {
    if (isFeltIndex(session, i)) return [];
    const loc = locOf(session, i);
    const next = loc.row + 1;
    if (next >= session.config.pyramidRows) return [];
    return [
      indexOf(session, loc.pyramid, next, loc.col),
      indexOf(session, loc.pyramid, next, loc.col + 1),
    ];
  }

  function elevenIsOpen(session, i) {
    if (!session.grid[i]) return false;
    const cov = coveringIndexes(session, i);
    for (let k = 0; k < cov.length; k++) {
      if (session.grid[cov[k]]) return false;
    }
    return true;
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
    if (!elevenIsOpen(session, i)) {
      session.lastEvent = { kind: "covered" };
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
    const open = session.grid.map(function (_c, i) {
      return elevenIsOpen(session, i);
    });
    return {
      type: session.config.type,
      status: session.status,
      score: session.score,
      stockCount: session.stock.length,
      grid: session.grid.map(function (c) {
        return c ? copyCard(c) : null;
      }),
      open: open,
      selected: session.selected,
      lastEvent: session.lastEvent,
      pairScore: session.config.pairScore,
      passPenalty: session.config.passPenalty,
      clearBonus: session.config.clearBonus,
      round: session.round || 1,
      rounds: session.config.rounds || 1,
      stacks: session.config.stacks || 3,
      pyramidRows: session.config.pyramidRows || 3,
      feltSlots: session.config.feltSlots || 0,
      pyramidCells: pyramidCellsOf(session),
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

    const stacks = snap.stacks || 3;
    const rows = snap.pyramidRows || 3;
    const per = pyramidSize(rows);
    ui.elevenGrid.replaceChildren();
    ui.elevenGrid.className = "eleven-grid eleven-pyramids";
    ui.elevenGrid.style.gridTemplateColumns = "repeat(" + stacks + ", minmax(0, 1fr))";
    for (let p = 0; p < stacks; p++) {
      const pyr = document.createElement("div");
      pyr.className = "eleven-pyramid";
      let idx = p * per;
      for (let r = 0; r < rows; r++) {
        const rowEl = document.createElement("div");
        rowEl.className = "eleven-row";
        rowEl.dataset.row = String(r);
        const width = r + 1;
        for (let c = 0; c < width; c++) {
          const i = idx++;
          const card = snap.grid[i];
          const btn = document.createElement("button");
          btn.type = "button";
          const sel = snap.selected === i;
          const open = !!snap.open[i];
          btn.className =
            "eleven-cell" +
            (card ? "" : " is-empty") +
            (sel ? " is-selected" : "") +
            (card && !open ? " is-covered" : "") +
            (open ? " is-open" : "");
          btn.dataset.cell = String(i);
          btn.disabled = !playing || !card || !open;
          btn.style.zIndex = String(r * 10 + c + 1);
          if (card) btn.appendChild(cardNode(card, false, sel));
          rowEl.appendChild(btn);
        }
        pyr.appendChild(rowEl);
      }
      ui.elevenGrid.appendChild(pyr);
    }

    const pyrN = snap.pyramidCells || stacks * per;
    if (snap.grid.length > pyrN) {
      const felt = document.createElement("div");
      felt.className = "eleven-felt";
      for (let i = pyrN; i < snap.grid.length; i++) {
        const card = snap.grid[i];
        const btn = document.createElement("button");
        btn.type = "button";
        const sel = snap.selected === i;
        const open = !!snap.open[i];
        btn.className =
          "eleven-cell eleven-felt-cell" +
          (card ? "" : " is-empty") +
          (sel ? " is-selected" : "") +
          (open ? " is-open" : "");
        btn.dataset.cell = String(i);
        btn.disabled = !playing || (card ? !open : true);
        if (card) btn.appendChild(cardNode(card, false, sel));
        felt.appendChild(btn);
      }
      ui.elevenGrid.appendChild(felt);
    }

    if (ui.elevenStocks) {
      ui.elevenStocks.replaceChildren();
      const left = snap.stockCount || 0;
      const piles = 2;
      for (let s = 0; s < piles; s++) {
        const pile = document.createElement("div");
        pile.className = "eleven-stock" + (snap.canNext ? " is-ready" : "");
        const share = Math.floor(left / piles) + (s < left % piles ? 1 : 0);
        if (share > 0) {
          pile.appendChild(cardNode({ rank: "", suit: "", faceUp: false }, false, false));
        }
        const meta = document.createElement("span");
        meta.className = "eleven-stock-meta";
        meta.textContent = share ? String(share) : "—";
        pile.appendChild(meta);
        ui.elevenStocks.appendChild(pile);
      }
    }

    ui.banner.className = "banner";
    const ev = snap.lastEvent;
    if (snap.status === "done") {
      ui.banner.textContent = copy("done", "Sitting over. Deal again.") + " · " + snap.score;
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
    } else if (ev && ev.kind === "covered") {
      ui.banner.textContent = copy("covered", "That card is covered. Peel an open 11.");
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
  E.elevenIsOpen = elevenIsOpen;

  if (typeof window !== "undefined") {
    window.ElevenUpPlay = { render: renderEleven };
    if (window.CabinetPlay) window.CabinetPlay.renderEleven = renderEleven;
  }
});
