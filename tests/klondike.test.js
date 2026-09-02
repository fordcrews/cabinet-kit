"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/solitaire.js");
const def = require("../games/solitaire.json");

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

function face(rank, suit, up) {
  return { rank: rank, suit: suit, faceUp: up !== false };
}

function allCards(session) {
  const cards = [];
  session.tableau.forEach(function (col) {
    col.forEach(function (c) {
      cards.push(c);
    });
  });
  session.stock.forEach(function (c) {
    cards.push(c);
  });
  session.waste.forEach(function (c) {
    cards.push(c);
  });
  return cards;
}

test("Solitaire JSON id type title is Klondike stacks", () => {
  assert.equal(def.id, "solitaire");
  assert.equal(def.type, "klondike");
  assert.equal(def.title, "Solitaire");
  assert.equal(def.moves, "run");
  assert.notEqual(def.moves, "single");
});

test("standard 52 including K and Q", () => {
  const session = E.createKlondikeSession(def, seedRng(7));
  const cards = allCards(session);
  assert.equal(cards.length, 52);
  const ranks = {};
  cards.forEach(function (c) {
    ranks[c.rank] = (ranks[c.rank] || 0) + 1;
  });
  assert.equal(ranks.K, 4);
  assert.equal(ranks.Q, 4);
  assert.equal(ranks.J, 4);
  assert.equal(ranks.A, 4);
  assert.equal(session.tableau.length, 7);
  const dealt = session.tableau.reduce(function (n, col) {
    return n + col.length;
  }, 0);
  assert.equal(dealt, 28);
  assert.equal(session.stock.length, 24);
  session.tableau.forEach(function (col, i) {
    assert.equal(col.length, i + 1);
    assert.equal(col[col.length - 1].faceUp, true);
    for (let n = 0; n < col.length - 1; n++) {
      assert.equal(col[n].faceUp, false);
    }
  });
});

test("King only on empty column, not Jack", () => {
  assert.equal(E.klondikeCanPlace(card("K", "♠"), { kind: "tableau", top: null }), true);
  assert.equal(E.klondikeCanPlace(card("J", "♠"), { kind: "tableau", top: null }), false);
  assert.equal(E.klondikeCanPlace(card("10", "♠"), { kind: "tableau", top: null }), false);
  assert.equal(E.klondikeCanPlace(card("A", "♥"), { kind: "tableau", top: null }), false);
  assert.equal(E.klondikeCanPlace(card("Q", "♥"), { kind: "tableau", top: null }), false);
});

test("alt-color descending including Q and K", () => {
  const kingSpade = { kind: "tableau", top: card("K", "♠") };
  assert.equal(E.klondikeCanPlace(card("Q", "♥"), kingSpade), true);
  assert.equal(E.klondikeCanPlace(card("Q", "♦"), kingSpade), true);
  assert.equal(E.klondikeCanPlace(card("Q", "♠"), kingSpade), false);
  assert.equal(E.klondikeCanPlace(card("Q", "♣"), kingSpade), false);
  assert.equal(E.klondikeCanPlace(card("J", "♥"), kingSpade), false);
  assert.equal(
    E.klondikeCanPlace(card("10", "♥"), { kind: "tableau", top: card("J", "♠") }),
    true
  );
  assert.equal(
    E.klondikeCanPlace(card("9", "♠"), { kind: "tableau", top: card("10", "♥") }),
    true
  );
  assert.equal(
    E.klondikeCanPlace(card("A", "♦"), { kind: "tableau", top: card("2", "♣") }),
    true
  );
});

test("foundation A then 2 same suit through King", () => {
  assert.equal(
    E.klondikeCanPlace(card("A", "♥"), { kind: "foundation", suit: "♥", count: 0 }),
    true
  );
  assert.equal(
    E.klondikeCanPlace(card("2", "♥"), { kind: "foundation", suit: "♥", count: 1 }),
    true
  );
  assert.equal(
    E.klondikeCanPlace(card("2", "♥"), { kind: "foundation", suit: "♥", count: 0 }),
    false
  );
  assert.equal(
    E.klondikeCanPlace(card("A", "♠"), { kind: "foundation", suit: "♥", count: 0 }),
    false
  );
  assert.equal(
    E.klondikeCanPlace(card("K", "♥"), { kind: "foundation", suit: "♥", count: 12 }),
    true
  );
  assert.equal(
    E.klondikeCanPlace(card("A", "♥"), { kind: "foundation", suit: "♥", count: 13 }),
    false
  );
});

