"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/solitaire.js");
const def = require("../games/solitaire.json");
const freecellDef = require("../games/freecell.json");
const spiderDef = require("../games/spider.json");

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

function card(rank, suit) {
  return { rank: rank, suit: suit || "♠" };
}

test("draw 3 flips 3 when stock has 3+", () => {
  const session = E.createKlondikeSession(
    Object.assign({}, def, { drawCount: 3 }),
    seedRng(11)
  );
  session.stock = [card("2", "♣"), card("3", "♦"), card("4", "♥"), card("5", "♠")];
  session.waste = [];
  E.tapPatience(session, { kind: "stock" });
  assert.equal(session.waste.length, 3);
  assert.equal(session.stock.length, 1);
  assert.equal(session.waste[0].rank, "5");
  assert.equal(session.waste[1].rank, "4");
  assert.equal(session.waste[2].rank, "3");
  assert.equal(session.lastEvent.kind, "draw");
  assert.equal(session.lastEvent.count, 3);
});

test("draw 3 flips remaining when stock has fewer", () => {
  const session = E.createKlondikeSession(
    Object.assign({}, def, { drawCount: 3 }),
    seedRng(12)
  );
  session.stock = [card("9", "♣"), card("8", "♦")];
  session.waste = [];
  E.tapPatience(session, { kind: "stock" });
  assert.equal(session.waste.length, 2);
  assert.equal(session.stock.length, 0);
  assert.equal(session.lastEvent.count, 2);
});

test("recycle once then second recycle fails", () => {
  const session = E.createKlondikeSession(
    Object.assign({}, def, { recycle: "once" }),
    seedRng(13)
  );
  session.stock = [];
  session.waste = [card("A", "♠"), card("2", "♥")];
  session.recyclesUsed = 0;
  E.tapPatience(session, { kind: "stock" });
  assert.equal(session.lastEvent.kind, "recycle");
  assert.equal(session.recyclesUsed, 1);
  assert.equal(session.waste.length, 0);
  assert.equal(session.stock.length, 2);
  E.tapPatience(session, { kind: "stock" });
  E.tapPatience(session, { kind: "stock" });
  assert.equal(session.stock.length, 0);
  assert.equal(session.waste.length, 2);
  E.tapPatience(session, { kind: "stock" });
  assert.equal(session.lastEvent.kind, "illegal");
  assert.equal(session.lastEvent.reason, "recycle");
  assert.equal(session.waste.length, 2);
  assert.equal(session.stock.length, 0);
});

test("recycle never blocks", () => {
  const session = E.createKlondikeSession(
    Object.assign({}, def, { recycle: "never" }),
    seedRng(14)
  );
  session.stock = [];
  session.waste = [card("K", "♦")];
  E.tapPatience(session, { kind: "stock" });
  assert.equal(session.lastEvent.kind, "illegal");
  assert.equal(session.lastEvent.reason, "recycle");
  assert.equal(session.waste.length, 1);
  assert.equal(session.stock.length, 0);
});

test("undo restores prior tableau/score", () => {
  const session = E.createKlondikeSession(
    Object.assign({}, def, { undo: true }),
    seedRng(15)
  );
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
  session.score = 0;
  session.history = [];
  E.tapPatience(session, { kind: "tableau", col: 0 });
  E.tapPatience(session, { kind: "foundation", suit: "♥" });
  assert.equal(session.foundations["♥"], 1);
  assert.equal(session.score, 10);
  assert.equal(E.patienceCanUndo(session), true);
  E.undoPatience(session);
  assert.equal(session.foundations["♥"], 0);
  assert.equal(session.score, 0);
  assert.equal(session.tableau[0].length, 1);
  assert.equal(session.tableau[0][0].rank, "A");
  assert.equal(session.lastEvent.kind, "undo");
});

