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

function allPowerCards(session) {
  const cards = [];
  session.tableau.forEach(function (col) {
    col.forEach(function (c) {
      cards.push(c);
    });
  });
  session.stocks.forEach(function (pile) {
    pile.forEach(function (c) {
      cards.push(c);
    });
  });
  return cards;
}

function face(rank, suit, up) {
  return { rank: rank, suit: suit, faceUp: up !== false };
}

test("Power Solitaire JSON id type title", () => {
  assert.equal(powerDef.id, "powersol");
  assert.equal(powerDef.type, "powersol");
  assert.equal(powerDef.title, "Power Solitaire");
  assert.equal(powerDef.moves, "single");
});

test("no K/Q in decks", () => {
  const session = E.createPowerSession(powerDef, seedRng(7));
  const cards = allPowerCards(session);
  assert.equal(cards.length, 132);
  cards.forEach(function (c) {
    assert.notEqual(c.rank, "K");
    assert.notEqual(c.rank, "Q");
    assert.ok(E.POWER_RANKS.indexOf(c.rank) >= 0);
  });
  assert.equal(session.tableau.length, 7);
  const dealt = session.tableau.reduce(function (n, col) {
    return n + col.length;
  }, 0);
  assert.equal(dealt, 28);
  const stockN = session.stocks.reduce(function (n, p) {
    return n + p.length;
  }, 0);
  assert.equal(stockN, 104);
  assert.equal(session.stocks.length, 3);
});

test("Jack only on empty column", () => {
  assert.equal(
    E.powerCanPlace(card("J", "♠"), { kind: "tableau", top: null }),
    true
  );
  assert.equal(
    E.powerCanPlace(card("10", "♠"), { kind: "tableau", top: null }),
    false
  );
  assert.equal(
    E.powerCanPlace(card("A", "♥"), { kind: "tableau", top: null }),
    false
  );
});

test("alt-color descending", () => {
  const jackSpade = { kind: "tableau", top: card("J", "♠") };
  assert.equal(E.powerCanPlace(card("10", "♥"), jackSpade), true);
  assert.equal(E.powerCanPlace(card("10", "♦"), jackSpade), true);
  assert.equal(E.powerCanPlace(card("10", "♠"), jackSpade), false);
  assert.equal(E.powerCanPlace(card("10", "♣"), jackSpade), false);
  assert.equal(E.powerCanPlace(card("9", "♥"), jackSpade), false);
  assert.equal(
    E.powerCanPlace(card("9", "♠"), { kind: "tableau", top: card("10", "♥") }),
    true
  );
  assert.equal(
    E.powerCanPlace(card("A", "♦"), { kind: "tableau", top: card("2", "♣") }),
    true
  );
});

test("foundation A then 2 same suit", () => {
  assert.equal(
    E.powerCanPlace(card("A", "♥"), { kind: "foundation", suit: "♥", count: 0 }),
    true
  );
  assert.equal(
    E.powerCanPlace(card("2", "♥"), { kind: "foundation", suit: "♥", count: 1 }),
    true
  );
  assert.equal(
    E.powerCanPlace(card("2", "♥"), { kind: "foundation", suit: "♥", count: 0 }),
    false
  );
  assert.equal(
    E.powerCanPlace(card("A", "♠"), { kind: "foundation", suit: "♥", count: 0 }),
    false
  );
  assert.equal(
    E.powerCanPlace(card("J", "♥"), { kind: "foundation", suit: "♥", count: 10 }),
    true
  );
  assert.equal(
    E.powerCanPlace(card("A", "♥"), { kind: "foundation", suit: "♥", count: 11 }),
    true
  );
});

