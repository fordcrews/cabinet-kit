/**
 * Cabinet Kit — 11 Up + Power Solitaire engine extras (browser + Node).
 * Extends CabinetEngine; Node: require this file to get the combined API.
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

  const SUITS = E.SUITS;
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
    cells: 16,
    dealCount: 12,
  });

  const POWER_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J"];
  const POWER_FOUNDATION_MAX = 33;
  const POWER_TOTAL = 132;

  const DEFAULT_POWERSOL = Object.freeze({
    type: "powersol",
    foundationScore: 10,
    columns: 7,
    decks: 3,
    moves: "single",
  });

  function configFromElevenGame(game) {
    const src = game && typeof game === "object" ? game : {};
    return {
      type: "elevenup",
      pairScore: num(src.pairScore, DEFAULT_ELEVEN.pairScore),
      passPenalty: num(src.passPenalty, DEFAULT_ELEVEN.passPenalty),
      clearBonus: num(src.clearBonus, DEFAULT_ELEVEN.clearBonus),
      cells: Math.max(4, Math.floor(num(src.cells, DEFAULT_ELEVEN.cells))),
      dealCount: Math.max(1, Math.floor(num(src.dealCount, DEFAULT_ELEVEN.dealCount))),
    };
  }

  function configFromPowerGame(game) {
    const src = game && typeof game === "object" ? game : {};
    const moves = src.moves === "run" ? "run" : DEFAULT_POWERSOL.moves;
    return {
      type: "powersol",
      foundationScore: num(src.foundationScore, DEFAULT_POWERSOL.foundationScore),
      columns: Math.max(1, Math.floor(num(src.columns, DEFAULT_POWERSOL.columns))),
      decks: Math.max(1, Math.floor(num(src.decks, DEFAULT_POWERSOL.decks))),
      moves: moves,
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
      status: "playing",
      lastEvent: null,
    };
    dealElevenGrid(session);
    return session;
  }

  function tapEleven(session, index) {
    if (session.status !== "playing") {
      throw new Error("tap only while playing");
    }
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= session.grid.length) {
      throw new Error("bad cell");
    }
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
      session.lastEvent = {
        kind: "pair",
        cells: [a, i],
        points: session.config.pairScore,
      };
      return session;
    }
    session.selected = null;
    session.lastEvent = { kind: "illegal" };
    return session;
  }

  function nextEleven(session) {
    if (session.status !== "playing") {
      throw new Error("next only while playing");
    }
    if (!session.stock.length) {
      throw new Error("empty stock");
    }
    const i = firstEmptyEleven(session);
    if (i < 0) {
      throw new Error("grid full");
    }
    session.grid[i] = session.stock.pop();
    session.score -= session.config.passPenalty;
    session.selected = null;
    session.lastEvent = {
      kind: "next",
      cell: i,
      points: -session.config.passPenalty,
    };
    return session;
  }

  function takeEleven(session) {
    if (session.status !== "playing") {
      throw new Error("take only while playing");
    }
    const cleared = elevenGridEmpty(session);
    let bonus = 0;
    if (cleared) {
      bonus = session.config.clearBonus;
      session.score += bonus;
    }
    session.status = "done";
    session.selected = null;
    session.lastEvent = {
      kind: cleared ? "clear" : "take",
      points: bonus,
      cleared: cleared,
    };
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
      canNext:
        session.status === "playing" &&
        session.stock.length > 0 &&
        emptyAt >= 0,
      cleared: elevenGridEmpty(session),
    };
  }

  function createPowerDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of POWER_RANKS) {
        deck.push({ rank: rank, suit: suit });
      }
    }
    return deck;
  }

  function powerRankIndex(rank) {
    return POWER_RANKS.indexOf(rank);
  }

  function powerIsRed(suit) {
    return suit === "♥" || suit === "♦";
  }

  function nextPowerRank(count) {
    const n = Number(count) || 0;
    if (n < 0 || n >= POWER_FOUNDATION_MAX) return null;
    return POWER_RANKS[n % POWER_RANKS.length];
  }

  function powerCanPlace(card, dest) {
    if (!card || !dest) return false;
    if (dest.kind === "tableau") {
      const top = dest.top;
      if (!top) return card.rank === "J";
      if (powerIsRed(card.suit) === powerIsRed(top.suit)) return false;
      return powerRankIndex(card.rank) === powerRankIndex(top.rank) - 1;
    }
    if (dest.kind === "foundation") {
      if (card.suit !== dest.suit) return false;
      const need = nextPowerRank(dest.count);
      return need != null && card.rank === need;
    }
    return false;
  }

  function copyPowerCard(card) {
    return { rank: card.rank, suit: card.suit, faceUp: !!card.faceUp };
  }

  function emptyFoundations() {
    const f = {};
    const tops = {};
    for (const suit of SUITS) {
      f[suit] = 0;
      tops[suit] = null;
    }
    return { counts: f, tops: tops };
  }

  function splitPowerStocks(cards, piles) {
    const stocks = [];
    const n = cards.length;
    const base = Math.floor(n / piles);
    let extra = n % piles;
    let offset = 0;
    for (let i = 0; i < piles; i++) {
      const size = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra -= 1;
      stocks.push(cards.slice(offset, offset + size));
      offset += size;
    }
    return stocks;
  }

  function createPowerSession(game, rng) {
    const config = configFromPowerGame(game);
    const random = rng || defaultRng();
    let shoe = [];
    for (let d = 0; d < config.decks; d++) {
      shoe = shoe.concat(createPowerDeck());
    }
    shoe = shuffle(shoe, random);
    const tableau = [];
    for (let col = 0; col < config.columns; col++) {
      const pile = [];
      for (let n = 0; n <= col; n++) {
        const c = shoe.pop();
        pile.push({ rank: c.rank, suit: c.suit, faceUp: n === col });
      }
      tableau.push(pile);
    }
    const stocks = splitPowerStocks(shoe, 3);
    const found = emptyFoundations();
    return {
      config: config,
      rng: random,
      tableau: tableau,
      stocks: stocks,
      foundations: found.counts,
      foundationTops: found.tops,
      selected: null,
      score: 0,
      status: "playing",
      lastEvent: null,
    };
  }

  function powerSourceCard(session, sel) {
    if (!sel) return null;
    if (sel.kind === "stock") {
      const pile = session.stocks[sel.pile];
      if (!pile || !pile.length) return null;
      return pile[pile.length - 1];
    }
    if (sel.kind === "tableau") {
      const col = session.tableau[sel.col];
      if (!col || !col.length) return null;
      const top = col[col.length - 1];
      if (!top.faceUp) return null;
      return top;
    }
    return null;
  }

  function powerIsSource(session, target) {
    return powerSourceCard(session, target) != null;
  }

  function samePowerTarget(a, b) {
    if (!a || !b || a.kind !== b.kind) return false;
    if (a.kind === "stock") return a.pile === b.pile;
    if (a.kind === "tableau") return a.col === b.col;
    if (a.kind === "foundation") return a.suit === b.suit;
    return false;
  }

  function normalizePowerTarget(target) {
    if (!target || !target.kind) return null;
    if (target.kind === "stock") {
      return { kind: "stock", pile: Number(target.pile) };
    }
    if (target.kind === "tableau") {
      return { kind: "tableau", col: Number(target.col) };
    }
    if (target.kind === "foundation") {
      let suit = target.suit;
      if (!suit && target.i != null) suit = SUITS[Number(target.i)];
      return { kind: "foundation", suit: suit };
    }
    return null;
  }

  function powerDestSpec(session, to) {
    if (to.kind === "tableau") {
      const col = session.tableau[to.col];
      if (!col) return null;
      const top = col.length ? col[col.length - 1] : null;
      return {
        kind: "tableau",
        top: top ? { rank: top.rank, suit: top.suit } : null,
      };
    }
    if (to.kind === "foundation") {
      if (SUITS.indexOf(to.suit) < 0) return null;
      return {
        kind: "foundation",
        suit: to.suit,
        count: session.foundations[to.suit] || 0,
      };
    }
    return null;
  }

  function takePowerSource(session, from) {
    let card = null;
    if (from.kind === "stock") {
      card = session.stocks[from.pile].pop();
    } else if (from.kind === "tableau") {
      const col = session.tableau[from.col];
      card = col.pop();
      if (col.length && !col[col.length - 1].faceUp) {
        col[col.length - 1].faceUp = true;
      }
    }
    if (!card) return null;
    return { rank: card.rank, suit: card.suit, faceUp: true };
  }

  function foundationsHome(session) {
    let n = 0;
    for (const suit of SUITS) n += session.foundations[suit] || 0;
    return n;
  }

  function maybeWinPower(session) {
    if (foundationsHome(session) >= POWER_TOTAL) {
      session.status = "won";
      session.lastEvent = { kind: "win", points: 0 };
    }
  }

  function tapPower(session, rawTarget) {
    if (session.status !== "playing") {
      throw new Error("tap only while playing");
    }
    const target = normalizePowerTarget(rawTarget);
    if (!target) {
      throw new Error("bad target");
    }
    if (target.kind === "tableau") {
      if (!Number.isInteger(target.col) || target.col < 0 || target.col >= session.tableau.length) {
        throw new Error("bad column");
      }
    }
    if (target.kind === "stock") {
      if (!Number.isInteger(target.pile) || target.pile < 0 || target.pile >= session.stocks.length) {
        throw new Error("bad stock");
      }
    }
    const sel = session.selected;
    if (!sel) {
      if (powerIsSource(session, target)) {
        session.selected = target;
        session.lastEvent = { kind: "select", from: target };
      }
      return session;
    }
    if (samePowerTarget(sel, target)) {
      session.selected = null;
      session.lastEvent = { kind: "deselect" };
      return session;
    }
    const card = powerSourceCard(session, sel);
    if (!card) {
      session.selected = powerIsSource(session, target) ? target : null;
      return session;
    }
    const dest = powerDestSpec(session, target);
    if (dest && powerCanPlace(card, dest)) {
      const moving = takePowerSource(session, sel);
      if (target.kind === "tableau") {
        session.tableau[target.col].push(moving);
        session.lastEvent = { kind: "move", to: "tableau", col: target.col };
      } else if (target.kind === "foundation") {
        session.foundations[target.suit] += 1;
        session.foundationTops[target.suit] = {
          rank: moving.rank,
          suit: moving.suit,
        };
        session.score += session.config.foundationScore;
        session.lastEvent = {
          kind: "foundation",
          suit: target.suit,
          points: session.config.foundationScore,
        };
      }
      session.selected = null;
      maybeWinPower(session);
      return session;
    }
    if (powerIsSource(session, target)) {
      session.selected = target;
      session.lastEvent = { kind: "select", from: target };
    } else {
      session.selected = null;
      session.lastEvent = { kind: "illegal" };
    }
    return session;
  }

  function snapshotPower(session) {
    const home = foundationsHome(session);
    const stocks = session.stocks.map(function (pile) {
      const top = pile.length ? pile[pile.length - 1] : null;
      return {
        count: pile.length,
        top: top ? copyCard(top) : null,
      };
    });
    const foundations = {};
    for (const suit of SUITS) {
      const count = session.foundations[suit] || 0;
      foundations[suit] = {
        count: count,
        max: POWER_FOUNDATION_MAX,
        next: nextPowerRank(count),
        top: session.foundationTops[suit]
          ? copyCard(session.foundationTops[suit])
          : null,
      };
    }
    return {
      type: session.config.type,
      status: session.status,
      score: session.score,
      stocks: stocks,
      tableau: session.tableau.map(function (col) {
        return col.map(copyPowerCard);
      }),
      foundations: foundations,
      selected: session.selected,
      lastEvent: session.lastEvent,
      foundationScore: session.config.foundationScore,
      moves: session.config.moves,
      home: home,
      total: POWER_TOTAL,
      stockCount: stocks.reduce(function (s, p) {
        return s + p.count;
      }, 0),
    };
  }

  E.POWER_RANKS = POWER_RANKS;
  E.DEFAULT_ELEVEN = DEFAULT_ELEVEN;
  E.DEFAULT_POWERSOL = DEFAULT_POWERSOL;
  E.configFromElevenGame = configFromElevenGame;
  E.configFromPowerGame = configFromPowerGame;
  E.createPowerDeck = createPowerDeck;
  E.createElevenSession = createElevenSession;
  E.tapEleven = tapEleven;
  E.nextEleven = nextEleven;
  E.takeEleven = takeEleven;
  E.snapshotEleven = snapshotEleven;
  E.elevenValue = elevenValue;
  E.elevenPairLegal = elevenPairLegal;
  E.createPowerSession = createPowerSession;
  E.tapPower = tapPower;
  E.snapshotPower = snapshotPower;
  E.powerCanPlace = powerCanPlace;
});
