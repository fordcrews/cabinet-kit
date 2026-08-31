"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/match.js");
const def = require("../games/chime.json");

test("Chime JSON id type title knobs", () => {
  assert.equal(def.id, "chime");
  assert.equal(def.type, "chime");
  assert.equal(def.title, "Chime");
  assert.equal(def.cols, 6);
  assert.equal(def.rows, 6);
  assert.equal(def.moves, 25);
  assert.ok(!/chuzzle|candy crush|toon blast/i.test(def.title + def.tagline + def.blurb));
});

test("Chime slide wraps a row so the selection lands on the dest cell", () => {
  const session = E.createChimeSession({ type: "chime", cols: 6, rows: 6, colors: 6, moves: 25 }, function () { return 0.3; });
  session.grid = [
    1, 2, 3, 4, 5, 6,
    2, 3, 4, 5, 6, 1,
    3, 4, 5, 6, 1, 2,
    4, 5, 6, 1, 2, 3,
    5, 6, 1, 2, 3, 4,
    6, 1, 2, 3, 4, 5,
  ];
  session.movesLeft = 25;
  E.tapChime(session, 0);
  E.tapChime(session, 2);
  assert.equal(session.grid[2], 1);
  assert.equal(session.grid[0], 5);
  assert.equal(session.grid[1], 6);
  assert.equal(session.grid[3], 2);
  assert.equal(session.movesLeft, 24);
});

test("Chime group of 2 stays", () => {
  const session = E.createChimeSession({ type: "chime", cols: 6, rows: 3, colors: 6, moves: 25, minGroup: 3, marbleScore: 10 }, function () { return 0.4; });
  session.grid = [
    1, 1, 2, 3, 4, 5,
    2, 4, 5, 6, 3, 2,
    6, 5, 4, 3, 2, 6,
  ];
  session.score = 0;
  session.movesLeft = 25;
  E.tapChime(session, 12);
  E.tapChime(session, 14);
  assert.equal(session.lastEvent.kind, "slide");
  assert.equal(session.lastEvent.size, 0);
  assert.equal(session.grid[0], 1);
  assert.equal(session.grid[1], 1);
  assert.equal(session.score, 0);
});

test("Chime group of 3 pops", () => {
  const session = E.createChimeSession({ type: "chime", cols: 6, rows: 4, colors: 6, moves: 25, minGroup: 3, marbleScore: 10 }, function () { return 0.9; });
  session.grid = [
    1, 1, 2, 3, 4, 1,
    2, 3, 4, 5, 6, 2,
    3, 4, 5, 6, 2, 3,
    4, 5, 6, 2, 3, 4,
  ];
  session.score = 0;
  session.movesLeft = 25;
  E.tapChime(session, 5);
  E.tapChime(session, 2);
  assert.equal(session.lastEvent.kind, "pop");
  assert.ok(session.lastEvent.size >= 3, "size " + session.lastEvent.size);
  assert.equal(session.lastEvent.points, session.lastEvent.size * 10);
  assert.ok(session.score >= 30);
  assert.equal(session.movesLeft, 24);
});

test("Chime snapshot and seedable rng", () => {
  const a = E.createChimeSession(def, 11);
  const b = E.createChimeSession(def, 11);
  assert.deepEqual(a.grid, b.grid);
  const snap = E.snapshotChime(a);
  assert.equal(snap.type, "chime");
  assert.equal(snap.grid.length, 36);
  assert.equal(snap.movesLeft, 25);
});