test("stock tap moves to legal tableau", () => {
  const session = E.createPowerSession(powerDef, seedRng(3));
  session.status = "playing";
  session.selected = null;
  session.score = 0;
  session.stocks = [[card("10", "♥")], [], []];
  session.tableau = [
    [face("J", "♠", true)],
    [],
    [],
    [],
    [],
    [],
    [],
  ];
  E.tapPower(session, { kind: "stock", pile: 0 });
  assert.equal(session.selected.kind, "stock");
  assert.equal(session.selected.pile, 0);
  E.tapPower(session, { kind: "tableau", col: 0 });
  assert.equal(session.tableau[0].length, 2);
  assert.equal(session.tableau[0][1].rank, "10");
  assert.equal(session.tableau[0][1].suit, "♥");
  assert.equal(session.stocks[0].length, 0);
  assert.equal(session.selected, null);
  const snap = E.snapshotPower(session);
  assert.equal(snap.tableau[0][1].rank, "10");
  assert.equal(snap.stocks[0].count, 0);
});

test("Jack from stock can land on an empty column", () => {
  const session = E.createPowerSession(powerDef, seedRng(4));
  session.stocks = [[card("J", "♦")], [], []];
  session.tableau = [[face("9", "♠", true)], [], [], [], [], [], []];
  session.selected = null;
  E.tapPower(session, { kind: "stock", pile: 0 });
  E.tapPower(session, { kind: "tableau", col: 1 });
  assert.equal(session.tableau[1].length, 1);
  assert.equal(session.tableau[1][0].rank, "J");
  assert.equal(session.stocks[0].length, 0);
});

test("non-Jack cannot move onto empty column via tap", () => {
  const session = E.createPowerSession(powerDef, seedRng(5));
  session.stocks = [[card("10", "♥")], [], []];
  session.tableau = [[], [], [], [], [], [], []];
  session.selected = null;
  E.tapPower(session, { kind: "stock", pile: 0 });
  E.tapPower(session, { kind: "tableau", col: 0 });
  assert.equal(session.tableau[0].length, 0);
  assert.equal(session.stocks[0].length, 1);
});

test("tableau top to foundation A then 2", () => {
  const session = E.createPowerSession(powerDef, seedRng(6));
  session.tableau = [
    [face("A", "♥", true)],
    [face("2", "♥", true)],
    [],
    [],
    [],
    [],
    [],
  ];
  session.stocks = [[], [], []];
  session.foundations = { "♠": 0, "♥": 0, "♦": 0, "♣": 0 };
  session.foundationTops = { "♠": null, "♥": null, "♦": null, "♣": null };
  session.selected = null;
  session.score = 0;
  E.tapPower(session, { kind: "tableau", col: 0 });
  E.tapPower(session, { kind: "foundation", suit: "♥" });
  assert.equal(session.foundations["♥"], 1);
  assert.equal(session.score, 10);
  assert.equal(session.tableau[0].length, 0);
  E.tapPower(session, { kind: "tableau", col: 1 });
  E.tapPower(session, { kind: "foundation", suit: "♥" });
  assert.equal(session.foundations["♥"], 2);
  assert.equal(session.foundationTops["♥"].rank, "2");
  assert.equal(session.score, 20);
});

test("uncovering a face-down tableau card flips it", () => {
  const session = E.createPowerSession(powerDef, seedRng(8));
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
  E.tapPower(session, { kind: "tableau", col: 0 });
  E.tapPower(session, { kind: "foundation", suit: "♠" });
  assert.equal(session.tableau[0].length, 1);
  assert.equal(session.tableau[0][0].faceUp, true);
  assert.equal(session.tableau[0][0].rank, "9");
});

test("snapshot reports single-card moves and home progress", () => {
  const session = E.createPowerSession(powerDef, seedRng(9));
  const snap = E.snapshotPower(session);
  assert.equal(snap.type, "powersol");
  assert.equal(snap.moves, "single");
  assert.equal(snap.total, 132);
  assert.equal(snap.home, 0);
  assert.equal(snap.tableau.length, 7);
  assert.equal(snap.stocks.length, 3);
  assert.equal(snap.foundations["♥"].max, 33);
  assert.equal(snap.foundations["♥"].next, "A");
});