test("patienceAutoSafe: Ace and 2 always; mid-rank needs helpers", () => {
  assert.equal(E.patienceAutoSafe(card("A", "♥"), { "♠": 0, "♥": 0, "♦": 0, "♣": 0 }), true);
  assert.equal(E.patienceAutoSafe(card("2", "♠"), { "♠": 0, "♥": 0, "♦": 0, "♣": 0 }), true);
  assert.equal(E.patienceAutoSafe(card("3", "♥"), { "♠": 0, "♥": 0, "♦": 0, "♣": 0 }), false);
  assert.equal(E.patienceAutoSafe(card("3", "♥"), { "♠": 2, "♥": 0, "♦": 0, "♣": 2 }), true);
  assert.equal(E.patienceAutoSafe(card("3", "♥"), { "♠": 2, "♥": 0, "♦": 0, "♣": 1 }), false);
  assert.equal(E.patienceAutoSafe(card("5", "♠"), { "♠": 0, "♥": 4, "♦": 4, "♣": 0 }), true);
});

test("auto moves Ace to foundation when available", () => {
  const session = E.createKlondikeSession(
    Object.assign({}, def, { undo: true }),
    seedRng(16)
  );
  session.tableau = [
    [face("A", "♠", true)],
    [],
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
  session.score = 0;
  const n = E.autoPlayPatience(session);
  assert.ok(n >= 1);
  assert.equal(session.foundations["♠"], 1);
  assert.equal(session.tableau[0].length, 0);
  assert.equal(session.score, 10);
});

test("auto does not move unsafe mid-rank", () => {
  const session = E.createKlondikeSession(def, seedRng(17));
  session.tableau = [
    [face("5", "♥", true)],
    [],
    [],
    [],
    [],
    [],
    [],
  ];
  session.stock = [];
  session.waste = [];
  session.foundations = { "♠": 0, "♥": 4, "♦": 0, "♣": 0 };
  session.foundationTops = {
    "♠": null,
    "♥": { rank: "4", suit: "♥" },
    "♦": null,
    "♣": null,
  };
  session.score = 40;
  assert.equal(E.patienceAutoSafe(card("5", "♥"), session.foundations), false);
  const n = E.autoPlayPatience(session);
  assert.equal(n, 0);
  assert.equal(session.foundations["♥"], 4);
  assert.equal(session.tableau[0][0].rank, "5");
});

test("FreeCell undo restores cell", () => {
  const session = E.createFreeCellSession(
    Object.assign({}, freecellDef, { undo: true }),
    seedRng(18)
  );
  session.tableau = [[face("A", "♠")], [], [], [], [], [], [], []];
  session.cells = [null, null, null, null];
  session.history = [];
  E.tapPatience(session, { kind: "tableau", col: 0 });
  E.tapPatience(session, { kind: "cell", i: 0 });
  assert.equal(session.cells[0].rank, "A");
  E.undoPatience(session);
  assert.equal(session.cells[0], null);
  assert.equal(session.tableau[0][0].rank, "A");
});

test("Spider auto-completes K–A run without extra tap", () => {
  const DOWN = ["K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2", "A"];
  const session = E.createSpiderSession(
    Object.assign({}, spiderDef, { undo: true }),
    seedRng(19)
  );
  session.tableau = [[], [], [], [], [], [], [], [], [], []];
  session.tableau[0] = DOWN.map(function (r) {
    return face(r, "♠", true);
  });
  session.completed = 0;
  session.score = 0;
  session.stock = [];
  const n = E.autoPlayPatience(session);
  assert.ok(n >= 1);
  assert.equal(session.completed, 1);
  assert.equal(session.tableau[0].length, 0);
  assert.equal(session.score, 100);
});

test("user action + autoplay is one undo step", () => {
  const session = E.createKlondikeSession(
    Object.assign({}, def, { undo: true }),
    seedRng(20)
  );
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
  session.score = 0;
  session.history = [];
  E.tapPatience(session, { kind: "tableau", col: 0 });
  E.tapPatience(session, { kind: "foundation", suit: "♥" });
  E.autoPlayPatience(session);
  assert.equal(session.foundations["♥"], 2);
  assert.equal(session.history.length, 1);
  E.undoPatience(session);
  assert.equal(session.foundations["♥"], 0);
  assert.equal(session.tableau[0][0].rank, "A");
  assert.equal(session.tableau[1][0].rank, "2");
});
