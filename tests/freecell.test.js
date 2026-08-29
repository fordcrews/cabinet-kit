"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/solitaire.js");
const def = require("../games/freecell.json");

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

function emptyCols(n) {
  const cols = [];
  for (let i = 0; i < n; i++) cols.push([]);
  return cols;
}

test("FreeCell JSON id type title", () => {
  assert.equal(def.id, "freecell");
  assert.equal(def.type, "freecell");
  assert.equal(def.title, "FreeCell");
});

test("deal 52 all face-up across 8 cascades", () => {
  const session = E.createFreeCellSession(def, seedRng(2));
  let n = 0;
  session.tableau.forEach(function (col) {
    n += col.length;
    col.forEach(function (c) {
      assert.equal(c.faceUp, true);
    });
  });
  session.cells.forEach(function (c) {
    if (c) n += 1;
  });
  assert.equal(n, 52);
  assert.equal(session.tableau.length, 8);
  assert.equal(session.cells.length, 4);
  session.cells.forEach(function (c) {
    assert.equal(c, null);
  });
  const lengths = session.tableau.map(function (col) {
    return col.length;
  }).sort();
  assert.deepEqual(lengths, [6, 6, 6, 6, 7, 7, 7, 7]);
});

test("free cell holds one", () => {
  const session = E.createFreeCellSession(def, seedRng(3));
  session.tableau = emptyCols(8);
  session.tableau[0] = [face("A", "♠")];
  session.cells = [null, null, null, null];
  session.selected = null;
  E.tapFreeCell(session, { kind: "tableau", col: 0 });
  E.tapFreeCell(session, { kind: "cell", i: 0 });
  assert.equal(session.cells[0].rank, "A");
  assert.equal(session.tableau[0].length, 0);
});

test("illegal double-fill of a free cell", () => {
  const session = E.createFreeCellSession(def, seedRng(4));
  session.tableau = emptyCols(8);
  session.tableau[0] = [face("5", "♥")];
  session.cells = [face("9", "♣"), null, null, null];
  session.selected = null;
  E.tapFreeCell(session, { kind: "tableau", col: 0 });
  E.tapFreeCell(session, { kind: "cell", i: 0 });
  assert.equal(session.cells[0].rank, "9");
  assert.equal(session.tableau[0].length, 1);
  assert.equal(session.lastEvent.kind, "illegal");
});

test("supermove blocked when no helpers", () => {
  const session = E.createFreeCellSession(def, seedRng(5));
  session.tableau = emptyCols(8);
  session.tableau[0] = [face("10", "♥"), face("9", "♠")];
  session.tableau[1] = [face("J", "♠")];
  for (let i = 2; i < 8; i++) {
    session.tableau[i] = [face("A", "♣")];
  }
  session.cells = [face("2", "♥"), face("3", "♥"), face("4", "♥"), face("5", "♥")];
  session.selected = null;
  assert.equal(E.freeCellMaxMove(session, 1), 1);
  E.tapFreeCell(session, { kind: "tableau", col: 0, index: 0 });
  E.tapFreeCell(session, { kind: "tableau", col: 1 });
  assert.equal(session.tableau[0].length, 2);
  assert.equal(session.tableau[1].length, 1);
  assert.equal(session.lastEvent.kind, "illegal");
});

test("foundation A then 2", () => {
  const session = E.createFreeCellSession(def, seedRng(6));
  session.tableau = emptyCols(8);
  session.tableau[0] = [face("A", "♥")];
  session.tableau[1] = [face("2", "♥")];
  session.cells = [null, null, null, null];
  session.foundations = { "♠": 0, "♥": 0, "♦": 0, "♣": 0 };
  session.foundationTops = { "♠": null, "♥": null, "♦": null, "♣": null };
  session.score = 0;
  E.tapFreeCell(session, { kind: "tableau", col: 0 });
  E.tapFreeCell(session, { kind: "foundation", suit: "♥" });
  assert.equal(session.foundations["♥"], 1);
  assert.equal(session.score, 10);
  E.tapFreeCell(session, { kind: "tableau", col: 1 });
  E.tapFreeCell(session, { kind: "foundation", suit: "♥" });
  assert.equal(session.foundations["♥"], 2);
  assert.equal(session.score, 20);
});
