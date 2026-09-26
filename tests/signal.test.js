"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/match.js");
const def = require("../games/signal.json");

function sessionOn(levels, grid) {
  const session = E.createSignalSession({
    type: "signal",
    cols: 5,
    rows: 4,
    colors: 5,
    gemScore: 10,
    crateScore: 5,
    moveBonus: 20,
    levels: levels,
  }, function () { return 0.2; });
  session.grid = grid.slice();
  session.power = new Array(grid.length).fill(0);
  session.selected = null;
  return session;
}

const line = [
  1, 1, 1, 2, 4,
  5, 3, 4, 1, 5,
  3, 4, 5, 2, 2,
  4, 5, 2, 3, 3,
];

test("Signal JSON is a four-log glyph mystery", () => {
  assert.equal(def.id, "signal");
  assert.equal(def.type, "signal");
  assert.equal(def.levels.length, 4);
  assert.equal(def.levels[0].goals[0] > 0, true);
  assert.ok(!/candy crush|toon blast|toy blast/i.test(def.title + def.tagline + def.blurb));
});

test("Signal match of 3 counts toward the goal", () => {
  const session = sessionOn([{ moves: 5, goals: [3, 0, 0, 0, 0], crates: 0, brief: "A" }], line);
  session.goalsLeft = [3, 0, 0, 0, 0];
  session.movesLeft = 5;
  E.tapSignal(session, 3);
  E.tapSignal(session, 8);
  assert.equal(session.lastEvent.kind, "swap");
  assert.equal(session.outcome, "won");
  assert.equal(session.status, "done");
  assert.ok(session.score >= 30 + 4 * 20);
});

test("Signal non-match swap reverts", () => {
  const grid = [
    1, 2, 3, 4, 5,
    2, 3, 4, 5, 1,
    3, 4, 5, 1, 2,
    4, 5, 1, 2, 3,
  ];
  const session = sessionOn([{ moves: 5, goals: [9, 0, 0, 0, 0], crates: 0, brief: "A" }], grid);
  session.goalsLeft = [9, 0, 0, 0, 0];
  session.movesLeft = 5;
  E.tapSignal(session, 0);
  E.tapSignal(session, 1);
  assert.equal(session.lastEvent.kind, "illegal");
  assert.deepEqual(session.grid, grid);
  assert.equal(session.movesLeft, 5);
});

test("Signal line of 4 leaves a beam", () => {
  const session = sessionOn([{ moves: 6, goals: [20, 0, 0, 0, 0], crates: 0, brief: "A" }], line);
  session.goalsLeft = [20, 0, 0, 0, 0];
  session.movesLeft = 6;
  E.tapSignal(session, 3);
  E.tapSignal(session, 8);
  assert.equal(session.power.some(function (p) { return p === 1; }), true);
  assert.equal(session.status, "playing");
});

test("Signal beam swap clears its row", () => {
  const grid = [
    2, 1, 3, 4, 5,
    3, 4, 5, 1, 2,
    4, 5, 2, 3, 1,
    5, 2, 4, 1, 3,
  ];
  const session = sessionOn([{ moves: 4, goals: [20, 20, 20, 20, 20], crates: 0, brief: "A" }], grid);
  session.goalsLeft = [20, 20, 20, 20, 20];
  session.movesLeft = 4;
  session.power[1] = 1;
  E.tapSignal(session, 1);
  E.tapSignal(session, 0);
  assert.equal(session.lastEvent.kind, "swap");
  assert.equal(session.movesLeft, 3);
  assert.equal(session.grid[16], 2);
  assert.equal(session.grid[11], 5);
  assert.equal(session.power[0], 0);
});

test("Signal crate beside a clear breaks", () => {
  const grid = [
    1, 2, 1, 8, 5,
    4, 1, 3, 2, 4,
    5, 3, 2, 4, 5,
    2, 4, 5, 1, 3,
  ];
  const session = sessionOn([{ moves: 5, goals: [9, 0, 0, 0, 0], crates: 0, brief: "A" }], grid);
  session.goalsLeft = [9, 0, 0, 0, 0];
  session.movesLeft = 5;
  E.tapSignal(session, 1);
  E.tapSignal(session, 6);
  assert.equal(session.grid.indexOf(8), -1);
  assert.ok(session.score >= 30);
});

test("Signal goals open the next log", () => {
  const session = sessionOn([
    { moves: 5, goals: [3, 0, 0, 0, 0], crates: 0, brief: "First dish." },
    { moves: 8, goals: [1, 0, 0, 0, 0], crates: 0, brief: "Second dish." },
  ], line);
  session.goalsLeft = [3, 0, 0, 0, 0];
  session.movesLeft = 5;
  E.tapSignal(session, 3);
  E.tapSignal(session, 8);
  assert.equal(session.status, "playing");
  assert.equal(session.levelIndex, 1);
  assert.equal(session.brief, "Second dish.");
  assert.equal(session.movesLeft, 8);
});

test("Signal moves at 0 with goals left stalls", () => {
  const session = sessionOn([{ moves: 1, goals: [9, 0, 0, 0, 0], crates: 0, brief: "A" }], line);
  session.goalsLeft = [9, 0, 0, 0, 0];
  session.movesLeft = 1;
  E.tapSignal(session, 3);
  E.tapSignal(session, 8);
  assert.equal(session.status, "done");
  assert.equal(session.outcome, "stall");
  assert.equal(session.movesLeft, 0);
});
