/**
 * Cabinet Kit — card engine (browser + Node).
 * v0.4: type "run21" (HIT/STAY), "columns21" (Zip / Chug), "runlanes" (Run 21).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CabinetEngine = api;
  } else if (typeof globalThis !== "undefined") {
    globalThis.CabinetEngine = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const FACES = { J: 10, Q: 10, K: 10 };

  const DEFAULT_RUN21 = Object.freeze({
    type: "run21",
    target: 21,
    runBonus: 5,
    thinDeck: 10,
    startingCards: 2,
  });

  const DEFAULT_COLUMNS21 = Object.freeze({
    type: "columns21",
    target: 21,
    columns: 4,
    skips: 3,
    maxCards: 5,
    bustPenalty: 10,
    clearBonus: 0,
    thinDeck: 0,
    piece: "card",
  });

  function configFromGame(game) {
    const src = game && typeof game === "object" ? game : {};
    return {
      type: src.type || DEFAULT_RUN21.type,
      target: num(src.target, DEFAULT_RUN21.target),
      runBonus: num(src.runBonus, DEFAULT_RUN21.runBonus),
      thinDeck: num(src.thinDeck, DEFAULT_RUN21.thinDeck),
      startingCards: num(src.startingCards, DEFAULT_RUN21.startingCards),
    };
  }

  function configFromColumnsGame(game) {
    const src = game && typeof game === "object" ? game : {};
    const piece = src.piece === "mug" ? "mug" : DEFAULT_COLUMNS21.piece;
    return {
      type: "columns21",
      target: num(src.target, DEFAULT_COLUMNS21.target),
      columns: Math.max(1, Math.floor(num(src.columns, DEFAULT_COLUMNS21.columns))),
      skips: Math.max(0, Math.floor(num(src.skips, DEFAULT_COLUMNS21.skips))),
      maxCards: Math.max(1, Math.floor(num(src.maxCards, DEFAULT_COLUMNS21.maxCards))),
      bustPenalty: num(src.bustPenalty, DEFAULT_COLUMNS21.bustPenalty),
      clearBonus: num(src.clearBonus, DEFAULT_COLUMNS21.clearBonus),
      thinDeck: num(src.thinDeck, DEFAULT_COLUMNS21.thinDeck),
      piece: piece,
    };
  }

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function defaultRng() {
    return Math.random;
  }

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }

  function shuffle(deck, rng) {
    const random = rng || defaultRng();
    const cards = deck.slice();
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const tmp = cards[i];
      cards[i] = cards[j];
      cards[j] = tmp;
    }
    return cards;
  }

  function pipValue(rank) {
    if (rank === "A") return 11;
    if (FACES[rank]) return FACES[rank];
    return Number(rank);
  }

  /**
   * Soft-ace total: count each Ace as 11 unless that busts the target,
   * then drop aces to 1 one at a time.
   */
  function handValue(cards, target) {
    const cap = target == null ? DEFAULT_RUN21.target : target;
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      if (card.rank === "A") {
        aces += 1;
        total += 11;
      } else {
        total += pipValue(card.rank);
      }
    }
    while (total > cap && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return total;
  }

  function isBust(cards, target) {
    return handValue(cards, target) > target;
  }

  function isRun(cards, target) {
    return cards.length === 2 && handValue(cards, target) === target;
  }

  function roundScore(cards, config, outcome) {
    const cfg = configFromGame(config);
    if (outcome === "bust") return 0;
    const total = handValue(cards, cfg.target);
    if (outcome === "run" || isRun(cards, cfg.target)) {
      return total + cfg.runBonus;
    }
    return total;
  }

  function createSession(game, rng) {
    const config = configFromGame(game);
    const random = rng || defaultRng();
    return {
      config,
      rng: random,
      deck: shuffle(createDeck(), random),
      discard: [],
      hand: [],
      score: 0,
      rounds: 0,
      status: "idle", // idle | playing | bust | stay | run
      lastRoundScore: 0,
      lastOutcome: null,
      reshuffles: 0,
    };
  }

  function maybeReshuffle(session) {
    const { thinDeck } = session.config;
    if (session.deck.length > 0 && session.deck.length >= thinDeck) return false;
    const pile = session.deck.concat(session.discard);
    session.discard = [];
    if (pile.length === 0) {
      session.deck = shuffle(createDeck(), session.rng);
    } else {
      session.deck = shuffle(pile, session.rng);
    }
    session.reshuffles += 1;
    return true;
  }

  function draw(session) {
    if (session.deck.length === 0) {
      maybeReshuffle(session);
    }
    if (session.deck.length === 0) {
      throw new Error("empty deck");
    }
    return session.deck.pop();
  }

  function discardHand(session) {
    if (session.hand.length) {
      session.discard.push.apply(session.discard, session.hand);
      session.hand = [];
    }
  }

  function settle(session, outcome) {
    const points = roundScore(session.hand, session.config, outcome);
    session.lastRoundScore = points;
    session.lastOutcome = outcome;
    session.score += points;
    session.rounds += 1;
    session.status = outcome;
    return session;
  }

  function deal(session) {
    discardHand(session);
    session.lastRoundScore = 0;
    session.lastOutcome = null;
    maybeReshuffle(session);
    const n = session.config.startingCards;
    for (let i = 0; i < n; i++) {
      session.hand.push(draw(session));
    }
    if (isRun(session.hand, session.config.target)) {
      return settle(session, "run");
    }
    session.status = "playing";
    return session;
  }

  function hit(session) {
    if (session.status !== "playing") {
      throw new Error("hit only while playing");
    }
    session.hand.push(draw(session));
    if (isBust(session.hand, session.config.target)) {
      return settle(session, "bust");
    }
    return session;
  }

  function stay(session) {
    if (session.status !== "playing") {
      throw new Error("stay only while playing");
    }
    return settle(session, "stay");
  }

  function snapshot(session) {
    const target = session.config.target;
    return {
      status: session.status,
      score: session.score,
      rounds: session.rounds,
      lastRoundScore: session.lastRoundScore,
      lastOutcome: session.lastOutcome,
      hand: session.hand.map(function (c) {
        return { rank: c.rank, suit: c.suit };
      }),
      total: handValue(session.hand, target),
      deckCount: session.deck.length,
      discardCount: session.discard.length,
      reshuffles: session.reshuffles,
      target: target,
      runBonus: session.config.runBonus,
      type: session.config.type,
    };
  }

  function copyCard(card) {
    return { rank: card.rank, suit: card.suit };
  }

  function drawIncomingColumns(session) {
    if (session.deck.length === 0) {
      session.incoming = null;
      session.status = "done";
      return session;
    }
    session.incoming = session.deck.pop();
    return session;
  }

  function createColumnsSession(game, rng) {
    const config = configFromColumnsGame(game);
    const random = rng || defaultRng();
    const columns = [];
    for (let i = 0; i < config.columns; i++) {
      columns.push([]);
    }
    const session = {
      config,
      rng: random,
      deck: shuffle(createDeck(), random),
      discard: [],
      columns: columns,
      incoming: null,
      skipsLeft: config.skips,
      score: 0,
      clears: 0,
      busts: 0,
      status: "playing",
      lastEvent: null,
    };
    drawIncomingColumns(session);
    return session;
  }

  function placeColumn(session, columnIndex) {
    if (session.status !== "playing") {
      throw new Error("place only while playing");
    }
    if (!session.incoming) {
      throw new Error("no incoming card");
    }
    const n = session.columns.length;
    const i = Number(columnIndex);
    if (!Number.isInteger(i) || i < 0 || i >= n) {
      throw new Error("bad column");
    }
    const card = session.incoming;
    session.incoming = null;
    const col = session.columns[i];
    const next = col.concat(card);
    const target = session.config.target;
    const total = handValue(next, target);

    if (total > target) {
      session.discard.push.apply(session.discard, col);
      session.discard.push(card);
      session.columns[i] = [];
      const penalty = session.config.bustPenalty;
      session.score -= penalty;
      session.busts += 1;
      session.lastEvent = {
        kind: "bust",
        column: i,
        points: -penalty,
      };
    } else if (total === target) {
      session.discard.push.apply(session.discard, next);
      session.columns[i] = [];
      const points = target + session.config.clearBonus;
      session.score += points;
      session.clears += 1;
      session.lastEvent = {
        kind: "clear",
        column: i,
        total: total,
        points: points,
        reason: "target",
      };
    } else if (next.length >= session.config.maxCards) {
      session.discard.push.apply(session.discard, next);
      session.columns[i] = [];
      session.score += total;
      session.clears += 1;
      session.lastEvent = {
        kind: "clear",
        column: i,
        total: total,
        points: total,
        reason: "maxCards",
      };
    } else {
      session.columns[i] = next;
      session.lastEvent = {
        kind: "place",
        column: i,
        total: total,
      };
    }

    drawIncomingColumns(session);
    return session;
  }

  function skipColumn(session) {
    if (session.status !== "playing") {
      throw new Error("skip only while playing");
    }
    if (session.skipsLeft <= 0) {
      throw new Error("no skips left");
    }
    if (!session.incoming) {
      throw new Error("no incoming card");
    }
    session.discard.push(session.incoming);
    session.incoming = null;
    session.skipsLeft -= 1;
    session.lastEvent = { kind: "skip" };
    drawIncomingColumns(session);
    return session;
  }

  function snapshotColumns(session) {
    const target = session.config.target;
    return {
      type: session.config.type,
      status: session.status,
      score: session.score,
      clears: session.clears,
      busts: session.busts,
      skipsLeft: session.skipsLeft,
      incoming: session.incoming ? copyCard(session.incoming) : null,
      columns: session.columns.map(function (col) {
        return {
          cards: col.map(copyCard),
          total: handValue(col, target),
        };
      }),
      deckCount: session.deck.length,
      discardCount: session.discard.length,
      lastEvent: session.lastEvent,
      target: target,
      piece: session.config.piece,
      maxCards: session.config.maxCards,
      bustPenalty: session.config.bustPenalty,
      clearBonus: session.config.clearBonus,
    };
  }

  const DEFAULT_RUNLANES = Object.freeze({
    type: "runlanes",
    target: 21,
    columns: 5,
    skips: 1,
    runBonus: 0,
    perfect: 105,
    piece: "card",
  });

  function configFromRunLanesGame(game) {
    const src = game && typeof game === "object" ? game : {};
    const columns = Math.max(1, Math.floor(num(src.columns, DEFAULT_RUNLANES.columns)));
    const target = num(src.target, DEFAULT_RUNLANES.target);
    return {
      type: "runlanes",
      target: target,
      columns: columns,
      skips: Math.max(0, Math.floor(num(src.skips, DEFAULT_RUNLANES.skips))),
      runBonus: num(src.runBonus, DEFAULT_RUNLANES.runBonus),
      perfect: num(src.perfect, target * columns),
      piece: src.piece === "mug" ? "mug" : DEFAULT_RUNLANES.piece,
    };
  }

  function emptyRunLane() {
    return { cards: [], locked: false, outcome: "open" };
  }

  function makeRunLanes(count) {
    const columns = [];
    for (let i = 0; i < count; i++) {
      columns.push(emptyRunLane());
    }
    return columns;
  }

  function lanePoints(col, config) {
    if (!col || col.outcome === "bust") return 0;
    const total = handValue(col.cards, config.target);
    if (col.outcome === "run" || isRun(col.cards, config.target)) {
      return total + config.runBonus;
    }
    return total;
  }

  function roundLanesScore(session) {
    return session.columns.reduce(function (sum, col) {
      return sum + lanePoints(col, session.config);
    }, 0);
  }

  function allRunLanesLocked(session) {
    return session.columns.every(function (col) {
      return col.locked;
    });
  }

  function lockOpenRunLanes(session) {
    session.columns.forEach(function (col) {
      if (!col.locked) {
        col.locked = true;
        col.outcome = "stay";
      }
    });
  }

  function finishRunLanesRound(session) {
    if (session.status === "done") return session;
    if (!allRunLanesLocked(session)) return session;
    session.status = "done";
    if (session.incoming) {
      session.discard.push(session.incoming);
      session.incoming = null;
    }
    session.lastRoundScore = roundLanesScore(session);
    session.sessionScore += session.lastRoundScore;
    session.rounds += 1;
    return session;
  }

  function drawIncomingRunLanes(session) {
    if (allRunLanesLocked(session)) {
      finishRunLanesRound(session);
      session.incoming = null;
      return session;
    }
    if (session.deck.length === 0) {
      lockOpenRunLanes(session);
      finishRunLanesRound(session);
      session.incoming = null;
      return session;
    }
    session.incoming = session.deck.pop();
    return session;
  }

  function createRunLanesSession(game, rng) {
    const config = configFromRunLanesGame(game);
    const random = rng || defaultRng();
    const session = {
      config,
      rng: random,
      deck: shuffle(createDeck(), random),
      discard: [],
      columns: makeRunLanes(config.columns),
      incoming: null,
      skipsLeft: config.skips,
      score: 0,
      sessionScore: 0,
      rounds: 0,
      lastRoundScore: 0,
      status: "playing",
      lastEvent: null,
    };
    drawIncomingRunLanes(session);
    return session;
  }

  function requireRunLane(session, columnIndex, action) {
    if (session.status !== "playing") {
      throw new Error(action + " only while playing");
    }
    const i = Number(columnIndex);
    if (!Number.isInteger(i) || i < 0 || i >= session.columns.length) {
      throw new Error("bad column");
    }
    return i;
  }

  function placeRunLane(session, columnIndex) {
    const i = requireRunLane(session, columnIndex, "place");
    if (!session.incoming) {
      throw new Error("no incoming card");
    }
    const col = session.columns[i];
    if (col.locked) {
      throw new Error("lane locked");
    }
    const card = session.incoming;
    session.incoming = null;
    const next = col.cards.concat(card);
    const target = session.config.target;
    const total = handValue(next, target);
    col.cards = next;

    if (total > target) {
      col.locked = true;
      col.outcome = "bust";
      session.lastEvent = { kind: "bust", column: i };
    } else if (total === target) {
      col.locked = true;
      const run = next.length === 2;
      col.outcome = run ? "run" : "21";
      session.lastEvent = {
        kind: col.outcome,
        column: i,
        total: total,
      };
    } else {
      col.locked = false;
      col.outcome = "open";
      session.lastEvent = { kind: "place", column: i, total: total };
    }

    drawIncomingRunLanes(session);
    return session;
  }

  function stayRunLane(session, columnIndex) {
    const i = requireRunLane(session, columnIndex, "stay");
    const col = session.columns[i];
    if (col.locked) {
      throw new Error("lane locked");
    }
    col.locked = true;
    col.outcome = "stay";
    session.lastEvent = {
      kind: "stay",
      column: i,
      total: handValue(col.cards, session.config.target),
    };
    if (allRunLanesLocked(session)) {
      finishRunLanesRound(session);
    }
    return session;
  }

  function skipRunLane(session) {
    if (session.status !== "playing") {
      throw new Error("skip only while playing");
    }
    if (session.skipsLeft <= 0) {
      throw new Error("no skips left");
    }
    if (!session.incoming) {
      throw new Error("no incoming card");
    }
    session.discard.push(session.incoming);
    session.incoming = null;
    session.skipsLeft -= 1;
    session.lastEvent = { kind: "skip" };
    drawIncomingRunLanes(session);
    return session;
  }

  function dealRunLanes(session) {
    session.columns = makeRunLanes(session.config.columns);
    session.deck = shuffle(createDeck(), session.rng);
    session.discard = [];
    session.incoming = null;
    session.skipsLeft = session.config.skips;
    session.status = "playing";
    session.lastEvent = null;
    session.lastRoundScore = 0;
    drawIncomingRunLanes(session);
    return session;
  }

  function snapshotRunLanes(session) {
    const target = session.config.target;
    const columns = session.columns.map(function (col) {
      return {
        cards: col.cards.map(copyCard),
        total: handValue(col.cards, target),
        locked: !!col.locked,
        outcome: col.outcome,
      };
    });
    const score = roundLanesScore(session);
    return {
      type: session.config.type,
      status: session.status,
      incoming: session.incoming ? copyCard(session.incoming) : null,
      columns: columns,
      skipsLeft: session.skipsLeft,
      score: score,
      perfect: session.config.perfect,
      deckCount: session.deck.length,
      discardCount: session.discard.length,
      rounds: session.rounds,
      sessionScore: session.sessionScore,
      lastRoundScore: session.lastRoundScore,
      lastEvent: session.lastEvent,
      target: target,
      piece: session.config.piece,
      runBonus: session.config.runBonus,
    };
  }

  return {
    SUITS,
    RANKS,
    DEFAULT_RUN21,
    DEFAULT_COLUMNS21,
    DEFAULT_RUNLANES,
    configFromGame,
    configFromColumnsGame,
    configFromRunLanesGame,
    createDeck,
    shuffle,
    pipValue,
    handValue,
    isBust,
    isRun,
    roundScore,
    createSession,
    maybeReshuffle,
    draw,
    deal,
    hit,
    stay,
    snapshot,
    createColumnsSession,
    placeColumn,
    skipColumn,
    snapshotColumns,
    createRunLanesSession,
    placeRunLane,
    stayRunLane,
    skipRunLane,
    dealRunLanes,
    snapshotRunLanes,
  };
});
