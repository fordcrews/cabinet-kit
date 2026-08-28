"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/solitaire.js");
const powerDef = require("../games/powersol.json");

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

function emptyTableau() {
  const cols = [];
  for (let i = 0; i < 7; i++) {
    cols.push([]);
  }
  return cols;
}

function primed(extra) {
  const game = Object.assign({}, powerDef, extra || {});
  const session = E.createPowerSession(game, seedRng(7));
  session.tableau = emptyTableau();
  session.stocks = [[], [], []];
  session.foundations = { "♠": [], "♥": [], "♦": [], "♣": [] };
  session.selected = null;
  session.score = 0;
  session.status = "playing";
  session.lastEvent = null;
  return session;
}

test("Power Solitaire JSON id type title", () => {
  assert.equal(powerDef.id, "powersol");
  assert.equal(powerDef.type, "powersol");
  assert.equal(powerDef.title, "Power Solitaire");
  assert.equal(powerDef.foundationScore, 10);
  assert.equal(powerDef.columns, 7);
  assert.equal(powerDef.decks, 3);
});

test("no K/Q in decks", () => {
  const deck = E.createPowerDeck();
  assert.equal(deck.length, 44);
  for (const c of deck) {
    assert.notEqual(c.rank, "K");
    assert.notEqual(c.rank, "Q");
  }
  const session = E.createPowerSession(powerDef, seedRng(3));
  const ranks = new Set();
  for (const col of session.tableau) {
    for (const c of col) ranks.add(c.rank);
  }
  for (const pile of session.stocks) {
    for (const c of pile) ranks.add(c.rank);
  }
  assert.equal(ranks.has("K"), false);
  assert.equal(ranks.has("Q"), false);
  assert.ok(ranks.has("J"));
  assert.ok(ranks.has("A"));
  const total =
    session.tableau.reduce(function (n, col) {
      return n + col.length;
    }, 0) +
    session.stocks.reduce(function (n, pile) {
      return n + pile.length;
    }, 0);
  assert.equal(total, 132);
  const snap = E.snapshotPower(session);
  assert.equal(snap.type, "powersol");
  assert.equal(snap.foundationTotal, 0);
  assert.equal(snap.winAt, 132);
});

test("Jack only on empty column", () => {
  const dest = { kind: "tableau", cards: [] };
  assert.equal(E.powerCanPlace(card("J", "♠"), dest), true);
  assert.equal(E.powerCanPlace(card("10", "♥"), dest), false);
  assert.equal(E.powerCanPlace(card("A", "♦"), dest), false);
  const session = primed();
  session.tableau[0] = [];
  session.tableau[1] = [{ rank: "10", suit: "♥", faceUp: true }];
  session.selected = { kind: "tableau", col: 1, depth: 0 };
  E.tapPower(session, { kind: "tableau", col: 0 });
  assert.equal(session.tableau[0].length, 0);
  assert.equal(session.tableau[1].length, 1);
  session.tableau[1] = [{ rank: "J", suit: "♠", faceUp: true }];
  session.selected = { kind: "tableau", col: 1, depth: 0 };
  E.tapPower(session, { kind: "tableau", col: 0 });
  assert.equal(session.tableau[0].length, 1);
  assert.equal(session.tableau[0][0].rank, "J");
  assert.equal(session.tableau[1].length, 0);
});

test("alt-color descending", () => {
  const black10 = { kind: "tableau", cards: [card("10", "♠")] };
  assert.equal(E.powerCanPlace(card("9", "♥"), black10), true);
  assert.equal(E.powerCanPlace(card("9", "♦"), black10), true);
  assert.equal(E.powerCanPlace(card("9", "♣"), black10), false);
  assert.equal(E.powerCanPlace(card("8", "♥"), black10), false);
  assert.equal(E.powerCanPlace(card("J", "♥"), black10), false);
  const redJ = { kind: "tableau", cards: [card("J", "♥")] };
  assert.equal(E.powerCanPlace(card("10", "♠"), redJ), true);
  assert.equal(E.powerCanPlace(card("10", "♥"), redJ), false);
});

test("foundation A then 2 same suit", () => {
  const empty = { kind: "foundation", suit: "♠", cards: [] };
  assert.equal(E.powerCanPlace(card("A", "♠"), empty), true);
  assert.equal(E.powerCanPlace(card("A", "♥"), empty), false);
  assert.equal(E.powerCanPlace(card("2", "♠"), empty), false);
  const one = { kind: "foundation", suit: "♠", cards: [card("A", "♠")] };
  assert.equal(E.powerCanPlace(card("2", "♠"), one), true);
  assert.equal(E.powerCanPlace(card("2", "♥"), one), false);
  assert.equal(E.powerCanPlace(card("3", "♠"), one), false);
  const session = primed();
  session.tableau[0] = [{ rank: "A", suit: "♦", faceUp: true }];
  session.selected = { kind: "tableau", col: 0, depth: 0 };
  E.tapPower(session, { kind: "foundation", suit: "♦" });
  assert.equal(session.foundations["♦"].length, 1);
  assert.equal(session.foundations["♦"][0].rank, "A");
  assert.equal(session.score, 10);
  session.tableau[1] = [{ rank: "2", suit: "♦", faceUp: true }];
  session.selected = { kind: "tableau", col: 1, depth: 0 };
  E.tapPower(session, { kind: "foundation", suit: "♦" });
  assert.equal(session.foundations["♦"].length, 2);
  assert.equal(session.foundations["♦"][1].rank, "2");
  assert.equal(session.score, 20);
});

test("stock tap moves to legal tableau", () => {
  const session = primed();
  session.tableau[0] = [{ rank: "10", suit: "♠", faceUp: true }];
  session.stocks[0] = [{ rank: "9", suit: "♥", faceUp: true }];
  E.tapPower(session, { kind: "stock", pile: 0 });
  assert.equal(session.selected.kind, "stock");
  assert.equal(session.selected.pile, 0);
  E.tapPower(session, { kind: "tableau", col: 0 });
  assert.equal(session.tableau[0].length, 2);
  assert.equal(session.tableau[0][1].rank, "9");
  assert.equal(session.tableau[0][1].suit, "♥");
  assert.equal(session.stocks[0].length, 0);
  assert.equal(session.selected, null);
  assert.equal(session.lastEvent.kind, "move");
});

test("stock tap does not move to illegal tableau", () => {
  const session = primed();
  session.tableau[0] = [{ rank: "10", suit: "♠", faceUp: true }];
  session.stocks[0] = [{ rank: "9", suit: "♣", faceUp: true }];
  E.tapPower(session, { kind: "stock", pile: 0 });
  E.tapPower(session, { kind: "tableau", col: 0 });
  assert.equal(session.tableau[0].length, 1);
  assert.equal(session.stocks[0].length, 1);
  assert.equal(session.selected, null);
});

test("POWER_RANKS has no K or Q and Jack is high", () => {
  assert.deepEqual(E.POWER_RANKS, ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J"]);
});