test("stack move of 10♥-9♠ onto J♠", () => {
  const session = E.createKlondikeSession(def, seedRng(3));
  session.tableau = [
    [face("10", "♥", true), face("9", "♠", true)],
    [face("J", "♠", true)],
    [],
    [],
    [],
    [],
    [],
  ];
  session.stock = [];
  session.waste = [];
  session.selected = null;
  E.tapKlondike(session, { kind: "tableau", col: 0, index: 0 });
  assert.equal(session.selected.kind, "tableau");
  assert.equal(session.selected.index, 0);
  E.tapKlondike(session, { kind: "tableau", col: 1 });
  assert.equal(session.tableau[0].length, 0);
  assert.equal(session.tableau[1].length, 3);
  assert.equal(session.tableau[1][1].rank, "10");
  assert.equal(session.tableau[1][1].suit, "♥");
  assert.equal(session.tableau[1][2].rank, "9");
  assert.equal(session.tableau[1][2].suit, "♠");
  assert.equal(session.selected, null);
});

test("King run can land on an empty column", () => {
  const session = E.createKlondikeSession(def, seedRng(4));
  session.tableau = [
    [face("K", "♦", true), face("Q", "♠", true)],
    [face("9", "♠", true)],
    [],
    [],
    [],
    [],
    [],
  ];
  session.selected = null;
  E.tapKlondike(session, { kind: "tableau", col: 0, index: 0 });
  E.tapKlondike(session, { kind: "tableau", col: 2 });
  assert.equal(session.tableau[2].length, 2);
  assert.equal(session.tableau[2][0].rank, "K");
  assert.equal(session.tableau[0].length, 0);
});

test("non-King cannot move onto empty column via tap", () => {
  const session = E.createKlondikeSession(def, seedRng(5));
  session.waste = [card("10", "♥")];
  session.tableau = [[], [], [], [], [], [], []];
  session.selected = null;
  E.tapKlondike(session, { kind: "waste" });
  E.tapKlondike(session, { kind: "tableau", col: 0 });
  assert.equal(session.tableau[0].length, 0);
  assert.equal(session.waste.length, 1);
  assert.equal(session.lastEvent.kind, "illegal");
});

test("tableau top to foundation A then 2", () => {
  const session = E.createKlondikeSession(def, seedRng(6));
  session.tableau = [
    [face("A", "♥", true)],
    [face("2", "♥", true)],
    [],
    [],
    [],
    [],
    [],
  ];
  session.stock = [];
  session.waste = [];
  session.foundations = { "♠": 0, "♥": 0, "♦": 0, "♣": 0 };
  session.foundationTops = { "♠": null, "♥": null, "♦": null, "♣": null };
  session.selected = null;
  session.score = 0;
  E.tapKlondike(session, { kind: "tableau", col: 0 });
  E.tapKlondike(session, { kind: "foundation", suit: "♥" });
  assert.equal(session.foundations["♥"], 1);
  assert.equal(session.score, 10);
  assert.equal(session.tableau[0].length, 0);
  E.tapKlondike(session, { kind: "tableau", col: 1 });
  E.tapKlondike(session, { kind: "foundation", suit: "♥" });
  assert.equal(session.foundations["♥"], 2);
  assert.equal(session.foundationTops["♥"].rank, "2");
  assert.equal(session.score, 20);
});

test("uncovering a face-down tableau card flips it", () => {
  const session = E.createKlondikeSession(def, seedRng(8));
  session.tableau = [
    [face("9", "♣", false), face("A", "♠", true)],
    [],
    [],
    [],
    [],
    [],
    [],
  ];
  session.foundations = { "♠": 0, "♥": 0, "♦": 0, "♣": 0 };
  session.foundationTops = { "♠": null, "♥": null, "♦": null, "♣": null };
  session.selected = null;
  E.tapKlondike(session, { kind: "tableau", col: 0 });
  E.tapKlondike(session, { kind: "foundation", suit: "♠" });
  assert.equal(session.tableau[0].length, 1);
  assert.equal(session.tableau[0][0].faceUp, true);
  assert.equal(session.tableau[0][0].rank, "9");
});

test("draw one to waste and recycle when stock empty", () => {
  const session = E.createKlondikeSession(def, seedRng(9));
  session.stock = [card("3", "♣"), card("4", "♦")];
  session.waste = [];
  E.tapKlondike(session, { kind: "stock" });
  assert.equal(session.waste.length, 1);
  assert.equal(session.waste[0].rank, "4");
  assert.equal(session.stock.length, 1);
  E.tapKlondike(session, { kind: "stock" });
  assert.equal(session.stock.length, 0);
  assert.equal(session.waste.length, 2);
  E.tapKlondike(session, { kind: "stock" });
  assert.equal(session.lastEvent.kind, "recycle");
  assert.equal(session.waste.length, 0);
  assert.equal(session.stock.length, 2);
});

test("snapshot reports stack moves and 52 home", () => {
  const session = E.createKlondikeSession(def, seedRng(9));
  const snap = E.snapshotKlondike(session);
  assert.equal(snap.type, "klondike");
  assert.equal(snap.moves, "run");
  assert.notEqual(snap.moves, "single");
  assert.equal(snap.total, 52);
  assert.equal(snap.home, 0);
  assert.equal(snap.tableau.length, 7);
  assert.equal(snap.stockCount, 24);
  assert.equal(snap.foundations["♥"].max, 13);
  assert.equal(snap.foundations["♥"].next, "A");
});
