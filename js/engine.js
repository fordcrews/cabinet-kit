/**
 * Cabinet Kit — card engine (browser + Node).
 * v0 ships type "run21": draw toward a target without going over.
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

  return {
    SUITS,
    RANKS,
    DEFAULT_RUN21,
    configFromGame,
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
  };
});
