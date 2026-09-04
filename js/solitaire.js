/**
 * Cabinet Kit — 11 Up + Klondike, FreeCell, Spider (browser + Node).
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
  const RANKS = E.RANKS;
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

  /* 11 Up lives in js/11up.js so patience stacking never shares that table. */

  const DEFAULT_KLONDIKE = Object.freeze({
    type: "klondike",
    foundationScore: 10,
    columns: 7,
    moves: "run",
  });

  const DEFAULT_FREECELL = Object.freeze({
    type: "freecell",
    foundationScore: 10,
    columns: 8,
    cells: 4,
    moves: "run",
  });

  const DEFAULT_SPIDER = Object.freeze({
    type: "spider",
    columns: 10,
    runScore: 100,
    suits: 1,
    suit: "♠",
    runs: 8,
    moves: "run",
  });

  function rankIndex(rank) {
    return RANKS.indexOf(rank);
  }

  function isRed(suit) {
    return suit === "♥" || suit === "♦";
  }

  function nextFoundationRank(count) {
    const n = Number(count) || 0;
    if (n < 0 || n >= RANKS.length) return null;
    return RANKS[n];
  }

  function copyFace(card) {
    return { rank: card.rank, suit: card.suit, faceUp: !!card.faceUp };
  }

  function faceCard(card, up) {
    return { rank: card.rank, suit: card.suit, faceUp: up !== false };
  }

  function emptyFoundations() {
    const counts = {};
    const tops = {};
    for (const suit of SUITS) {
      counts[suit] = 0;
      tops[suit] = null;
    }
    return { counts: counts, tops: tops };
  }

  function foundationsHome(session) {
    let n = 0;
    for (const suit of SUITS) n += session.foundations[suit] || 0;
    return n;
  }

  function altDown(upper, lower) {
    if (!upper || !lower) return false;
    if (isRed(upper.suit) === isRed(lower.suit)) return false;
    return rankIndex(lower.rank) === rankIndex(upper.rank) - 1;
  }

  function rankDown(upper, lower) {
    if (!upper || !lower) return false;
    return rankIndex(lower.rank) === rankIndex(upper.rank) - 1;
  }

  function packedRun(col, index, mode) {
    if (!col || index < 0 || index >= col.length) return false;
    if (!col[index].faceUp) return false;
    for (let i = index; i < col.length - 1; i++) {
      const a = col[i];
      const b = col[i + 1];
      if (!a.faceUp || !b.faceUp) return false;
      if (mode === "rank") {
        if (!rankDown(a, b)) return false;
      } else if (!altDown(a, b)) {
        return false;
      }
    }
    return true;
  }

  function flipTop(col) {
    if (col && col.length && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true;
    }
  }

  function snapshotFoundations(session) {
    const foundations = {};
    for (const suit of SUITS) {
      const count = session.foundations[suit] || 0;
      foundations[suit] = {
        count: count,
        max: RANKS.length,
        next: nextFoundationRank(count),
        top: session.foundationTops[suit] ? copyCard(session.foundationTops[suit]) : null,
      };
    }
    return foundations;
  }

  function copySelected(sel) {
    if (!sel) return null;
    const out = { kind: sel.kind };
    if (sel.col != null) out.col = sel.col;
    if (sel.index != null) out.index = sel.index;
    if (sel.suit != null) out.suit = sel.suit;
    if (sel.i != null) out.i = sel.i;
    return out;
  }

  /* ── Klondike ────────────────────────────────────────────────── */

  function configFromKlondikeGame(game) {
    const src = game && typeof game === "object" ? game : {};
    return {
      type: "klondike",
      foundationScore: num(src.foundationScore, DEFAULT_KLONDIKE.foundationScore),
      columns: Math.max(1, Math.floor(num(src.columns, DEFAULT_KLONDIKE.columns))),
      moves: src.moves === "single" ? "single" : DEFAULT_KLONDIKE.moves,
    };
  }

  function klondikeCanPlace(card, dest) {
    if (!card || !dest) return false;
    if (dest.kind === "tableau") {
      const top = dest.top;
      if (!top) return card.rank === "K";
      return altDown(top, card);
    }
    if (dest.kind === "foundation") {
      if (card.suit !== dest.suit) return false;
      const need = nextFoundationRank(dest.count);
      return need != null && card.rank === need;
    }
    return false;
  }

  function createKlondikeSession(game, rng) {
    const config = configFromKlondikeGame(game);
    const random = rng || defaultRng();
    const shoe = shuffle(createDeck(), random);
    const tableau = [];
    for (let col = 0; col < config.columns; col++) {
      const pile = [];
      for (let n = 0; n <= col; n++) {
        const c = shoe.pop();
        pile.push(faceCard(c, n === col));
      }
      tableau.push(pile);
    }
    const found = emptyFoundations();
    return {
      config: config,
      rng: random,
      tableau: tableau,
      stock: shoe,
      waste: [],
      foundations: found.counts,
      foundationTops: found.tops,
      selected: null,
      score: 0,
      status: "playing",
      lastEvent: null,
    };
  }

  function klondikeMoving(session, sel) {
    if (!sel) return null;
    if (sel.kind === "waste") {
      if (!session.waste.length) return null;
      return [session.waste[session.waste.length - 1]];
    }
    if (sel.kind === "tableau") {
      const col = session.tableau[sel.col];
      if (!col || !col.length) return null;
      let index = sel.index;
      if (index == null) index = col.length - 1;
      if (index < 0 || index >= col.length) return null;
      if (!packedRun(col, index, "alt")) return null;
      return col.slice(index);
    }
    return null;
  }

  function klondikeTake(session, sel) {
    const moving = klondikeMoving(session, sel);
    if (!moving || !moving.length) return null;
    if (sel.kind === "waste") {
      session.waste.pop();
    } else if (sel.kind === "tableau") {
      const col = session.tableau[sel.col];
      let index = sel.index;
      if (index == null) index = col.length - moving.length;
      col.splice(index, moving.length);
      flipTop(col);
    }
    return moving.map(function (c) {
      return faceCard(c, true);
    });
  }

  function klondikePlaceDest(session, to) {
    if (to.kind === "tableau") {
      const col = session.tableau[to.col];
      if (!col) return null;
      const top = col.length ? col[col.length - 1] : null;
      return { kind: "tableau", top: top ? { rank: top.rank, suit: top.suit } : null };
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

  function klondikeCanDrop(session, moving, to) {
    if (!moving || !moving.length) return false;
    const dest = klondikePlaceDest(session, to);
    if (!dest) return false;
    if (dest.kind === "foundation") {
      if (moving.length !== 1) return false;
      return klondikeCanPlace(moving[0], dest);
    }
    return klondikeCanPlace(moving[0], dest);
  }

  function klondikeIsSource(session, target) {
    return klondikeMoving(session, target) != null;
  }

  function sameSel(a, b) {
    if (!a || !b || a.kind !== b.kind) return false;
    if (a.kind === "waste" || a.kind === "stock") return true;
    if (a.kind === "tableau") {
      if (a.col !== b.col) return false;
      if (b.index == null) return true;
      if (a.index == null) return b.index === undefined;
      return a.index === b.index;
    }
    if (a.kind === "foundation") return a.suit === b.suit;
    if (a.kind === "cell") return a.i === b.i;
    return false;
  }

  function normalizePatience(target) {
    if (!target || !target.kind) return null;
    if (target.kind === "stock") return { kind: "stock" };
    if (target.kind === "waste") return { kind: "waste" };
    if (target.kind === "tableau") {
      const out = { kind: "tableau", col: Number(target.col) };
      if (target.index != null && target.index !== "") out.index = Number(target.index);
      return out;
    }
    if (target.kind === "foundation") {
      let suit = target.suit;
      if (!suit && target.i != null) suit = SUITS[Number(target.i)];
      return { kind: "foundation", suit: suit };
    }
    if (target.kind === "cell") {
      return { kind: "cell", i: Number(target.i != null ? target.i : target.pile) };
    }
    return null;
  }

  function maybeWinKlondike(session) {
    if (foundationsHome(session) >= 52) {
      session.status = "won";
      session.lastEvent = { kind: "win", points: 0 };
    }
  }

  function tapKlondike(session, rawTarget) {
    if (session.status !== "playing") {
      throw new Error("tap only while playing");
    }
    const target = normalizePatience(rawTarget);
    if (!target) throw new Error("bad target");
    if (target.kind === "tableau") {
      if (!Number.isInteger(target.col) || target.col < 0 || target.col >= session.tableau.length) {
        throw new Error("bad column");
      }
    }
    if (target.kind === "stock") {
      session.selected = null;
      if (session.stock.length) {
        const c = session.stock.pop();
        session.waste.push(faceCard(c, true));
        session.lastEvent = { kind: "draw" };
      } else if (session.waste.length) {
        const piled = session.waste.slice().reverse();
        session.stock = piled.map(function (c) {
          return { rank: c.rank, suit: c.suit };
        });
        session.waste = [];
        session.lastEvent = { kind: "recycle" };
      } else {
        session.lastEvent = { kind: "illegal" };
      }
      return session;
    }
    const sel = session.selected;
    if (!sel) {
      if (klondikeIsSource(session, target)) {
        session.selected = target;
        session.lastEvent = { kind: "select", from: target };
      }
      return session;
    }
    if (sameSel(sel, target)) {
      session.selected = null;
      session.lastEvent = { kind: "deselect" };
      return session;
    }
    const moving = klondikeMoving(session, sel);
    if (!moving) {
      session.selected = klondikeIsSource(session, target) ? target : null;
      return session;
    }
    if (klondikeCanDrop(session, moving, target)) {
      const cards = klondikeTake(session, sel);
      if (target.kind === "tableau") {
        session.tableau[target.col].push.apply(session.tableau[target.col], cards);
        session.lastEvent = { kind: "move", to: "tableau", col: target.col, count: cards.length };
      } else if (target.kind === "foundation") {
        const card = cards[0];
        session.foundations[target.suit] += 1;
        session.foundationTops[target.suit] = { rank: card.rank, suit: card.suit };
        session.score += session.config.foundationScore;
        session.lastEvent = {
          kind: "foundation",
          suit: target.suit,
          points: session.config.foundationScore,
        };
      }
      session.selected = null;
      maybeWinKlondike(session);
      return session;
    }
    if (klondikeIsSource(session, target)) {
      session.selected = target;
      session.lastEvent = { kind: "select", from: target };
    } else {
      session.selected = null;
      session.lastEvent = { kind: "illegal" };
    }
    return session;
  }

  function snapshotKlondike(session) {
    const home = foundationsHome(session);
    const wasteTop = session.waste.length ? session.waste[session.waste.length - 1] : null;
    return {
      type: session.config.type,
      status: session.status,
      score: session.score,
      stockCount: session.stock.length,
      wasteCount: session.waste.length,
      waste: {
        count: session.waste.length,
        top: wasteTop ? copyCard(wasteTop) : null,
      },
      tableau: session.tableau.map(function (col) {
        return col.map(copyFace);
      }),
      foundations: snapshotFoundations(session),
      selected: copySelected(session.selected),
      lastEvent: session.lastEvent,
      foundationScore: session.config.foundationScore,
      moves: session.config.moves,
      home: home,
      total: 52,
    };
  }

  /* ── FreeCell ────────────────────────────────────────────────── */

  function configFromFreeCellGame(game) {
    const src = game && typeof game === "object" ? game : {};
    return {
      type: "freecell",
      foundationScore: num(src.foundationScore, DEFAULT_FREECELL.foundationScore),
      columns: Math.max(1, Math.floor(num(src.columns, DEFAULT_FREECELL.columns))),
      cells: Math.max(1, Math.floor(num(src.cells, DEFAULT_FREECELL.cells))),
      moves: DEFAULT_FREECELL.moves,
    };
  }

  function createFreeCellSession(game, rng) {
    const config = configFromFreeCellGame(game);
    const random = rng || defaultRng();
    const shoe = shuffle(createDeck(), random);
    const tableau = [];
    for (let i = 0; i < config.columns; i++) tableau.push([]);
    let i = 0;
    while (shoe.length) {
      const c = shoe.pop();
      tableau[i % config.columns].push(faceCard(c, true));
      i += 1;
    }
    const cells = [];
    for (let c = 0; c < config.cells; c++) cells.push(null);
    const found = emptyFoundations();
    return {
      config: config,
      rng: random,
      tableau: tableau,
      cells: cells,
      foundations: found.counts,
      foundationTops: found.tops,
      selected: null,
      score: 0,
      status: "playing",
      lastEvent: null,
    };
  }

  function freeCellMaxMove(session, destCol) {
    let free = 0;
    session.cells.forEach(function (c) {
      if (!c) free += 1;
    });
    let empty = 0;
    session.tableau.forEach(function (col) {
      if (!col.length) empty += 1;
    });
    const dest = session.tableau[destCol];
    const destEmpty = dest && dest.length === 0;
    if (destEmpty) empty = Math.max(0, empty - 1);
    return (free + 1) * Math.pow(2, empty);
  }

  function freeCellMoving(session, sel) {
    if (!sel) return null;
    if (sel.kind === "cell") {
      const card = session.cells[sel.i];
      if (!card) return null;
      return [card];
    }
    if (sel.kind === "tableau") {
      const col = session.tableau[sel.col];
      if (!col || !col.length) return null;
      let index = sel.index;
      if (index == null) index = col.length - 1;
      if (index < 0 || index >= col.length) return null;
      if (!packedRun(col, index, "alt")) return null;
      return col.slice(index);
    }
    return null;
  }

  function freeCellTake(session, sel) {
    const moving = freeCellMoving(session, sel);
    if (!moving || !moving.length) return null;
    if (sel.kind === "cell") {
      session.cells[sel.i] = null;
    } else if (sel.kind === "tableau") {
      const col = session.tableau[sel.col];
      let index = sel.index;
      if (index == null) index = col.length - moving.length;
      col.splice(index, moving.length);
    }
    return moving.map(function (c) {
      return faceCard(c, true);
    });
  }

  function freeCellCanDrop(session, moving, to) {
    if (!moving || !moving.length) return false;
    if (to.kind === "cell") {
      if (moving.length !== 1) return false;
      if (to.i < 0 || to.i >= session.cells.length) return false;
      return session.cells[to.i] == null;
    }
    if (to.kind === "foundation") {
      if (moving.length !== 1) return false;
      if (SUITS.indexOf(to.suit) < 0) return false;
      return klondikeCanPlace(moving[0], {
        kind: "foundation",
        suit: to.suit,
        count: session.foundations[to.suit] || 0,
      });
    }
    if (to.kind === "tableau") {
      const col = session.tableau[to.col];
      if (!col) return false;
      const max = freeCellMaxMove(session, to.col);
      if (moving.length > max) return false;
      if (!col.length) return true;
      return altDown(col[col.length - 1], moving[0]);
    }
    return false;
  }

  function maybeWinHome(session, total) {
    if (foundationsHome(session) >= total) {
      session.status = "won";
      session.lastEvent = { kind: "win", points: 0 };
    }
  }

  function tapFreeCell(session, rawTarget) {
    if (session.status !== "playing") {
      throw new Error("tap only while playing");
    }
    const target = normalizePatience(rawTarget);
    if (!target) throw new Error("bad target");
    if (target.kind === "tableau") {
      if (!Number.isInteger(target.col) || target.col < 0 || target.col >= session.tableau.length) {
        throw new Error("bad column");
      }
    }
    if (target.kind === "cell") {
      if (!Number.isInteger(target.i) || target.i < 0 || target.i >= session.cells.length) {
        throw new Error("bad cell");
      }
    }
    const sel = session.selected;
    const isSrc = function (t) {
      return freeCellMoving(session, t) != null;
    };
    if (!sel) {
      if (isSrc(target)) {
        session.selected = target;
        session.lastEvent = { kind: "select", from: target };
      }
      return session;
    }
    if (sameSel(sel, target)) {
      session.selected = null;
      session.lastEvent = { kind: "deselect" };
      return session;
    }
    const moving = freeCellMoving(session, sel);
    if (!moving) {
      session.selected = isSrc(target) ? target : null;
      return session;
    }
    if (freeCellCanDrop(session, moving, target)) {
      const cards = freeCellTake(session, sel);
      if (target.kind === "tableau") {
        session.tableau[target.col].push.apply(session.tableau[target.col], cards);
        session.lastEvent = { kind: "move", to: "tableau", col: target.col, count: cards.length };
      } else if (target.kind === "cell") {
        session.cells[target.i] = cards[0];
        session.lastEvent = { kind: "move", to: "cell", i: target.i };
      } else if (target.kind === "foundation") {
        const card = cards[0];
        session.foundations[target.suit] += 1;
        session.foundationTops[target.suit] = { rank: card.rank, suit: card.suit };
        session.score += session.config.foundationScore;
        session.lastEvent = {
          kind: "foundation",
          suit: target.suit,
          points: session.config.foundationScore,
        };
      }
      session.selected = null;
      maybeWinHome(session, 52);
      return session;
    }
    session.selected = null;
    session.lastEvent = { kind: "illegal" };
    return session;
  }

  function snapshotFreeCell(session) {
    const home = foundationsHome(session);
    return {
      type: session.config.type,
      status: session.status,
      score: session.score,
      cells: session.cells.map(function (c) {
        return c ? copyCard(c) : null;
      }),
      tableau: session.tableau.map(function (col) {
        return col.map(copyFace);
      }),
      foundations: snapshotFoundations(session),
      selected: copySelected(session.selected),
      lastEvent: session.lastEvent,
      foundationScore: session.config.foundationScore,
      moves: session.config.moves,
      home: home,
      total: 52,
      maxMove: freeCellMaxMove(session, 0),
    };
  }

  /* ── Spider (1-suit) ─────────────────────────────────────────── */

  function configFromSpiderGame(game) {
    const src = game && typeof game === "object" ? game : {};
    const suit = SUITS.indexOf(src.suit) >= 0 ? src.suit : DEFAULT_SPIDER.suit;
    return {
      type: "spider",
      columns: Math.max(1, Math.floor(num(src.columns, DEFAULT_SPIDER.columns))),
      runScore: num(src.runScore, DEFAULT_SPIDER.runScore),
      suits: 1,
      suit: suit,
      runs: Math.max(1, Math.floor(num(src.runs, DEFAULT_SPIDER.runs))),
      moves: DEFAULT_SPIDER.moves,
    };
  }

  function createSpiderDeck(suit) {
    const deck = [];
    for (let n = 0; n < 8; n++) {
      for (let r = 0; r < RANKS.length; r++) {
        deck.push({ rank: RANKS[r], suit: suit });
      }
    }
    return deck;
  }

  function createSpiderSession(game, rng) {
    const config = configFromSpiderGame(game);
    const random = rng || defaultRng();
    const shoe = shuffle(createSpiderDeck(config.suit), random);
    const tableau = [];
    for (let col = 0; col < config.columns; col++) {
      const count = col < 4 ? 6 : 5;
      const pile = [];
      for (let n = 0; n < count; n++) {
        const c = shoe.pop();
        pile.push(faceCard(c, n === count - 1));
      }
      tableau.push(pile);
    }
    return {
      config: config,
      rng: random,
      tableau: tableau,
      stock: shoe,
      completed: 0,
      selected: null,
      score: 0,
      status: "playing",
      lastEvent: null,
    };
  }

  function spiderColumnEmpty(session) {
    return session.tableau.some(function (col) {
      return !col.length;
    });
  }

  function spiderTryComplete(session, colIndex) {
    const col = session.tableau[colIndex];
    if (!col || col.length < 13) return false;
    const start = col.length - 13;
    if (!col[start].faceUp) return false;
    for (let i = 0; i < 13; i++) {
      const card = col[start + i];
      if (!card.faceUp) return false;
      if (rankIndex(card.rank) !== 12 - i) return false;
    }
    col.splice(start, 13);
    flipTop(col);
    session.completed += 1;
    session.score += session.config.runScore;
    if (session.completed >= session.config.runs) {
      session.status = "won";
      session.lastEvent = { kind: "win", points: session.config.runScore };
    } else {
      session.lastEvent = { kind: "complete", col: colIndex, points: session.config.runScore };
    }
    return true;
  }

  function dealSpider(session) {
    if (session.status !== "playing") {
      throw new Error("deal only while playing");
    }
    if (spiderColumnEmpty(session)) {
      throw new Error("empty column");
    }
    if (session.stock.length < session.tableau.length) {
      throw new Error("empty stock");
    }
    session.selected = null;
    for (let i = 0; i < session.tableau.length; i++) {
      const c = session.stock.pop();
      session.tableau[i].push(faceCard(c, true));
    }
    session.lastEvent = { kind: "deal" };
    for (let i = 0; i < session.tableau.length; i++) {
      spiderTryComplete(session, i);
    }
    return session;
  }

  function spiderMoving(session, sel) {
    if (!sel || sel.kind !== "tableau") return null;
    const col = session.tableau[sel.col];
    if (!col || !col.length) return null;
    let index = sel.index;
    if (index == null) index = col.length - 1;
    if (index < 0 || index >= col.length) return null;
    if (!packedRun(col, index, "rank")) return null;
    return col.slice(index);
  }

  function spiderTake(session, sel) {
    const moving = spiderMoving(session, sel);
    if (!moving || !moving.length) return null;
    const col = session.tableau[sel.col];
    let index = sel.index;
    if (index == null) index = col.length - moving.length;
    col.splice(index, moving.length);
    flipTop(col);
    return moving.map(function (c) {
      return faceCard(c, true);
    });
  }

  function spiderCanDrop(session, moving, to) {
    if (!moving || !moving.length) return false;
    if (to.kind !== "tableau") return false;
    if (to.col === undefined) return false;
    const col = session.tableau[to.col];
    if (!col) return false;
    if (!col.length) return true;
    return rankDown(col[col.length - 1], moving[0]);
  }

  function tapSpider(session, rawTarget) {
    if (session.status !== "playing") {
      throw new Error("tap only while playing");
    }
    const target = normalizePatience(rawTarget);
    if (!target) throw new Error("bad target");
    if (target.kind === "stock") {
      try {
        dealSpider(session);
      } catch (err) {
        session.selected = null;
        session.lastEvent = { kind: "illegal" };
      }
      return session;
    }
    if (target.kind === "tableau") {
      if (!Number.isInteger(target.col) || target.col < 0 || target.col >= session.tableau.length) {
        throw new Error("bad column");
      }
    }
    const sel = session.selected;
    const isSrc = function (t) {
      return spiderMoving(session, t) != null;
    };
    if (!sel) {
      if (isSrc(target)) {
        session.selected = target;
        session.lastEvent = { kind: "select", from: target };
      }
      return session;
    }
    if (sameSel(sel, target)) {
      session.selected = null;
      session.lastEvent = { kind: "deselect" };
      return session;
    }
    const moving = spiderMoving(session, sel);
    if (!moving) {
      session.selected = isSrc(target) ? target : null;
      return session;
    }
    if (spiderCanDrop(session, moving, target)) {
      const cards = spiderTake(session, sel);
      session.tableau[target.col].push.apply(session.tableau[target.col], cards);
      session.selected = null;
      session.lastEvent = { kind: "move", to: "tableau", col: target.col, count: cards.length };
      spiderTryComplete(session, target.col);
      return session;
    }
    if (isSrc(target)) {
      session.selected = target;
      session.lastEvent = { kind: "select", from: target };
    } else {
      session.selected = null;
      session.lastEvent = { kind: "illegal" };
    }
    return session;
  }

  function snapshotSpider(session) {
    let tableN = 0;
    session.tableau.forEach(function (col) {
      tableN += col.length;
    });
    return {
      type: session.config.type,
      status: session.status,
      score: session.score,
      stockCount: session.stock.length,
      tableau: session.tableau.map(function (col) {
        return col.map(copyFace);
      }),
      completed: session.completed,
      runs: session.config.runs,
      selected: copySelected(session.selected),
      lastEvent: session.lastEvent,
      runScore: session.config.runScore,
      moves: session.config.moves,
      canDeal:
        session.status === "playing" &&
        session.stock.length >= session.tableau.length &&
        !spiderColumnEmpty(session),
      home: session.completed,
      total: session.config.runs,
      cardCount: tableN + session.stock.length + session.completed * 13,
    };
  }

  function createPatienceSession(game, rng) {
    const type = game && game.type;
    if (type === "freecell") return createFreeCellSession(game, rng);
    if (type === "spider") return createSpiderSession(game, rng);
    return createKlondikeSession(game, rng);
  }

  function tapPatience(session, target) {
    const type = session.config && session.config.type;
    if (type === "freecell") return tapFreeCell(session, target);
    if (type === "spider") return tapSpider(session, target);
    return tapKlondike(session, target);
  }

  function snapshotPatience(session) {
    const type = session.config && session.config.type;
    if (type === "freecell") return snapshotFreeCell(session);
    if (type === "spider") return snapshotSpider(session);
    return snapshotKlondike(session);
  }

  E.DEFAULT_KLONDIKE = DEFAULT_KLONDIKE;
  E.DEFAULT_FREECELL = DEFAULT_FREECELL;
  E.DEFAULT_SPIDER = DEFAULT_SPIDER;
  E.configFromKlondikeGame = configFromKlondikeGame;
  E.configFromFreeCellGame = configFromFreeCellGame;
  E.configFromSpiderGame = configFromSpiderGame;
  E.createKlondikeSession = createKlondikeSession;
  E.tapKlondike = tapKlondike;
  E.snapshotKlondike = snapshotKlondike;
  E.klondikeCanPlace = klondikeCanPlace;
  E.createFreeCellSession = createFreeCellSession;
  E.tapFreeCell = tapFreeCell;
  E.snapshotFreeCell = snapshotFreeCell;
  E.freeCellMaxMove = freeCellMaxMove;
  E.createSpiderSession = createSpiderSession;
  E.tapSpider = tapSpider;
  E.snapshotSpider = snapshotSpider;
  E.dealSpider = dealSpider;
  E.createPatienceSession = createPatienceSession;
  E.tapPatience = tapPatience;
  E.snapshotPatience = snapshotPatience;
});
