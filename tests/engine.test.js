"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/engine.js");

function card(rank, suit) {
  return { rank, suit: suit || "♠" };
}

function seedRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("deck is 52 unique cards", () => {
  const deck = E.createDeck();
  assert.equal(deck.length, 52);
  const keys = new Set(deck.map((c) => c.rank + c.suit));
  assert.equal(keys.size, 52);
});

test("face cards are 10", () => {
  assert.equal(E.pipValue("J"), 10);
  assert.equal(E.pipValue("Q"), 10);
  assert.equal(E.pipValue("K"), 10);
  assert.equal(E.pipValue("10"), 10);
  assert.equal(E.pipValue("9"), 9);
});

test("ace counts 11 unless that busts", () => {
  assert.equal(E.handValue([card("A"), card("9")]), 20);
  assert.equal(E.handValue([card("A"), card("K")]), 21);
  assert.equal(E.handValue([card("A"), card("9"), card("5")]), 15);
  assert.equal(E.handValue([card("A"), card("A"), card("9")]), 21);
  assert.equal(E.handValue([card("A"), card("A"), card("A")]), 13);
});

test("ace vs a custom target still softens", () => {
  const cards = [card("A"), card("9"), card("5")];
  assert.equal(E.handValue(cards, 21), 15);
  assert.equal(E.handValue(cards, 30), 25);
});

test("bust is total over target", () => {
  assert.equal(E.isBust([card("K"), card("Q"), card("5")], 21), true);
  assert.equal(E.isBust([card("K"), card("9")], 21), false);
  assert.equal(E.isBust([card("A"), card("K")], 21), false);
});

test("two-card 21 is a Run", () => {
  assert.equal(E.isRun([card("A"), card("K")], 21), true);
  assert.equal(E.isRun([card("10"), card("7"), card("4")], 21), false);
  assert.equal(E.isRun([card("10"), card("9")], 21), false);
});

test("round score: bust 0, stay total, run total+bonus", () => {
  const cfg = { target: 21, runBonus: 5 };
  assert.equal(E.roundScore([card("K"), card("Q"), card("5")], cfg, "bust"), 0);
  assert.equal(E.roundScore([card("K"), card("9")], cfg, "stay"), 19);
  assert.equal(E.roundScore([card("A"), card("Q")], cfg, "run"), 26);
});

test("deal two cards; Run auto-settles with bonus", () => {
  const session = E.createSession({ type: "run21", target: 21, runBonus: 5, thinDeck: 0 }, seedRng(1));
  session.deck = [card("2"), card("3"), card("A"), card("K")];
  E.deal(session);
  assert.equal(session.status, "run");
  assert.equal(session.hand.length, 2);
  assert.equal(session.score, 26);
  assert.equal(session.rounds, 1);
  assert.equal(session.lastRoundScore, 26);
});

test("hit can bust and scores 0", () => {
  const session = E.createSession({ thinDeck: 0 }, seedRng(2));
  session.deck = [card("5"), card("Q"), card("K")];
  E.deal(session);
  assert.equal(session.status, "playing");
  assert.equal(E.handValue(session.hand), 20);
  E.hit(session);
  assert.equal(session.status, "bust");
  assert.equal(session.score, 0);
  assert.equal(session.lastRoundScore, 0);
  assert.equal(session.rounds, 1);
});

test("stay banks the hand total", () => {
  const session = E.createSession({ thinDeck: 0 }, seedRng(3));
  session.deck = [card("9"), card("8")];
  E.deal(session);
  E.stay(session);
  assert.equal(session.status, "stay");
  assert.equal(session.score, 17);
  assert.equal(session.rounds, 1);
});

test("hitting 21 is not a Run (Run is first two cards only)", () => {
  const session = E.createSession({ thinDeck: 0 }, seedRng(4));
  session.deck = [card("5"), card("6"), card("10")];
  E.deal(session);
  assert.equal(session.status, "playing");
  E.hit(session);
  assert.equal(session.status, "playing");
  assert.equal(E.handValue(session.hand), 21);
  E.stay(session);
  assert.equal(session.status, "stay");
  assert.equal(session.score, 21);
});

test("thin deck reshuffles leftover plus discard", () => {
  const session = E.createSession({ thinDeck: 10 }, seedRng(5));
  session.deck = [card("2"), card("3"), card("4")];
  session.discard = [card("5"), card("6"), card("7"), card("8"), card("9"), card("10"), card("J")];
  const did = E.maybeReshuffle(session);
  assert.equal(did, true);
  assert.equal(session.deck.length, 10);
  assert.equal(session.discard.length, 0);
  assert.equal(session.reshuffles, 1);
});

test("empty deck rebuilds from discard, or a fresh shoe if both empty", () => {
  const session = E.createSession({ thinDeck: 10 }, seedRng(6));
  session.deck = [];
  session.discard = [card("A"), card("2"), card("3")];
  const drawn = E.draw(session);
  assert.ok(drawn.rank);
  assert.equal(session.deck.length + 1 + 0, 3);
  assert.equal(session.discard.length, 0);

  const empty = E.createSession({ thinDeck: 10 }, seedRng(7));
  empty.deck = [];
  empty.discard = [];
  empty.hand = [];
  const card2 = E.draw(empty);
  assert.ok(card2.rank);
  assert.equal(empty.deck.length, 51);
});

test("deal after a finished round discards the old hand", () => {
  const session = E.createSession({ thinDeck: 0 }, seedRng(8));
  session.deck = [card("4"), card("5"), card("9"), card("8")];
  E.deal(session);
  E.stay(session);
  const firstHand = session.hand.slice();
  E.deal(session);
  assert.equal(session.status, "playing");
  assert.equal(session.hand.length, 2);
  assert.equal(session.discard.length, firstHand.length);
});

test("JSON knobs flow into session config", () => {
  const session = E.createSession({
    type: "run21",
    target: 21,
    runBonus: 7,
    thinDeck: 12,
    startingCards: 2,
  });
  assert.equal(session.config.runBonus, 7);
  assert.equal(session.config.thinDeck, 12);
  const snap = E.snapshot(session);
  assert.equal(snap.type, "run21");
  assert.equal(snap.target, 21);
});

test("shuffle is deterministic with a seeded rng", () => {
  const a = E.shuffle(E.createDeck(), seedRng(99));
  const b = E.shuffle(E.createDeck(), seedRng(99));
  assert.deepEqual(a, b);
  const c = E.shuffle(E.createDeck(), seedRng(100));
  assert.notDeepEqual(a, c);
});
