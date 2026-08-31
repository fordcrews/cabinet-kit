"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/match.js");
const def = require("../games/blast.json");

test("Blast JSON id type title knobs", () => {
  assert.equal(def.id, "blast");
  assert.equal(def.type, "blast");
  assert.equal(def.title, "Blast");
  assert.equal(def.cols, 8);
  assert.equal(def.rows, 8);
  assert.equal(def.colors, 5);
  assert.equal(def.moves, 20);
  assert.equal(def.minGroup, 2);
  assert.equal(def.groupScore, "n*(n-1)");
  assert.ok(!/toy|toon|candy crush/i.test(def.title + def.tagline + def.blurb));
});

test("Blast group of 1 does not pop", () => {
  const session = E.createBlastSession({ type: "blast", cols: 4, rows: 4, colors: 5, moves: 20 });
  session.grid = [
    1, 2, 1, 2,
    2, 1, 2, 1,
    1, 2, 1, 2,
    2, 1, 2, 1,
  ];
  session.movesLeft = 20;
  session.score = 0;
  const before = session.grid.slice();
  E.tapBlast(session, 0);
  assert.equal(session.lastEvent.kind, "small");
  assert.deepEqual(session.grid, before);
  assert.equal(session.movesLeft, 20);
  assert.equal(session.score, 0);
  assert.equal(session.status, "playing");
});

test("Blast group of 2+ pops", () => {
  const session = E.createBlastSession({ type: "blast", cols: 3, rows: 3, colors: 5, moves: 20 }, function () { return 0.9; });
  session.grid = [
    1, 2, 3,
    1, 4, 5,
    6, 4, 5,
  ];
  session.score = 0;
  session.movesLeft = 20;
  E.tapBlast(session, 0);
  assert.equal(session.lastEvent.kind, "pop");
  assert.equal(session.lastEvent.size, 2);
  assert.equal(session.lastEvent.points, 2);
  assert.equal(session.score, 2);
  assert.equal(session.movesLeft, 19);
  assert.ok(session.grid.every(function (v) { return v >= 1; }));
});

test("Blast gravity drops remaining cubes down a column", () => {
  const fills = [0.0, 0.2, 0.4, 0.6];
  let n = 0;
  const rng = function () {
    const v = fills[n % fills.length];
    n += 1;
    return v;
  };
  const session = E.createBlastSession({ type: "blast", cols: 3, rows: 3, colors: 5, moves: 20 }, rng);
  session.grid = [
    1, 2, 3,
    1, 4, 5,
    2, 4, 5,
  ];
  E.tapBlast(session, 0);
  assert.equal(session.grid[6], 2);
  assert.ok(session.grid[0] >= 1);
  assert.ok(session.grid[3] >= 1);
  assert.equal(session.grid[1], 2);
  assert.equal(session.grid[4], 4);
  assert.equal(session.grid[7], 4);
});

test("Blast moves decrement and done at 0", () => {
  const session = E.createBlastSession({ type: "blast", cols: 3, rows: 3, colors: 5, moves: 20 }, function () { return 0.5; });
  session.grid = [
    1, 2, 3,
    1, 4, 5,
    2, 4, 5,
  ];
  session.movesLeft = 1;
  E.tapBlast(session, 0);
  assert.equal(session.movesLeft, 0);
  assert.equal(session.status, "done");
  const score = session.score;
  const grid = session.grid.slice();
  E.tapBlast(session, 1);
  assert.equal(session.status, "done");
  assert.equal(session.score, score);
  assert.deepEqual(session.grid, grid);
});

test("Blast snapshot and seedable rng", () => {
  const session = E.createBlastSession(def, 42);
  const snap = E.snapshotBlast(session);
  assert.equal(snap.type, "blast");
  assert.equal(snap.cols, 8);
  assert.equal(snap.rows, 8);
  assert.equal(snap.grid.length, 64);
  assert.equal(snap.movesLeft, 20);
  const again = E.createBlastSession(def, 42);
  assert.deepEqual(again.grid, session.grid);
});
