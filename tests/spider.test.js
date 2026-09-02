"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/solitaire.js");
const def = require("../games/spider.json");

function seedRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function face(rank, suit, up) {
  return { rank: rank, suit: suit || "♠", faceUp: up !== false };
}

function emptyCols(n) {
  const cols = [];
  for (let i = 0; i < n; i++) cols.push([]);
  return cols;
}

const DOWN = ["K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2", "A"];

test("Spider JSON id type title", () => {
  assert.equal(def.id, "spider");
  assert.equal(def.type, "spider");
  assert.equal(def.title, "Spider");
});

test("104 cards, 10 columns, classic deal", () => {
  const session = E.createSpiderSession(def, seedRng(1));
  let n = 0;
  session.tableau.forEach(function (col) {
    n += col.length;
  });
  n += session.stock.length;
  n += session.completed * 13;
  assert.equal(n, 104);
  assert.equal(session.tableau.length, 10);
  session.tableau.forEach(function (col, i) {
    const expect = i < 4 ? 6 : 5;
    assert.equal(col.length, expect);
    assert.equal(col[col.length - 1].faceUp, true);
    for (let k = 0; k < col.length - 1; k++) {
      assert.equal(col[k].faceUp, false);
    }
  });
  assert.equal(session.stock.length, 50);
  const snap = E.snapshotSpider(session);
  assert.equal(snap.cardCount, 104);
  session.tableau.forEach(function (col) {
    col.forEach(function (c) {
      assert.equal(c.suit, "♠");
    });
  });
});

test("deal-row blocked if a column empty", () => {
  const session = E.createSpiderSession(def, seedRng(2));
  session.tableau[0] = [];
  const stockBefore = session.stock.length;
  assert.throws(function () {
    E.dealSpider(session);
  }, /empty column/);
  assert.equal(session.stock.length, stockBefore);
  E.tapSpider(session, { kind: "stock" });
  assert.equal(session.lastEvent.kind, "illegal");
  assert.equal(session.stock.length, stockBefore);
});

test("completing K–A removes 13", () => {
  const session = E.createSpiderSession(def, seedRng(3));
  session.tableau = emptyCols(10);
  const run = DOWN.slice(0, 12).map(function (r) {
    return face(r, "♠", true);
  });
  session.tableau[0] = run;
  session.tableau[1] = [face("A", "♠", true)];
  session.completed = 0;
  session.score = 0;
  session.stock = [];
  E.tapSpider(session, { kind: "tableau", col: 1 });
  E.tapSpider(session, { kind: "tableau", col: 0 });
  assert.equal(session.tableau[0].length, 0);
  assert.equal(session.tableau[1].length, 0);
  assert.equal(session.completed, 1);
  assert.equal(session.score, 100);
  assert.ok(session.lastEvent.kind === "complete" || session.lastEvent.kind === "win");
});

test("stack move of a descending run", () => {
  const session = E.createSpiderSession(def, seedRng(4));
  session.tableau = emptyCols(10);
  session.tableau[0] = [face("10", "♠", true), face("9", "♠", true), face("8", "♠", true)];
  session.tableau[1] = [face("J", "♠", true)];
  session.selected = null;
  E.tapSpider(session, { kind: "tableau", col: 0, index: 0 });
  E.tapSpider(session, { kind: "tableau", col: 1 });
  assert.equal(session.tableau[0].length, 0);
  assert.equal(session.tableau[1].length, 4);
  assert.equal(session.tableau[1][1].rank, "10");
  assert.equal(session.tableau[1][3].rank, "8");
});
