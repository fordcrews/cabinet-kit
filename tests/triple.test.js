"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/match.js");
const def = require("../games/triple.json");

test("Triple JSON id type title knobs", () => {
  assert.equal(def.id, "triple");
  assert.equal(def.type, "triple");
  assert.equal(def.title, "Triple");
  assert.equal(def.cols, 8);
  assert.equal(def.rows, 8);
  assert.equal(def.colors, 6);
  assert.equal(def.moves, 20);
  assert.ok(!/candy crush|toon|toy blast/i.test(def.title + def.tagline + def.blurb));
});

test("Triple adjacent swap making 3 clears", () => {
  const session = E.createTripleSession({ type: "triple", cols: 5, rows: 5, colors: 6, moves: 20, gemScore: 10 }, function () { return 0.99; });
  session.grid = [
    1, 2, 1, 1, 4,
    5, 3, 4, 2, 6,
    3, 4, 5, 6, 2,
    4, 5, 6, 2, 3,
    5, 6, 2, 3, 4,
  ];
  session.score = 0;
  session.movesLeft = 20;
  session.selected = null;
  E.tapTriple(session, 0);
  assert.equal(session.selected, 0);
  E.tapTriple(session, 1);
  assert.equal(session.lastEvent.kind, "swap");
  assert.ok(session.lastEvent.cleared >= 3);
  assert.ok(session.score >= 30);
  assert.equal(session.movesLeft, 19);
  assert.equal(session.selected, null);
});

test("Triple non-match swap reverts", () => {
  const session = E.createTripleSession({ type: "triple", cols: 4, rows: 4, colors: 6, moves: 20 }, function () { return 0.2; });
  const grid = [
    1, 2, 3, 4,
    5, 6, 1, 2,
    3, 4, 5, 6,
    1, 2, 3, 4,
  ];
  session.grid = grid.slice();
  session.movesLeft = 20;
  session.score = 0;
  E.tapTriple(session, 0);
  E.tapTriple(session, 1);
  assert.equal(session.lastEvent.kind, "illegal");
  assert.deepEqual(session.grid, grid);
  assert.equal(session.movesLeft, 20);
  assert.equal(session.score, 0);
});

test("Triple cascade scores extra", () => {
  let calls = 0;
  const rng = function () {
    calls += 1;
    return 0;
  };
  const session = E.createTripleSession({ type: "triple", cols: 5, rows: 5, colors: 6, moves: 20, gemScore: 10 }, rng);
  session.grid = [
    2, 3, 4, 5, 6,
    2, 3, 4, 5, 6,
    1, 1, 2, 1, 3,
    4, 5, 6, 2, 4,
    5, 6, 3, 4, 5,
  ];
  session.score = 0;
  session.movesLeft = 20;
  E.tapTriple(session, 12);
  E.tapTriple(session, 13);
  assert.equal(session.lastEvent.kind, "swap");
  assert.ok(session.lastEvent.combo >= 2, "combo " + session.lastEvent.combo);
  assert.ok(session.score > 30, "score " + session.score);
  assert.equal(session.movesLeft, 19);
});

test("Triple moves decrement only on success and done at 0", () => {
  const session = E.createTripleSession({ type: "triple", cols: 5, rows: 4, colors: 6, moves: 20, gemScore: 10 }, function () { return 0.8; });
  session.grid = [
    1, 2, 1, 1, 4,
    5, 3, 4, 2, 6,
    3, 4, 5, 6, 2,
    4, 5, 6, 2, 3,
  ];
  session.movesLeft = 1;
  E.tapTriple(session, 0);
  E.tapTriple(session, 1);
  assert.equal(session.movesLeft, 0);
  assert.equal(session.status, "done");
  const score = session.score;
  E.tapTriple(session, 2);
  assert.equal(session.status, "done");
  assert.equal(session.score, score);
});

test("Triple JSON session and seedable rng", () => {
  const a = E.createTripleSession(def, 7);
  const b = E.createTripleSession(def, 7);
  assert.deepEqual(a.grid, b.grid);
  const snap = E.snapshotTriple(a);
  assert.equal(snap.type, "triple");
  assert.equal(snap.grid.length, 64);
  assert.equal(snap.movesLeft, 20);
});
